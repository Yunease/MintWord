use std::io::Cursor;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

#[cfg(target_os = "macos")]
use std::process::{Child, Command};
#[cfg(target_os = "macos")]
use std::time::Duration;

struct AudioPlayer {
    _stream: rodio::OutputStream,
    sink: rodio::Sink,
}

unsafe impl Send for AudioPlayer {}

static AUDIO_PLAYER: Mutex<Option<AudioPlayer>> = Mutex::new(None);
static TTS_GEN: AtomicU64 = AtomicU64::new(0);
#[cfg(target_os = "macos")]
static MACOS_SAY_CHILD: Mutex<Option<(u64, Child)>> = Mutex::new(None);

pub fn speak_text_bg(text: String, lang: String) {
    let gen = TTS_GEN.fetch_add(1, Ordering::Relaxed) + 1;
    std::thread::spawn(move || {
        if let Err(e) = do_system_tts(&text, &lang, gen) {
            log::error!("TTS synthesis error: {}", e);
        }
    });
}

pub fn speak_ai_bg(text: String, api_url: String, api_key: String, voice: String, model: String) {
    let gen = TTS_GEN.fetch_add(1, Ordering::Relaxed) + 1;
    tokio::spawn(async move {
        if let Err(e) = do_ai_tts(&text, &api_url, &api_key, &voice, &model, gen).await {
            log::error!("AI TTS error: {}", e);
        }
    });
}

pub fn stop_audio() {
    TTS_GEN.fetch_add(1, Ordering::Relaxed);
    let guard = AUDIO_PLAYER.lock().unwrap();
    if let Some(player) = guard.as_ref() {
        player.sink.stop();
    }

    #[cfg(target_os = "macos")]
    stop_macos_say();
}

#[cfg(target_os = "macos")]
fn select_macos_voice(lang: &str) -> Option<&'static str> {
    match lang {
        "zh" => Some("Tingting"),
        "zh-TW" => Some("Meijia"),
        "en" => Some("Samantha"),
        "ja" => Some("Kyoko"),
        "ko" => Some("Yuna"),
        "es" => Some("Mónica"),
        "yue" => Some("Sin-ji"),
        _ => None,
    }
}

#[cfg(windows)]
fn windows_language_tag(app_lang: &str) -> &str {
    match app_lang {
        "zh" => "zh-CN",
        "zh-TW" => "zh-TW",
        "en" => "en-US",
        "ja" => "ja-JP",
        "ko" => "ko-KR",
        "es" => "es-ES",
        "yue" => "zh-HK",
        _ => app_lang,
    }
}

#[cfg(windows)]
fn try_set_voice_for_language(
    synth: &windows::Media::SpeechSynthesis::SpeechSynthesizer,
    lang: &str,
) {
    let target = windows_language_tag(lang).to_lowercase();
    let voices = match windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices() {
        Ok(v) => v,
        Err(_) => return,
    };
    let count = match voices.Size() {
        Ok(n) => n,
        Err(_) => return,
    };
    for i in 0..count {
        let voice = match voices.GetAt(i) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let voice_lang = match voice.Language() {
            Ok(l) => l,
            Err(_) => continue,
        };
        let voice_lang_str = format!("{}", voice_lang).to_lowercase();
        if voice_lang_str == target || voice_lang_str.starts_with(&format!("{}-", target.split('-').next().unwrap_or(&target))) {
            let _ = synth.SetVoice(&voice);
            return;
        }
    }
}

#[cfg(windows)]
fn has_voice_for_language(tag: &str) -> bool {
    let voices = match windows::Media::SpeechSynthesis::SpeechSynthesizer::AllVoices() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let count = match voices.Size() {
        Ok(n) => n,
        Err(_) => return false,
    };
    let tag_lower = tag.to_lowercase();
    for i in 0..count {
        let voice = match voices.GetAt(i) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let lang = match voice.Language() {
            Ok(l) => l,
            Err(_) => continue,
        };
        let lang_str = format!("{}", lang).to_lowercase();
        if lang_str == tag_lower || lang_str.starts_with(&format!("{}-", tag_lower)) {
            return true;
        }
    }
    false
}

pub fn native_tts_voice_available(lang: &str) -> bool {
    #[cfg(windows)]
    {
        has_voice_for_language(lang)
    }
    #[cfg(not(windows))]
    {
        let _ = lang;
        false
    }
}

