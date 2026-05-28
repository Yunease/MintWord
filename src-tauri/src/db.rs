use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        let db_path = app_dir.join("mintword.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;
        let db = Database { conn: Mutex::new(conn) };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS decks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                language_from TEXT DEFAULT 'en',
                language_to TEXT DEFAULT 'zh',
                card_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                deck_id TEXT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                phonetic TEXT DEFAULT '',
                example_sentence TEXT DEFAULT '',
                extra TEXT DEFAULT '{}',
                ease_factor REAL DEFAULT 2.5,
                interval INTEGER DEFAULT 0,
                repetitions INTEGER DEFAULT 0,
                next_review_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                notes TEXT DEFAULT '',
                mastered INTEGER DEFAULT 0,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS review_log (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL,
                quality INTEGER NOT NULL,
                interval_before INTEGER DEFAULT 0,
                interval_after INTEGER DEFAULT 0,
                ease_before REAL DEFAULT 2.5,
                ease_after REAL DEFAULT 2.5,
                reviewed_at TEXT NOT NULL,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );"
        ).map_err(|e| e.to_string())?;

        let schema_version: i32 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap_or(0);
        if schema_version < 1 {
            conn.execute_batch("ALTER TABLE cards ADD COLUMN notes TEXT DEFAULT ''")
                .ok();
            conn.execute_batch("ALTER TABLE cards ADD COLUMN mastered INTEGER DEFAULT 0")
                .ok();
            conn.execute_batch("PRAGMA user_version = 1").ok();
        }

        Ok(())
    }
}
