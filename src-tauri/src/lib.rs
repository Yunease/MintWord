mod commands;
mod db;
mod engine;
mod importer;
mod tts;
mod library;
mod ai;

use tauri::Manager;

fn import_bundled_decks(app_dir: &std::path::Path) -> Result<(), String> {
    let db = db::Database::new(app_dir.to_path_buf())?;
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;

    let already_imported: i32 = conn
        .query_row("SELECT COUNT(*) FROM decks WHERE id LIKE 'builtin-%'", [], |r| r.get(0))
        .unwrap_or(0);

    if already_imported > 0 {
        return Ok(());
    }

    let bundled = vec![
        ("CET4", include_str!("../../resources/bundled-decks/CET4.csv"), "en", "zh"),
        ("CET6", include_str!("../../resources/bundled-decks/CET6.csv"), "en", "zh"),
        ("考研", include_str!("../../resources/bundled-decks/考研.csv"), "en", "zh"),
        ("GRE", include_str!("../../resources/bundled-decks/GRE.csv"), "en", "zh"),
        ("TOEFL", include_str!("../../resources/bundled-decks/TOEFL.csv"), "en", "zh"),
        ("IELTS", include_str!("../../resources/bundled-decks/IELTS.csv"), "en", "zh"),
        ("高考", include_str!("../../resources/bundled-decks/高考.csv"), "en", "zh"),
        ("中考", include_str!("../../resources/bundled-decks/中考.csv"), "en", "zh"),
        ("JLPT-N5", include_str!("../../resources/bundled-decks/JLPT-N5.csv"), "ja", "zh"),
        ("JLPT-N4", include_str!("../../resources/bundled-decks/JLPT-N4.csv"), "ja", "zh"),
        ("JLPT-N3", include_str!("../../resources/bundled-decks/JLPT-N3.csv"), "ja", "zh"),
        ("JLPT-N2", include_str!("../../resources/bundled-decks/JLPT-N2.csv"), "ja", "zh"),
        ("JLPT-N1", include_str!("../../resources/bundled-decks/JLPT-N1.csv"), "ja", "zh"),
    ];

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

    for (name, csv_data, lang_from, lang_to) in &bundled {
        let id = format!("builtin-{}", name);
        conn.execute(
            "INSERT INTO decks (id, name, description, language_from, language_to, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, name, format!("内置词库 - {}", name), lang_from, lang_to, now, now],
        ).map_err(|e| e.to_string())?;

        importer::import_bundled_csv(&mut *conn, csv_data, &id)?;
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
            let database = db::Database::new(app_dir.clone())
                .expect("Failed to initialize database");
            app.manage(database);

            let import_dir = app_dir.clone();
            std::thread::spawn(move || {
                if let Err(e) = import_bundled_decks(&import_dir) {
                    log::error!("Failed to import bundled decks: {}", e);
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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
            commands::get_deck_progress,
            commands::master_card,
            commands::unmaster_card,
            commands::update_card_notes,
            commands::get_heatmap_data,
            commands::export_session_csv,
            commands::get_deck_due_count,
            commands::get_stats,
            commands::import_csv_file,
            commands::preview_import_file,
            commands::bulk_add_cards,
            commands::speak_text,
            commands::speak_ai,
            commands::stop_tts,
            commands::check_native_tts_voice,
            commands::get_platform,
            commands::get_setting,
            commands::set_setting,
            commands::get_articles,
            commands::get_article,
            commands::create_article,
            commands::delete_article,
            commands::import_article_txt,
            commands::get_compositions,
            commands::get_composition,
            commands::create_composition,
            commands::delete_composition,
            commands::import_composition_txt,
            commands::review_composition_with_config,
            commands::save_composition_review,
            commands::get_composition_review,
            commands::get_composition_review_prompt,
            commands::set_composition_review_prompt,
            commands::generate_questions,
            commands::save_questions,
            commands::get_article_questions,
            commands::test_ai_api,
            commands::get_ai_prompt,
            commands::set_ai_prompt,
            commands::generate_questions_with_config,
            commands::test_ai_config,
            commands::get_chatgpt_login_url,
            commands::request_device_code,
            commands::complete_device_code_login,
            commands::clear_learning_progress,
            commands::clear_review_logs,
            commands::clear_settings,
            commands::clear_all_cache,
            commands::save_avatar_file,
            commands::get_avatar_base64,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
