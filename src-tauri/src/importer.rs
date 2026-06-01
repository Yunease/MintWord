use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

use chrono::Utc;
use regex::Regex;
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use tempfile::NamedTempFile;
use uuid::Uuid;
use zip::ZipArchive;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ImportFieldMapping {
    pub front: Vec<String>,
    pub back: Vec<String>,
    pub phonetic: Vec<String>,
    pub example_sentence: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ImportReport {
    pub imported_count: i32,
    pub total_notes: i32,
    pub skipped_count: i32,
    pub source_format: String,
    pub matched_fields: ImportFieldMapping,
    pub missing_fields: Vec<String>,
    pub used_fallback_mapping: bool,
}

#[derive(Clone, Debug, Default)]
struct ResolvedFieldMapping {
    front_idx: Option<usize>,
    back_idx: Option<usize>,
    phonetic_idx: Option<usize>,
    example_idx: Option<usize>,
    used_fallback_mapping: bool,
}

#[derive(Deserialize)]
struct AnkiModel {
    flds: Vec<AnkiModelField>,
}

#[derive(Deserialize)]
struct AnkiModelField {
    name: String,
}

/// Convert literal backslash-escaped newline sequences (\r\n, \n, \r) to real newlines.
/// Must process \r\n before \n and \r to avoid double replacement.
pub fn normalize_newlines(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '\\' && i + 1 < chars.len() {
            match chars[i + 1] {
                'r' if i + 2 < chars.len() && chars[i + 2] == 'n' => {
                    out.push('\n');
                    i += 3;
                    continue;
                }
                'n' | 'r' => {
                    out.push('\n');
                    i += 2;
                    continue;
                }
                _ => {}
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

pub fn import_file(conn: &mut Connection, deck_id: &str, file_path: &str) -> Result<ImportReport, String> {
    let extension = Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match extension.as_str() {
        "csv" => import_csv(conn, deck_id, file_path),
        "apkg" => import_apkg(conn, deck_id, file_path),
        _ => Err(format!("Unsupported import file type: .{}", extension)),
    }
}

pub fn import_csv(conn: &mut Connection, deck_id: &str, file_path: &str) -> Result<ImportReport, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_path(file_path)
        .map_err(|e| format!("Failed to open CSV: {}", e))?;

    let headers = reader
        .headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?
        .iter()
        .map(|h| h.to_string())
        .collect::<Vec<_>>();

    let mapping = resolve_field_mapping(&headers)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut count = 0;

    for result in reader.records() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        let values = record.iter().map(|v| v.to_string()).collect::<Vec<_>>();
        if insert_record_from_values(&tx, deck_id, &now, &mapping, &values)? {
            count += 1;
        }
    }

    finalize_import(&tx, deck_id, &now, count)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(build_import_report("csv", count, &headers, &mapping))
}

pub fn import_bundled_csv(conn: &mut Connection, csv_data: &str, deck_id: &str) -> Result<i32, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(csv_data.as_bytes());

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut count = 0;

    for result in reader.records() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        let front = record.get(0).unwrap_or("").trim().to_string();
        if front.is_empty() {
            continue;
        }
        let phonetic = normalize_newlines(record.get(1).unwrap_or("")).trim().to_string();
        let back = normalize_newlines(record.get(2).unwrap_or("")).trim().to_string();

        insert_card(&tx, deck_id, &now, &front, &back, &phonetic, "")?;
        count += 1;
    }

    finalize_import(&tx, deck_id, &now, count)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

fn import_apkg(conn: &mut Connection, deck_id: &str, file_path: &str) -> Result<ImportReport, String> {
    let file = File::open(file_path).map_err(|e| format!("Failed to open APKG: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read APKG: {}", e))?;
    let collection_name = find_collection_entry(&mut archive)
        .ok_or_else(|| "APKG does not contain collection.anki2 or collection.anki21".to_string())?;

    let mut temp_file = NamedTempFile::new().map_err(|e| format!("Failed to create temp DB: {}", e))?;
    {
        let mut collection = archive
            .by_name(&collection_name)
            .map_err(|e| format!("Failed to read collection from APKG: {}", e))?;
        let mut buf = Vec::new();
        collection
            .read_to_end(&mut buf)
            .map_err(|e| format!("Failed to extract collection DB: {}", e))?;
        temp_file
            .write_all(&buf)
            .map_err(|e| format!("Failed to write temp collection DB: {}", e))?;
        temp_file
            .flush()
            .map_err(|e| format!("Failed to flush temp collection DB: {}", e))?;
    }

    let anki_conn = Connection::open_with_flags(
        temp_file.path(),
        OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(|e| format!("Failed to open collection DB: {}", e))?;

    let model_map = load_anki_models(&anki_conn)?;
    let mut stmt = anki_conn
        .prepare("SELECT mid, flds FROM notes")
        .map_err(|e| format!("Failed to read Anki notes: {}", e))?;
    let mut rows = stmt.query([]).map_err(|e| format!("Failed to query Anki notes: {}", e))?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut count = 0;
    let mut skipped_count = 0;
    let mut matched_front = HashSet::new();
    let mut matched_back = HashSet::new();
    let mut matched_phonetic = HashSet::new();
    let mut matched_example = HashSet::new();
    let mut missing_fields = HashSet::new();
    let mut used_fallback_mapping = false;

    while let Some(row) = rows.next().map_err(|e| format!("Failed to iterate Anki notes: {}", e))? {
        let mid: i64 = row.get(0).map_err(|e| format!("Failed to read Anki note model: {}", e))?;
        let flds: String = row.get(1).map_err(|e| format!("Failed to read Anki note fields: {}", e))?;
        let field_names = model_map
            .get(&mid)
            .cloned()
            .unwrap_or_else(|| (0..split_anki_fields(&flds).len()).map(|idx| format!("field{}", idx + 1)).collect());
        let mapping = resolve_field_mapping(&field_names)?;
        let values = split_anki_fields(&flds)
            .into_iter()
            .map(|value| clean_import_text(&value))
            .collect::<Vec<_>>();

        let inserted = insert_record_from_values(&tx, deck_id, &now, &mapping, &values)?;
        if inserted {
            count += 1;
        } else {
            skipped_count += 1;
        }

        collect_mapping_names(&mut matched_front, &field_names, mapping.front_idx);
        collect_mapping_names(&mut matched_back, &field_names, mapping.back_idx);
        collect_mapping_names(&mut matched_phonetic, &field_names, mapping.phonetic_idx);
        collect_mapping_names(&mut matched_example, &field_names, mapping.example_idx);
        if mapping.phonetic_idx.is_none() {
            missing_fields.insert("phonetic".to_string());
        }
        if mapping.example_idx.is_none() {
            missing_fields.insert("example_sentence".to_string());
        }
        used_fallback_mapping |= mapping.used_fallback_mapping;
    }

    finalize_import(&tx, deck_id, &now, count)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(ImportReport {
        imported_count: count,
        total_notes: count + skipped_count,
        skipped_count,
        source_format: "apkg".to_string(),
        matched_fields: ImportFieldMapping {
            front: sorted_strings(matched_front),
            back: sorted_strings(matched_back),
            phonetic: sorted_strings(matched_phonetic),
            example_sentence: sorted_strings(matched_example),
        },
        missing_fields: sorted_strings(missing_fields),
        used_fallback_mapping,
    })
}

fn finalize_import(tx: &rusqlite::Transaction<'_>, deck_id: &str, now: &str, count: i32) -> Result<(), String> {
    if count > 0 {
        tx.execute(
            "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
            rusqlite::params![deck_id, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn insert_record_from_values(
    tx: &rusqlite::Transaction<'_>,
    deck_id: &str,
    now: &str,
    mapping: &ResolvedFieldMapping,
    values: &[String],
) -> Result<bool, String> {
    let front = extract_mapped_value(values, mapping.front_idx);
    if front.is_empty() {
        return Ok(false);
    }

    let back = extract_mapped_value(values, mapping.back_idx);
    if back.is_empty() {
        return Ok(false);
    }

    let phonetic = extract_mapped_value(values, mapping.phonetic_idx);
    let example_sentence = extract_mapped_value(values, mapping.example_idx);
    insert_card(tx, deck_id, now, &front, &back, &phonetic, &example_sentence)?;
    Ok(true)
}

fn insert_card(
    tx: &rusqlite::Transaction<'_>,
    deck_id: &str,
    now: &str,
    front: &str,
    back: &str,
    phonetic: &str,
    example_sentence: &str,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO cards (id, deck_id, front, back, phonetic, example_sentence,
         ease_factor, interval, repetitions, stability, difficulty, lapses, fsrs_state,
         next_review_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 2.5, 0, 0, 0, 0, 0, 0, ?7, ?7, ?7)",
        rusqlite::params![id, deck_id, front, back, phonetic, example_sentence, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn resolve_field_mapping(field_names: &[String]) -> Result<ResolvedFieldMapping, String> {
    if field_names.is_empty() {
        return Err("Import file does not contain any columns".to_string());
    }

    let mut mapping = ResolvedFieldMapping {
        front_idx: find_named_field(field_names, &FRONT_FIELD_ALIASES),
        back_idx: find_named_field(field_names, &BACK_FIELD_ALIASES),
        phonetic_idx: find_named_field(field_names, &PHONETIC_FIELD_ALIASES),
        example_idx: find_named_field(field_names, &EXAMPLE_FIELD_ALIASES),
        used_fallback_mapping: false,
    };

    if mapping.front_idx.is_none() {
        mapping.front_idx = first_non_empty_index(field_names, &[]);
        mapping.used_fallback_mapping = true;
    }
    if mapping.back_idx.is_none() {
        let exclude = mapping.front_idx.into_iter().collect::<Vec<_>>();
        mapping.back_idx = first_non_empty_index(field_names, &exclude);
        mapping.used_fallback_mapping = true;
    }
    if mapping.phonetic_idx == mapping.front_idx || mapping.phonetic_idx == mapping.back_idx {
        mapping.phonetic_idx = None;
    }
    if mapping.example_idx == mapping.front_idx || mapping.example_idx == mapping.back_idx {
        mapping.example_idx = None;
    }
    if mapping.example_idx == mapping.phonetic_idx {
        mapping.example_idx = None;
    }

    if mapping.front_idx.is_none() || mapping.back_idx.is_none() {
        return Err("Import file must contain recognizable word/front and meaning/back fields".to_string());
    }

    Ok(mapping)
}

fn build_import_report(source_format: &str, imported_count: i32, headers: &[String], mapping: &ResolvedFieldMapping) -> ImportReport {
    let matched_fields = ImportFieldMapping {
        front: mapped_field_names(headers, mapping.front_idx),
        back: mapped_field_names(headers, mapping.back_idx),
        phonetic: mapped_field_names(headers, mapping.phonetic_idx),
        example_sentence: mapped_field_names(headers, mapping.example_idx),
    };
    let mut missing_fields = Vec::new();
    if mapping.phonetic_idx.is_none() {
        missing_fields.push("phonetic".to_string());
    }
    if mapping.example_idx.is_none() {
        missing_fields.push("example_sentence".to_string());
    }

    ImportReport {
        imported_count,
        total_notes: imported_count,
        skipped_count: 0,
        source_format: source_format.to_string(),
        matched_fields,
        missing_fields,
        used_fallback_mapping: mapping.used_fallback_mapping,
    }
}

fn mapped_field_names(field_names: &[String], index: Option<usize>) -> Vec<String> {
    index
        .and_then(|idx| field_names.get(idx))
        .map(|name| vec![name.clone()])
        .unwrap_or_default()
}

fn collect_mapping_names(target: &mut HashSet<String>, field_names: &[String], index: Option<usize>) {
    if let Some(idx) = index.and_then(|idx| field_names.get(idx)) {
        if !idx.trim().is_empty() {
            target.insert(idx.trim().to_string());
        }
    }
}

fn find_named_field(field_names: &[String], aliases: &[&str]) -> Option<usize> {
    field_names.iter().position(|field_name| {
        let normalized = normalize_field_name(field_name);
        aliases.iter().any(|alias| normalized == *alias)
    })
}

fn first_non_empty_index(field_names: &[String], exclude: &[usize]) -> Option<usize> {
    field_names
        .iter()
        .enumerate()
        .find(|(idx, name)| !exclude.contains(idx) && !name.trim().is_empty())
        .map(|(idx, _)| idx)
}

fn extract_mapped_value(values: &[String], index: Option<usize>) -> String {
    index
        .and_then(|idx| values.get(idx))
        .map(|value| clean_import_text(value))
        .unwrap_or_default()
}

fn clean_import_text(value: &str) -> String {
    let text = strip_anki_media_markers(value);
    let text = htmlish_text_to_plain_text(&text);
    normalize_newlines(&text)
        .lines()
        .map(str::trim)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn strip_anki_media_markers(value: &str) -> String {
    let sound_re = Regex::new(r"\[sound:[^\]]+\]").expect("valid sound regex");
    sound_re.replace_all(value, "").into_owned()
}

fn htmlish_text_to_plain_text(value: &str) -> String {
    let linebreak_re = Regex::new(r"(?i)<\s*br\s*/?\s*>|<\s*/div\s*>|<\s*/p\s*>|<\s*/li\s*>").expect("valid break regex");
    let open_block_re = Regex::new(r"(?i)<\s*(div|p|li|ul|ol)\b[^>]*>").expect("valid block regex");
    let tag_re = Regex::new(r"(?is)<[^>]+>").expect("valid html tag regex");

    let with_breaks = linebreak_re.replace_all(value, "\n");
    let with_open_breaks = open_block_re.replace_all(&with_breaks, "\n");
    let without_tags = tag_re.replace_all(&with_open_breaks, "");
    decode_html_entities(&without_tags)
}

fn decode_html_entities(value: &str) -> String {
    let mut decoded = value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");

    let numeric_re = Regex::new(r"&#(x?[0-9A-Fa-f]+);").expect("valid entity regex");
    decoded = numeric_re
        .replace_all(&decoded, |caps: &regex::Captures<'_>| {
            let raw = &caps[1];
            let code = if let Some(hex) = raw.strip_prefix('x').or_else(|| raw.strip_prefix('X')) {
                u32::from_str_radix(hex, 16).ok()
            } else {
                raw.parse::<u32>().ok()
            };
            code.and_then(char::from_u32)
                .map(|c| c.to_string())
                .unwrap_or_default()
        })
        .into_owned();
    decoded
}

fn split_anki_fields(flds: &str) -> Vec<String> {
    flds.split('\u{1f}').map(|part| part.to_string()).collect()
}

fn load_anki_models(conn: &Connection) -> Result<HashMap<i64, Vec<String>>, String> {
    let models_json: String = conn
        .query_row("SELECT models FROM col LIMIT 1", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read Anki models: {}", e))?;
    let model_map: HashMap<String, AnkiModel> =
        serde_json::from_str(&models_json).map_err(|e| format!("Failed to parse Anki models: {}", e))?;

    let mut result = HashMap::new();
    for (model_id, model) in model_map {
        if let Ok(mid) = model_id.parse::<i64>() {
            result.insert(mid, model.flds.into_iter().map(|field| field.name).collect());
        }
    }
    Ok(result)
}

fn find_collection_entry(archive: &mut ZipArchive<File>) -> Option<String> {
    for idx in 0..archive.len() {
        let file = archive.by_index(idx).ok()?;
        let name = file.name().to_string();
        if name.ends_with("collection.anki2") || name.ends_with("collection.anki21") {
            return Some(name);
        }
    }
    None
}

fn sorted_strings(set: HashSet<String>) -> Vec<String> {
    let mut values = set.into_iter().collect::<Vec<_>>();
    values.sort();
    values
}

fn normalize_field_name(field_name: &str) -> String {
    field_name
        .trim()
        .to_lowercase()
        .chars()
        .filter(|ch| ch.is_alphanumeric() || ('\u{4e00}'..='\u{9fff}').contains(ch))
        .collect()
}

const FRONT_FIELD_ALIASES: &[&str] = &[
    "word",
    "front",
    "term",
    "vocab",
    "vocabulary",
    "expression",
    "headword",
    "lemma",
    "source",
    "question",
    "english",
    "spelling",
    "单词",
    "单字",
    "词",
    "词汇",
    "词语",
    "原词",
    "原文",
    "英文",
    "英语",
    "正面",
    "题面",
];

const BACK_FIELD_ALIASES: &[&str] = &[
    "back",
    "translation",
    "meaning",
    "definition",
    "gloss",
    "answer",
    "target",
    "chinese",
    "cn",
    "释义",
    "解释",
    "意思",
    "含义",
    "翻译",
    "中文",
    "背面",
    "答案",
];

const PHONETIC_FIELD_ALIASES: &[&str] = &[
    "phonetic",
    "phonetics",
    "pronunciation",
    "pronounce",
    "pron",
    "ipa",
    "音标",
    "发音",
    "讀音",
    "读音",
    "英音",
    "美音",
    "uk",
    "us",
];

const EXAMPLE_FIELD_ALIASES: &[&str] = &[
    "example",
    "examples",
    "sentence",
    "usage",
    "sample",
    "例句",
    "句子",
    "用法",
    "示例",
];

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::fs::File;
    use std::io::Write;
    use zip::write::SimpleFileOptions;

    #[test]
    fn resolves_common_csv_aliases() {
        let mapping = resolve_field_mapping(&[
            "单词".to_string(),
            "音标".to_string(),
            "释义".to_string(),
            "例句".to_string(),
        ])
        .expect("mapping should resolve");
        assert_eq!(mapping.front_idx, Some(0));
        assert_eq!(mapping.phonetic_idx, Some(1));
        assert_eq!(mapping.back_idx, Some(2));
        assert_eq!(mapping.example_idx, Some(3));
        assert!(!mapping.used_fallback_mapping);
    }

    #[test]
    fn falls_back_to_first_two_columns_when_names_are_unknown() {
        let mapping = resolve_field_mapping(&[
            "Field A".to_string(),
            "Field B".to_string(),
            "Field C".to_string(),
        ])
        .expect("mapping should fallback");
        assert_eq!(mapping.front_idx, Some(0));
        assert_eq!(mapping.back_idx, Some(1));
        assert!(mapping.used_fallback_mapping);
    }

    #[test]
    fn cleans_html_and_newlines() {
        let cleaned = clean_import_text("hello<br>world<div>line&nbsp;2</div>[sound:test.mp3]");
        assert_eq!(cleaned, "hello\nworld\nline 2");
    }

    #[test]
    fn splits_anki_fields_by_unit_separator() {
        let fields = split_anki_fields("word\u{1f}meaning\u{1f}/test/");
        assert_eq!(fields, vec!["word", "meaning", "/test/"]);
    }

    #[test]
    fn imports_apkg_with_smart_field_mapping() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let collection_path = temp_dir.path().join("collection.anki2");
        let apkg_path = temp_dir.path().join("sample.apkg");

        {
            let collection_conn = Connection::open(&collection_path).expect("open temp collection");
            collection_conn
                .execute("CREATE TABLE col (models TEXT NOT NULL)", [])
                .expect("create col");
            collection_conn
                .execute("CREATE TABLE notes (mid INTEGER NOT NULL, flds TEXT NOT NULL)", [])
                .expect("create notes");
            collection_conn
                .execute(
                    "INSERT INTO col (models) VALUES (?1)",
                    [r#"{"1001":{"flds":[{"name":"Word"},{"name":"Meaning"},{"name":"IPA"}]}}"#],
                )
                .expect("insert models");
            collection_conn
                .execute(
                    "INSERT INTO notes (mid, flds) VALUES (?1, ?2)",
                    rusqlite::params![1001_i64, "warehouse\u{1f}n. 仓库<br>vt. 储存\u{1f}/ˈwerhaʊs/"],
                )
                .expect("insert note");
        }

        {
            let mut zip_file = File::create(&apkg_path).expect("create apkg");
            let mut zip = zip::ZipWriter::new(&mut zip_file);
            zip.start_file("collection.anki2", SimpleFileOptions::default())
                .expect("start collection entry");
            let bytes = std::fs::read(&collection_path).expect("read collection");
            zip.write_all(&bytes).expect("write collection");
            zip.finish().expect("finish zip");
        }

        let mut mint_conn = Connection::open_in_memory().expect("open mint db");
        mint_conn
            .execute(
                "CREATE TABLE decks (
                    id TEXT PRIMARY KEY,
                    updated_at TEXT NOT NULL,
                    card_count INTEGER NOT NULL DEFAULT 0
                )",
                [],
            )
            .expect("create decks");
        mint_conn
            .execute(
                "CREATE TABLE cards (
                    id TEXT PRIMARY KEY,
                    deck_id TEXT NOT NULL,
                    front TEXT NOT NULL,
                    back TEXT NOT NULL,
                    phonetic TEXT NOT NULL DEFAULT '',
                    example_sentence TEXT NOT NULL DEFAULT '',
                    ease_factor REAL DEFAULT 2.5,
                    interval INTEGER DEFAULT 0,
                    repetitions INTEGER DEFAULT 0,
                    stability REAL DEFAULT 0,
                    difficulty REAL DEFAULT 0,
                    lapses INTEGER DEFAULT 0,
                    fsrs_state INTEGER DEFAULT 0,
                    next_review_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )",
                [],
            )
            .expect("create cards");
        mint_conn
            .execute(
                "INSERT INTO decks (id, updated_at, card_count) VALUES ('deck-1', '2026-01-01T00:00:00.000Z', 0)",
                [],
            )
            .expect("insert deck");

        let report = import_file(
            &mut mint_conn,
            "deck-1",
            apkg_path.to_str().expect("apkg path"),
        )
        .expect("import apkg");

        assert_eq!(report.source_format, "apkg");
        assert_eq!(report.imported_count, 1);
        assert_eq!(report.matched_fields.front, vec!["Word"]);
        assert_eq!(report.matched_fields.back, vec!["Meaning"]);
        assert_eq!(report.matched_fields.phonetic, vec!["IPA"]);

        let row: (String, String, String) = mint_conn
            .query_row(
                "SELECT front, back, phonetic FROM cards WHERE deck_id = 'deck-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("read imported card");
        assert_eq!(row.0, "warehouse");
        assert_eq!(row.1, "n. 仓库\nvt. 储存");
        assert_eq!(row.2, "/ˈwerhaʊs/");
    }
}
