use tauri::State;
use crate::db::Database;
use crate::engine;
use crate::library;
use crate::ai;
use rand::Rng;
use sha2::{Digest, Sha256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language_from: String,
    pub language_to: String,
    pub card_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Card {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub phonetic: String,
    pub example_sentence: String,
    pub ease_factor: f64,
    pub interval: i32,
    pub repetitions: i32,
    pub next_review_at: String,
    pub created_at: String,
    pub updated_at: String,
    pub notes: String,
    pub mastered: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct StudyCard {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub phonetic: String,
    pub example_sentence: String,
    pub notes: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ReviewStats {
    pub total_cards: i32,
    pub due_today: i32,
    pub studied_today: i32,
    pub new_today: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct HeatmapDay {
    pub date: String,
    pub count: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SessionResult {
    pub card_id: String,
    pub front: String,
    pub back: String,
    pub rating: i32,
    pub mastered: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DeckProgress {
    pub total_count: i32,
    pub studied_count: i32,
    pub mastered_count: i32,
    pub due_count: i32,
}

#[tauri::command]
pub fn get_decks(db: State<Database>) -> Result<Vec<Deck>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, description, language_from, language_to, card_count, created_at, updated_at FROM decks ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;
    let decks = stmt.query_map([], |row| {
        Ok(Deck {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            language_from: row.get(3)?,
            language_to: row.get(4)?,
            card_count: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    Ok(decks)
}

#[tauri::command]
pub fn create_deck(db: State<Database>, name: String, description: String, language_from: String, language_to: String) -> Result<Deck, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "INSERT INTO decks (id, name, description, language_from, language_to, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, name, description, language_from, language_to, now, now],
    ).map_err(|e| e.to_string())?;
    Ok(Deck { id, name, description, language_from, language_to, card_count: 0, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn delete_deck(db: State<Database>, deck_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM decks WHERE id = ?1", rusqlite::params![deck_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_cards(db: State<Database>, deck_id: String) -> Result<Vec<Card>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, deck_id, front, back, phonetic, example_sentence, ease_factor, interval, repetitions, next_review_at, created_at, updated_at, notes, mastered FROM cards WHERE deck_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let cards = stmt.query_map(rusqlite::params![deck_id], |row| {
        Ok(Card {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            front: row.get(2)?,
            back: row.get(3)?,
            phonetic: row.get(4)?,
            example_sentence: row.get(5)?,
            ease_factor: row.get(6)?,
            interval: row.get(7)?,
            repetitions: row.get(8)?,
            next_review_at: row.get(9)?,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            notes: row.get(12)?,
            mastered: row.get::<_, i32>(13)? != 0,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    // Normalize escaped newlines for existing data imported by older versions
    let cards: Vec<Card> = cards.into_iter().map(|mut c| {
        c.back = crate::importer::normalize_newlines(&c.back);
        c.example_sentence = crate::importer::normalize_newlines(&c.example_sentence);
        c.front = crate::importer::normalize_newlines(&c.front);
        c
    }).collect();
    Ok(cards)
}

#[tauri::command]
pub fn add_card(db: State<Database>, deck_id: String, front: String, back: String, phonetic: String, example_sentence: String) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "INSERT INTO cards (id, deck_id, front, back, phonetic, example_sentence, next_review_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, deck_id, front, back, phonetic, example_sentence, now, now, now],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
        rusqlite::params![deck_id, now],
    ).map_err(|e| e.to_string())?;
    Ok(Card {
        id, deck_id, front, back, phonetic, example_sentence,
        ease_factor: 2.5, interval: 0, repetitions: 0,
        next_review_at: now.clone(), created_at: now.clone(), updated_at: now,
        notes: String::new(), mastered: false,
    })
}

#[tauri::command]
pub fn delete_card(db: State<Database>, card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let deck_id: String = conn.query_row(
        "SELECT deck_id FROM cards WHERE id = ?1",
        rusqlite::params![card_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cards WHERE id = ?1", rusqlite::params![card_id])
        .map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
        rusqlite::params![deck_id, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_study_cards(db: State<Database>, deck_id: String, limit: i32) -> Result<Vec<StudyCard>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let order_clause = if get_learning_mode(&conn) == "fsrs" {
        "ORDER BY next_review_at ASC"
    } else {
        "ORDER BY RANDOM()"
    };

    let sql = format!(
        "SELECT id, deck_id, front, back, phonetic, example_sentence, notes
         FROM cards
         WHERE deck_id = ?1 AND next_review_at <= ?2 AND mastered = 0
         {}
         LIMIT ?3",
        order_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let cards = stmt.query_map(rusqlite::params![deck_id, now, limit], |row| {
        Ok(StudyCard {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            front: row.get(2)?,
            back: row.get(3)?,
            phonetic: row.get(4)?,
            example_sentence: row.get(5)?,
            notes: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    // Normalize escaped newlines for existing data imported by older versions
    let cards: Vec<StudyCard> = cards.into_iter().map(|mut c| {
        c.back = crate::importer::normalize_newlines(&c.back);
        c.example_sentence = crate::importer::normalize_newlines(&c.example_sentence);
        c.front = crate::importer::normalize_newlines(&c.front);
        c
    }).collect();
    Ok(cards)
}

#[tauri::command]
pub fn get_study_cards_available(db: State<Database>, deck_id: String) -> Result<i32, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1 AND next_review_at <= ?2 AND mastered = 0",
        rusqlite::params![deck_id, now],
        |row| row.get(0),
    ).unwrap_or(0);
    Ok(count)
}

fn get_learning_mode(conn: &rusqlite::Connection) -> String {
    conn.query_row(
        "SELECT value FROM settings WHERE key = 'learning_mode'",
        [],
        |row| row.get(0),
    ).unwrap_or_else(|_| "sm2".to_string())
}

fn get_fsrs_setting(conn: &rusqlite::Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    ).ok()
}

fn get_fsrs_retention(conn: &rusqlite::Connection) -> Option<f64> {
    get_fsrs_setting(conn, "fsrs_retention")?.parse().ok()
}

fn get_fsrs_max_interval(conn: &rusqlite::Connection) -> Option<i32> {
    get_fsrs_setting(conn, "fsrs_max_interval")?.parse().ok()
}

fn get_fsrs_params_json(conn: &rusqlite::Connection) -> Option<String> {
    let v = get_fsrs_setting(conn, "fsrs_parameters")?;
    if v.is_empty() { None } else { Some(v) }
}

#[tauri::command]
pub fn submit_review_simple(db: State<Database>, card_id: String, rating: i32, mastered: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let now_str = now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if get_learning_mode(&conn) == "fsrs" {
        let (stability, difficulty, interval, repetitions, lapses, fsrs_state, next_review_at, last_review_at): (f64, f64, i32, i32, i32, i32, String, String) = conn.query_row(
            "SELECT COALESCE(stability,0), COALESCE(difficulty,0), interval, repetitions, COALESCE(lapses,0), COALESCE(fsrs_state,0), next_review_at, COALESCE(last_review_at,'') FROM cards WHERE id = ?1",
            rusqlite::params![card_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?)),
        ).map_err(|e| e.to_string())?;

        if mastered {
            conn.execute(
                "UPDATE cards SET mastered = 1, stability = 36500, interval = 36500, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now_str, card_id],
            ).map_err(|e| e.to_string())?;
            let review_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![review_id, card_id, 5, interval, 36500, stability, 36500, now_str],
            ).map_err(|e| e.to_string())?;
            return Ok(());
        }

        let retention = get_fsrs_retention(&conn);
        let max_interval = get_fsrs_max_interval(&conn);
        let custom_w = get_fsrs_params_json(&conn);
        let result = engine::fsrs_review(
            stability, difficulty, interval, repetitions, lapses, fsrs_state,
            &next_review_at, &last_review_at, rating,
            retention, max_interval, custom_w.as_deref(),
        )?;

        conn.execute(
            "UPDATE cards SET stability = ?1, difficulty = ?2, interval = ?3, repetitions = ?4, lapses = ?5, fsrs_state = ?6, next_review_at = ?7, last_review_at = ?8, updated_at = ?9 WHERE id = ?10",
            rusqlite::params![result.stability, result.difficulty, result.interval, result.repetitions, result.lapses, result.fsrs_state, result.next_review_at, result.last_review_at, now_str, card_id],
        ).map_err(|e| e.to_string())?;

        let review_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![review_id, card_id, rating, interval, result.interval, stability, result.stability, now_str],
        ).map_err(|e| e.to_string())?;

        return Ok(());
    }

    let (ease_factor, interval, repetitions): (f64, i32, i32) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        rusqlite::params![card_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    if mastered {
        conn.execute(
            "UPDATE cards SET mastered = 1, interval = 36500, repetitions = 999, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now_str, card_id],
        ).map_err(|e| e.to_string())?;
        let review_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![review_id, card_id, 5, interval, 36500, ease_factor, ease_factor, now_str],
        ).map_err(|e| e.to_string())?;
        return Ok(());
    }

    let result = engine::simple_rating(rating, repetitions, interval, ease_factor);

    let next_review = (chrono::Utc::now() + chrono::Duration::days(result.interval as i64))
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "UPDATE cards SET ease_factor = ?1, interval = ?2, repetitions = ?3, next_review_at = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![result.ease_factor, result.interval, result.repetitions, next_review, now_str, card_id],
    ).map_err(|e| e.to_string())?;

    let review_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![review_id, card_id, rating, interval, result.interval, ease_factor, result.ease_factor, now_str],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn master_card(db: State<Database>, card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if get_learning_mode(&conn) == "fsrs" {
        conn.execute(
            "UPDATE cards SET mastered = 1, stability = 36500, interval = 36500, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, card_id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE cards SET mastered = 1, interval = 36500, repetitions = 999, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, card_id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn unmaster_card(db: State<Database>, card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if get_learning_mode(&conn) == "fsrs" {
        conn.execute(
            "UPDATE cards SET mastered = 0, stability = 0, difficulty = 0, interval = 0, repetitions = 0, lapses = 0, fsrs_state = 0, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, card_id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE cards SET mastered = 0, interval = 0, repetitions = 0, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, card_id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn update_card_notes(db: State<Database>, card_id: String, notes: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE cards SET notes = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![notes, now, card_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_heatmap_data(db: State<Database>) -> Result<Vec<HeatmapDay>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let year_ago = (chrono::Utc::now() - chrono::Duration::days(365))
        .format("%Y-%m-%dT00:00:00.000Z")
        .to_string();
    let mut stmt = conn.prepare(
        "SELECT DATE(reviewed_at) as day, COUNT(DISTINCT card_id) as cnt
         FROM review_log
         WHERE reviewed_at >= ?1
         GROUP BY DATE(reviewed_at)
         ORDER BY day ASC"
    ).map_err(|e| e.to_string())?;
    let data = stmt.query_map(rusqlite::params![year_ago], |row| {
        Ok(HeatmapDay {
            date: row.get(0)?,
            count: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
pub fn export_session_csv(_db: State<Database>, _deck_id: String, results: Vec<SessionResult>, file_path: String) -> Result<(), String> {
    let mut wtr = csv::Writer::from_path(&file_path)
        .map_err(|e| format!("Failed to create CSV: {}", e))?;
    wtr.write_record(["card_id", "front", "back", "rating", "mastered"])
        .map_err(|e| e.to_string())?;
    for r in &results {
        let rating_s = r.rating.to_string();
        let mastered_s = if r.mastered { "1".to_string() } else { "0".to_string() };
        wtr.write_record([
            &r.card_id,
            &r.front,
            &r.back,
            &rating_s,
            &mastered_s,
        ]).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_deck_due_count(db: State<Database>) -> Result<Vec<(String, i32)>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut stmt = conn.prepare(
        "SELECT d.id, COUNT(c.id) as cnt
         FROM decks d
         LEFT JOIN cards c ON c.deck_id = d.id AND c.next_review_at <= ?1 AND c.mastered = 0
         GROUP BY d.id
         HAVING cnt > 0
         ORDER BY cnt DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![now], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_deck_progress(db: State<Database>, deck_id: String) -> Result<DeckProgress, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    let total_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1",
        rusqlite::params![deck_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let studied_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1 AND (interval > 0 OR stability > 0 OR mastered = 1)",
        rusqlite::params![deck_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let mastered_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1 AND mastered = 1",
        rusqlite::params![deck_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let due_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1 AND next_review_at <= ?2 AND mastered = 0",
        rusqlite::params![deck_id, now],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(DeckProgress { total_count, studied_count, mastered_count, due_count })
}

fn map_quality_to_simple(quality: i32) -> i32 {
    match quality {
        0 | 1 | 2 => 0,
        3 => 1,
        _ => 2,
    }
}

#[tauri::command]
pub fn submit_review(db: State<Database>, card_id: String, quality: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let now_str = now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if get_learning_mode(&conn) == "fsrs" {
        let (stability, difficulty, interval, repetitions, lapses, fsrs_state, next_review_at, last_review_at): (f64, f64, i32, i32, i32, i32, String, String) = conn.query_row(
            "SELECT COALESCE(stability,0), COALESCE(difficulty,0), interval, repetitions, COALESCE(lapses,0), COALESCE(fsrs_state,0), next_review_at, COALESCE(last_review_at,'') FROM cards WHERE id = ?1",
            rusqlite::params![card_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?)),
        ).map_err(|e| e.to_string())?;

        let simple = map_quality_to_simple(quality);
        let retention = get_fsrs_retention(&conn);
        let max_interval = get_fsrs_max_interval(&conn);
        let custom_w = get_fsrs_params_json(&conn);
        let result = engine::fsrs_review(
            stability, difficulty, interval, repetitions, lapses, fsrs_state,
            &next_review_at, &last_review_at, simple,
            retention, max_interval, custom_w.as_deref(),
        )?;

        conn.execute(
            "UPDATE cards SET stability = ?1, difficulty = ?2, interval = ?3, repetitions = ?4, lapses = ?5, fsrs_state = ?6, next_review_at = ?7, last_review_at = ?8, updated_at = ?9 WHERE id = ?10",
            rusqlite::params![result.stability, result.difficulty, result.interval, result.repetitions, result.lapses, result.fsrs_state, result.next_review_at, result.last_review_at, now_str, card_id],
        ).map_err(|e| e.to_string())?;

        let review_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![review_id, card_id, quality, interval, result.interval, stability, result.stability, now_str],
        ).map_err(|e| e.to_string())?;

        return Ok(());
    }

    let (ease_factor, interval, repetitions): (f64, i32, i32) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        rusqlite::params![card_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    let result = engine::sm2(quality, repetitions, interval, ease_factor);
    let review_id = uuid::Uuid::new_v4().to_string();

    let next_review = (chrono::Utc::now() + chrono::Duration::days(result.interval as i64))
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "UPDATE cards SET ease_factor = ?1, interval = ?2, repetitions = ?3, next_review_at = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![result.ease_factor, result.interval, result.repetitions, next_review, now_str, card_id],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![review_id, card_id, quality, interval, result.interval, ease_factor, result.ease_factor, now_str],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_stats(db: State<Database>) -> Result<ReviewStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let today_start = chrono::Utc::now().format("%Y-%m-%dT00:00:00.000Z").to_string();

    let total_cards: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards", [], |row| row.get(0)
    ).unwrap_or(0);

    let due_today: i32 = conn.query_row(
        "SELECT COUNT(*) FROM cards WHERE next_review_at <= ?1 AND mastered = 0 AND repetitions > 0",
        rusqlite::params![now], |row| row.get(0)
    ).unwrap_or(0);

    let studied_today: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT card_id) FROM review_log WHERE reviewed_at >= ?1",
        rusqlite::params![today_start], |row| row.get(0)
    ).unwrap_or(0);

    let new_today: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT card_id) FROM review_log WHERE reviewed_at >= ?1 AND card_id NOT IN (SELECT card_id FROM review_log WHERE reviewed_at < ?1)",
        rusqlite::params![today_start], |row| row.get(0)
    ).unwrap_or(0);

    Ok(ReviewStats { total_cards, due_today, studied_today, new_today })
}

#[tauri::command]
pub fn import_csv_file(
    db: State<Database>,
    deck_id: String,
    file_path: String,
) -> Result<crate::importer::ImportReport, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    crate::importer::import_file(&mut *conn, &deck_id, &file_path)
}

#[tauri::command]
pub fn bulk_add_cards(db: State<Database>, deck_id: String, text: String) -> Result<i32, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut count = 0;

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = if line.contains('\t') {
            line.splitn(2, '\t').collect()
        } else if line.contains(" - ") {
            line.splitn(2, " - ").collect()
        } else if line.contains(',') {
            line.splitn(2, ',').collect()
        } else {
            continue;
        };
        if parts.len() < 2 {
            continue;
        }
        let front = parts[0].trim();
        let back = parts[1].trim();
        if front.is_empty() {
            continue;
        }
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO cards (id, deck_id, front, back, next_review_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, deck_id, front, back, now, now, now],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }

    if count > 0 {
        conn.execute(
            "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
            rusqlite::params![deck_id, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(count)
}

#[tauri::command]
pub fn speak_text(text: String) -> Result<(), String> {
    crate::tts::speak_text_bg(text);
    Ok(())
}

#[tauri::command]
pub async fn speak_ai(text: String, api_url: String, api_key: String, voice: String, model: String) -> Result<(), String> {
    crate::tts::speak_ai_bg(text, api_url, api_key, voice, model);
    Ok(())
}

#[tauri::command]
pub fn stop_tts() -> Result<(), String> {
    crate::tts::stop_audio();
    Ok(())
}

#[tauri::command]
pub fn check_native_tts_voice(lang: String) -> bool {
    crate::tts::native_tts_voice_available(&lang)
}

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
pub fn clear_learning_progress(db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE cards SET ease_factor = 2.5, interval = 0, repetitions = 0, next_review_at = ?1, updated_at = ?1, mastered = 0, stability = 0, difficulty = 0, lapses = 0, fsrs_state = 0, last_review_at = ''",
        rusqlite::params![now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_review_logs(db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM review_log", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_settings(db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM settings", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_all_cache(db: State<Database>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE cards SET ease_factor = 2.5, interval = 0, repetitions = 0, next_review_at = ?1, updated_at = ?1, mastered = 0, stability = 0, difficulty = 0, lapses = 0, fsrs_state = 0, last_review_at = ''",
        rusqlite::params![now],
    ).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM review_log", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM settings", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// === Article Library Commands ===

#[tauri::command]
pub fn get_articles(db: State<Database>) -> Result<Vec<library::ArticleSummary>, String> {
    library::list_articles(&db.app_dir)
}

#[tauri::command]
pub fn get_article(db: State<Database>, id: String) -> Result<library::Article, String> {
    library::get_article(&db.app_dir, &id)
}

#[tauri::command]
pub fn create_article(db: State<Database>, title: String, content: String, source: String) -> Result<library::Article, String> {
    library::create_article(&db.app_dir, title, content, source)
}

#[tauri::command]
pub fn delete_article(db: State<Database>, id: String) -> Result<(), String> {
    library::delete_article(&db.app_dir, &id)
}

#[tauri::command]
pub fn import_article_txt(db: State<Database>, file_path: String) -> Result<library::Article, String> {
    library::import_txt(&db.app_dir, &file_path)
}

// === Composition Commands ===

#[tauri::command]
pub fn get_compositions(db: State<Database>) -> Result<Vec<library::CompositionSummary>, String> {
    library::list_compositions(&db.app_dir)
}

#[tauri::command]
pub fn get_composition(db: State<Database>, id: String) -> Result<library::Composition, String> {
    library::get_composition(&db.app_dir, &id)
}

#[tauri::command]
pub fn create_composition(db: State<Database>, title: String, content: String, source: String) -> Result<library::Composition, String> {
    library::create_composition(&db.app_dir, title, content, source)
}

#[tauri::command]
pub fn delete_composition(db: State<Database>, id: String) -> Result<(), String> {
    library::delete_composition(&db.app_dir, &id)
}

#[tauri::command]
pub fn import_composition_txt(db: State<Database>, file_path: String) -> Result<library::Composition, String> {
    library::import_composition_txt(&db.app_dir, &file_path)
}

#[tauri::command]
pub async fn review_composition_with_config(
    db: State<'_, Database>,
    composition_id: String,
    config: ai::ProviderConfig,
    prompt: Option<String>,
) -> Result<ai::CompositionReview, String> {
    let composition = library::get_composition(&db.app_dir, &composition_id)?;

    let system_prompt = match prompt {
        Some(p) if !p.is_empty() => p,
        _ => {
            let conn = db.conn.lock().map_err(|e| e.to_string())?;
            let result = conn.query_row(
                "SELECT value FROM settings WHERE key = 'composition_review_prompt'",
                [],
                |row| row.get::<_, String>(0),
            );
            match result {
                Ok(val) if !val.is_empty() => val,
                _ => ai::COMPOSITION_REVIEW_PROMPT.to_string(),
            }
        }
    };

    ai::review_composition(&config, &system_prompt, &composition.content).await
}

#[tauri::command]
pub fn save_composition_review(db: State<Database>, composition_id: String, review: ai::CompositionReview) -> Result<(), String> {
    library::save_composition_review(&db.app_dir, &composition_id, review)
}

#[tauri::command]
pub fn get_composition_review(db: State<Database>, composition_id: String) -> Result<ai::CompositionReview, String> {
    library::get_composition_review(&db.app_dir, &composition_id)
}

#[tauri::command]
pub fn get_composition_review_prompt(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = 'composition_review_prompt'",
        [],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(val) if !val.is_empty() => Ok(val),
        _ => Ok(ai::COMPOSITION_REVIEW_PROMPT.to_string()),
    }
}

#[tauri::command]
pub fn set_composition_review_prompt(db: State<Database>, prompt: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('composition_review_prompt', ?1)
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        rusqlite::params![prompt],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// === AI Commands ===

#[tauri::command]
pub async fn generate_questions(
    db: State<'_, Database>,
    article_id: String,
    api_url: String,
    api_key: String,
    model: String,
    prompt: Option<String>,
) -> Result<Vec<ai::Question>, String> {
    let article = library::get_article(&db.app_dir, &article_id)?;

    let prompt = match prompt {
        Some(p) if !p.is_empty() => p,
        _ => get_custom_prompt(&db)?,
    };

    let response = ai::chat_completion(&api_url, &api_key, &model, &prompt, &article.content).await?;
    ai::parse_questions(&response)
}

#[tauri::command]
pub fn save_questions(db: State<Database>, article_id: String, questions: Vec<ai::Question>) -> Result<(), String> {
    library::save_questions(&db.app_dir, &article_id, questions)
}

#[tauri::command]
pub fn get_article_questions(db: State<Database>, article_id: String) -> Result<Vec<ai::Question>, String> {
    library::get_questions(&db.app_dir, &article_id)
}

#[tauri::command]
pub async fn test_ai_api(
    api_url: String,
    api_key: String,
    model: String,
) -> Result<String, String> {
    let response = ai::chat_completion(
        &api_url,
        &api_key,
        &model,
        "You are a helpful assistant.",
        "Reply with just: OK",
    ).await?;

    if response.trim().to_uppercase().contains("OK") {
        Ok("连接成功".to_string())
    } else {
        Ok(format!("API 响应正常: {}", response.trim().chars().take(50).collect::<String>()))
    }
}

fn get_custom_prompt(db: &State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = 'ai_quiz_prompt'",
        [],
        |row| row.get::<_, String>(0),
    );
    match result {
        Ok(val) if !val.is_empty() => Ok(val),
        _ => Ok(ai::DEFAULT_PROMPT.to_string()),
    }
}

#[tauri::command]
pub fn get_ai_prompt(db: State<Database>) -> Result<String, String> {
    get_custom_prompt(&db)
}

#[tauri::command]
pub fn set_ai_prompt(db: State<Database>, prompt: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('ai_quiz_prompt', ?1)
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        rusqlite::params![prompt],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn generate_questions_with_config(
    db: State<'_, Database>,
    article_id: String,
    config: ai::ProviderConfig,
    prompt: Option<String>,
) -> Result<Vec<ai::Question>, String> {
    let article = library::get_article(&db.app_dir, &article_id)?;
    let prompt = match prompt {
        Some(p) if !p.is_empty() => p,
        _ => get_custom_prompt(&db)?,
    };
    let response = ai::chat_with_provider(&config, &prompt, &article.content).await?;
    ai::parse_questions(&response.content)
}

#[tauri::command]
pub async fn test_ai_config(config: ai::ProviderConfig) -> Result<String, String> {
    let response = ai::chat_with_provider(&config, "You are a helpful assistant.", "Reply with just: OK").await?;
    if response.content.to_uppercase().contains("OK") {
        Ok("连接成功".to_string())
    } else {
        Err(format!("Unexpected response: {}", response.content))
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DeviceCode {
    pub user_code: String,
    pub verification_url: String,
    pub device_auth_id: String,
    pub interval: u64,
}

const OPENAI_AUTH_BASE_URL: &str = "https://auth.openai.com";
const OPENAI_CODEX_CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_CODEX_REDIRECT_URI: &str = "http://localhost:1455/auth/callback";
const OPENAI_CODEX_DEVICE_CALLBACK_URL: &str = "https://auth.openai.com/deviceauth/callback";
const OPENAI_CODEX_ORIGINATOR: &str = "codex_cli_rs";
const OPENAI_CODEX_SCOPE: &str =
    "openid profile email offline_access api.connectors.read api.connectors.invoke";
const OPENAI_CODEX_UA: &str = concat!("codex_cli_rs/", env!("CARGO_PKG_VERSION"));

fn random_urlsafe(len: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

fn pkce_challenge_s256(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn parse_interval(value: &serde_json::Value) -> u64 {
    if let Some(n) = value.as_u64() {
        return n;
    }
    if let Some(s) = value.as_str() {
        return s.trim().parse::<u64>().unwrap_or(5);
    }
    5
}

#[tauri::command]
pub fn get_chatgpt_login_url() -> Result<String, String> {
    let state = random_urlsafe(32);
    let code_verifier = random_urlsafe(64);
    let code_challenge = pkce_challenge_s256(&code_verifier);
    let mut url = reqwest::Url::parse(&format!("{}/oauth/authorize", OPENAI_AUTH_BASE_URL))
        .map_err(|e| format!("Failed to build auth URL: {}", e))?;

    url.query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", OPENAI_CODEX_CLIENT_ID)
        .append_pair("redirect_uri", OPENAI_CODEX_REDIRECT_URI)
        .append_pair("scope", OPENAI_CODEX_SCOPE)
        .append_pair("code_challenge", &code_challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("id_token_add_organizations", "true")
        .append_pair("codex_cli_simplified_flow", "true")
        .append_pair("state", &state)
        .append_pair("originator", OPENAI_CODEX_ORIGINATOR);

    Ok(url.to_string())
}

#[tauri::command]
pub async fn request_device_code() -> Result<DeviceCode, String> {
    let client = reqwest::Client::new();
    let auth_base_url = format!("{}/api/accounts", OPENAI_AUTH_BASE_URL);
    
    let body = serde_json::json!({
        "client_id": OPENAI_CODEX_CLIENT_ID
    });
    
    let response = client
        .post(format!("{}/deviceauth/usercode", auth_base_url))
        .header("Content-Type", "application/json")
        .header("User-Agent", OPENAI_CODEX_UA)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to request device code: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        if status == reqwest::StatusCode::NOT_FOUND {
            return Err("Device code login is not enabled for this server. Please use URL login.".to_string());
        }
        return Err(format!("Device code request failed with status {}: {}", status, body_text));
    }
    
    let data: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse device code response: {}", e))?;
    
    let user_code = data["user_code"].as_str().or_else(|| data["usercode"].as_str())
        .ok_or("Missing user_code in response")?
        .to_string();
    let device_auth_id = data["device_auth_id"].as_str()
        .ok_or("Missing device_auth_id in response")?
        .to_string();
    let interval = parse_interval(&data["interval"]);
    
    Ok(DeviceCode {
        user_code,
        verification_url: format!("{}/codex/device", OPENAI_AUTH_BASE_URL),
        device_auth_id,
        interval,
    })
}

#[tauri::command]
pub async fn complete_device_code_login(device_code: DeviceCode) -> Result<String, String> {
    let client = reqwest::Client::new();
    let auth_base_url = format!("{}/api/accounts", OPENAI_AUTH_BASE_URL);
    let max_wait = std::time::Duration::from_secs(15 * 60);
    let start = std::time::Instant::now();
    
    loop {
        let body = serde_json::json!({
            "device_auth_id": device_code.device_auth_id,
            "user_code": device_code.user_code
        });
        
        let response = client
            .post(format!("{}/deviceauth/token", auth_base_url))
            .header("Content-Type", "application/json")
            .header("User-Agent", OPENAI_CODEX_UA)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to poll for token: {}", e))?;
        
        let status = response.status();
        
        if status.is_success() {
            let data: serde_json::Value = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse token response: {}", e))?;

            let authorization_code = data["authorization_code"]
                .as_str()
                .ok_or("Missing authorization_code in response")?
                .to_string();
            let code_verifier = data["code_verifier"]
                .as_str()
                .ok_or("Missing code_verifier in response")?
                .to_string();

            let token_response = client
                .post(format!("{}/oauth/token", OPENAI_AUTH_BASE_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", OPENAI_CODEX_UA)
                .form(&[
                    ("grant_type", "authorization_code"),
                    ("code", authorization_code.as_str()),
                    ("redirect_uri", OPENAI_CODEX_DEVICE_CALLBACK_URL),
                    ("client_id", OPENAI_CODEX_CLIENT_ID),
                    ("code_verifier", code_verifier.as_str()),
                ])
                .send()
                .await
                .map_err(|e| format!("Failed to exchange authorization code: {}", e))?;

            if !token_response.status().is_success() {
                let status = token_response.status();
                let body_text = token_response.text().await.unwrap_or_default();
                return Err(format!("Token exchange failed with status {}: {}", status, body_text));
            }

            let token_data: serde_json::Value = token_response
                .json()
                .await
                .map_err(|e| format!("Failed to parse exchanged token response: {}", e))?;

            let access_token = token_data["access_token"]
                .as_str()
                .ok_or("Missing access_token in exchanged token response")?
                .to_string();

            return Ok(access_token);
        }
        
        if status == reqwest::StatusCode::FORBIDDEN || status == reqwest::StatusCode::NOT_FOUND {
            if start.elapsed() >= max_wait {
                return Err("Device auth timed out after 15 minutes".to_string());
            }
            tokio::time::sleep(std::time::Duration::from_secs(device_code.interval)).await;
            continue;
        }

        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Device auth failed with status {}: {}", status, body_text));
    }
}