#[cfg(windows)]
fn do_system_tts(text: &str, lang: &str, gen: u64) -> Result<(), String> {
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    use windows::Storage::Streams::DataReader;

    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let synth = SpeechSynthesizer::new()
        .map_err(|e| format!("Failed to create synthesizer: {}", e))?;

    try_set_voice_for_language(&synth, lang);

    let stream = synth
        .SynthesizeTextToStreamAsync(&windows::core::HSTRING::from(text))
        .map_err(|e| format!("Synthesize failed: {}", e))?
        .get()
        .map_err(|e| format!("Async get failed: {}", e))?;

    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let input_stream = stream
        .GetInputStreamAt(0)
        .map_err(|e| format!("GetInputStream failed: {}", e))?;
    let reader = DataReader::CreateDataReader(&input_stream)
        .map_err(|e| format!("CreateDataReader failed: {}", e))?;

    let mut audio_data = Vec::new();
    let buffer = vec![0u8; 4096];
    loop {
        let loaded = reader
            .LoadAsync(buffer.len() as u32)
            .map_err(|e| format!("LoadAsync failed: {}", e))?
            .get()
            .map_err(|e| format!("Async get failed: {}", e))?;
        if loaded == 0 {
            break;
        }
        let mut chunk = vec![0u8; loaded as usize];
        reader
            .ReadBytes(&mut chunk)
            .map_err(|e| format!("ReadBytes failed: {}", e))?;
        audio_data.extend_from_slice(&chunk);
    }

    play_audio_with_gen(&audio_data, gen)
}

#[cfg(target_os = "macos")]
fn do_system_tts(text: &str, lang: &str, gen: u64) -> Result<(), String> {
    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let mut child_guard = MACOS_SAY_CHILD.lock().map_err(|e| e.to_string())?;
    stop_macos_say_locked(&mut child_guard);

    let mut cmd = Command::new("/usr/bin/say");
    if let Some(voice) = select_macos_voice(lang) {
        cmd.arg("-v").arg(voice);
    }
    let child = cmd
        .arg("--")
        .arg(text)
        .spawn()
        .map_err(|e| format!("Failed to start macOS say: {}", e))?;
    *child_guard = Some((gen, child));
    drop(child_guard);

    loop {
        std::thread::sleep(Duration::from_millis(50));
        let mut child_guard = MACOS_SAY_CHILD.lock().map_err(|e| e.to_string())?;
        let Some((active_gen, child)) = child_guard.as_mut() else {
            return Ok(());
        };

        if *active_gen != gen {
            return Ok(());
        }

        if TTS_GEN.load(Ordering::Relaxed) != gen {
            stop_macos_say_locked(&mut child_guard);
            return Ok(());
        }

        if child
            .try_wait()
            .map_err(|e| format!("Failed to wait for macOS say: {}", e))?
            .is_some()
        {
            *child_guard = None;
            return Ok(());
        }
    }
}

#[cfg(not(any(windows, target_os = "macos")))]
fn do_system_tts(_text: &str, _lang: &str, _gen: u64) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
fn stop_macos_say() {
    let Ok(mut child_guard) = MACOS_SAY_CHILD.lock() else {
        return;
    };
    stop_macos_say_locked(&mut child_guard);
}

#[cfg(target_os = "macos")]
fn stop_macos_say_locked(child_guard: &mut Option<(u64, Child)>) {
    if let Some((_, mut child)) = child_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

async fn do_ai_tts(
    text: &str,
    api_url: &str,
    api_key: &str,
    voice: &str,
    model: &str,
    gen: u64,
) -> Result<(), String> {
    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "input": text,
        "voice": voice,
    });

    let resp = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI TTS request failed: {}", e))?;

    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI TTS error {}: {}", status, body_text));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?.to_vec();
    play_audio_with_gen(&bytes, gen)
}

fn play_audio_with_gen(data: &[u8], gen: u64) -> Result<(), String> {
    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let cursor = Cursor::new(data.to_vec());
    let source = rodio::Decoder::new(cursor)
        .map_err(|e| format!("Audio decode failed: {}", e))?;

    let mut guard = AUDIO_PLAYER.lock().map_err(|e| e.to_string())?;

    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    if let Some(player) = guard.as_ref() {
        player.sink.stop();
    }

    let player = guard.get_or_insert_with(|| {
        let (stream, handle) =
            rodio::OutputStream::try_default().expect("Audio output failed");
        let sink = rodio::Sink::try_new(&handle).expect("Sink creation failed");
        AudioPlayer {
            _stream: stream,
            sink,
        }
    });

    player.sink.stop();
    player.sink.append(source);

    Ok(())
}
