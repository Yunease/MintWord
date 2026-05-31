use tauri::State;
use crate::db::Database;
use crate::engine;
use crate::library;
use crate::ai;

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
    let mut stmt = conn.prepare(
        "SELECT id, deck_id, front, back, phonetic, example_sentence, notes
         FROM cards
         WHERE deck_id = ?1 AND next_review_at <= ?2 AND mastered = 0
         ORDER BY RANDOM()
         LIMIT ?3"
    ).map_err(|e| e.to_string())?;
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

#[tauri::command]
pub fn submit_review_simple(db: State<Database>, card_id: String, rating: i32, mastered: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let (ease_factor, interval, repetitions): (f64, i32, i32) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        rusqlite::params![card_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    if mastered {
        conn.execute(
            "UPDATE cards SET mastered = 1, interval = 36500, repetitions = 999, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, card_id],
        ).map_err(|e| e.to_string())?;
        let review_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![review_id, card_id, 5, interval, 36500, ease_factor, ease_factor, now],
        ).map_err(|e| e.to_string())?;
        return Ok(());
    }

    let result = engine::simple_rating(rating, repetitions, interval, ease_factor);

    let next_review = (chrono::Utc::now() + chrono::Duration::days(result.interval as i64))
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "UPDATE cards SET ease_factor = ?1, interval = ?2, repetitions = ?3, next_review_at = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![result.ease_factor, result.interval, result.repetitions, next_review, now, card_id],
    ).map_err(|e| e.to_string())?;

    let review_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![review_id, card_id, rating, interval, result.interval, ease_factor, result.ease_factor, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn master_card(db: State<Database>, card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE cards SET mastered = 1, interval = 36500, repetitions = 999, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, card_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn unmaster_card(db: State<Database>, card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    conn.execute(
        "UPDATE cards SET mastered = 0, interval = 0, repetitions = 0, next_review_at = ?1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, card_id],
    ).map_err(|e| e.to_string())?;
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
        "SELECT COUNT(*) FROM cards WHERE deck_id = ?1 AND (interval > 0 OR mastered = 1)",
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

#[tauri::command]
pub fn submit_review(db: State<Database>, card_id: String, quality: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let (ease_factor, interval, repetitions): (f64, i32, i32) = conn.query_row(
        "SELECT ease_factor, interval, repetitions FROM cards WHERE id = ?1",
        rusqlite::params![card_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    let result = engine::sm2(quality, repetitions, interval, ease_factor);

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let review_id = uuid::Uuid::new_v4().to_string();

    let next_review = (chrono::Utc::now() + chrono::Duration::days(result.interval as i64))
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    conn.execute(
        "UPDATE cards SET ease_factor = ?1, interval = ?2, repetitions = ?3, next_review_at = ?4, updated_at = ?5 WHERE id = ?6",
        rusqlite::params![result.ease_factor, result.interval, result.repetitions, next_review, now, card_id],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO review_log (id, card_id, quality, interval_before, interval_after, ease_before, ease_after, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![review_id, card_id, quality, interval, result.interval, ease_factor, result.ease_factor, now],
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
pub fn import_csv_file(db: State<Database>, deck_id: String, file_path: String) -> Result<i32, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    crate::importer::import_csv(&mut *conn, &deck_id, &file_path)
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
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
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

// === AI Commands ===

#[tauri::command]
pub async fn generate_questions(
    db: State<'_, Database>,
    article_id: String,
    api_url: String,
    api_key: String,
    model: String,
) -> Result<Vec<ai::Question>, String> {
    let article = library::get_article(&db.app_dir, &article_id)?;

    let prompt = get_custom_prompt(&db)?;

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
