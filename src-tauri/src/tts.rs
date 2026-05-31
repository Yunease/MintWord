use std::io::Cursor;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

struct AudioPlayer {
    _stream: rodio::OutputStream,
    sink: rodio::Sink,
}

unsafe impl Send for AudioPlayer {}

static AUDIO_PLAYER: Mutex<Option<AudioPlayer>> = Mutex::new(None);
static TTS_GEN: AtomicU64 = AtomicU64::new(0);

pub fn speak_text_bg(text: String) {
    let gen = TTS_GEN.fetch_add(1, Ordering::Relaxed) + 1;
    std::thread::spawn(move || {
        if let Err(e) = do_windows_tts(&text, gen) {
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
}

#[cfg(windows)]
fn do_windows_tts(text: &str, gen: u64) -> Result<(), String> {
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    use windows::Storage::Streams::DataReader;

    if TTS_GEN.load(Ordering::Relaxed) != gen {
        return Ok(());
    }

    let synth = SpeechSynthesizer::new()
        .map_err(|e| format!("Failed to create synthesizer: {}", e))?;
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

#[cfg(not(windows))]
fn do_windows_tts(_text: &str, _gen: u64) -> Result<(), String> {
    Ok(())
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
