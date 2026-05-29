use rusqlite::Connection;
use uuid::Uuid;
use chrono::Utc;

pub fn import_csv(conn: &mut Connection, deck_id: &str, file_path: &str) -> Result<i32, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_path(file_path)
        .map_err(|e| format!("Failed to open CSV: {}", e))?;

    let headers: Vec<String> = reader.headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?
        .iter()
        .map(|h| h.to_lowercase())
        .collect();

    let word_idx = headers.iter().position(|h| h == "word");
    let front_idx = headers.iter().position(|h| h == "front");
    let phonetic_idx = headers.iter().position(|h| h == "phonetic");
    let translation_idx = headers.iter().position(|h| h == "translation");
    let back_idx = headers.iter().position(|h| h == "back");

    if word_idx.is_none() && front_idx.is_none() {
        return Err("CSV must have a 'word' or 'front' column".to_string());
    }
    if translation_idx.is_none() && back_idx.is_none() {
        return Err("CSV must have a 'translation' or 'back' column".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let mut count = 0;

    for result in reader.records() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;

        let front = record.get(word_idx.or(front_idx).unwrap()).unwrap_or("").trim().to_string();
        if front.is_empty() {
            continue;
        }

        let back = record.get(translation_idx.or(back_idx).unwrap()).unwrap_or("").trim().to_string();
        let phonetic = phonetic_idx
            .and_then(|i| record.get(i))
            .unwrap_or("")
            .trim()
            .to_string();

        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO cards (id, deck_id, front, back, phonetic, next_review_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, deck_id, front, back, phonetic, now, now, now],
        ).map_err(|e| e.to_string())?;

        count += 1;
    }

    tx.execute(
        "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
        rusqlite::params![deck_id, now],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
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
        let phonetic = record.get(1).unwrap_or("").trim().to_string();
        let back = record.get(2).unwrap_or("").trim().to_string();

        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO cards (id, deck_id, front, back, phonetic, next_review_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, deck_id, front, back, phonetic, now, now, now],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }

    tx.execute(
        "UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = ?1), updated_at = ?2 WHERE id = ?1",
        rusqlite::params![deck_id, now],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}
