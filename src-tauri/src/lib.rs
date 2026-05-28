mod commands;
mod db;
mod engine;
mod importer;
mod tts;

use tauri::Manager;

fn import_bundled_decks(app: &tauri::App) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db = db::Database::new(app_dir)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let already_imported: i32 = conn
        .query_row("SELECT COUNT(*) FROM decks WHERE id LIKE 'builtin-%'", [], |r| r.get(0))
        .unwrap_or(0);

    if already_imported > 0 {
        return Ok(());
    }

    let bundled = vec![
        ("CET4", include_str!("../../resources/bundled-decks/CET4.csv")),
        ("CET6", include_str!("../../resources/bundled-decks/CET6.csv")),
        ("考研", include_str!("../../resources/bundled-decks/考研.csv")),
        ("GRE", include_str!("../../resources/bundled-decks/GRE.csv")),
        ("TOEFL", include_str!("../../resources/bundled-decks/TOEFL.csv")),
        ("IELTS", include_str!("../../resources/bundled-decks/IELTS.csv")),
        ("高考", include_str!("../../resources/bundled-decks/高考.csv")),
        ("中考", include_str!("../../resources/bundled-decks/中考.csv")),
    ];

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    for (name, csv_data) in &bundled {
        let id = format!("builtin-{}", name);
        conn.execute(
            "INSERT INTO decks (id, name, description, language_from, language_to, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, name, format!("内置词库 - {}", name), "en", "zh", now, now],
        ).map_err(|e| e.to_string())?;

        importer::import_bundled_csv(&conn, csv_data, &id)?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let database = db::Database::new(app_dir)
                .expect("Failed to initialize database");
            app.manage(database);

            if let Err(e) = import_bundled_decks(app) {
                log::error!("Failed to import bundled decks: {}", e);
            }

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_decks,
            commands::create_deck,
            commands::delete_deck,
            commands::get_cards,
            commands::add_card,
            commands::delete_card,
            commands::get_study_cards,
            commands::get_study_cards_available,
            commands::submit_review_simple,
            commands::submit_review,
            commands::master_card,
            commands::unmaster_card,
            commands::update_card_notes,
            commands::get_heatmap_data,
            commands::export_session_csv,
            commands::get_deck_due_count,
            commands::get_stats,
            commands::import_csv_file,
            commands::bulk_add_cards,
            commands::speak_text,
            commands::speak_ai,
            commands::get_setting,
            commands::set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
