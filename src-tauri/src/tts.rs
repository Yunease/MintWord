use std::io::Cursor;

pub struct TtsEngine;

impl TtsEngine {
    pub fn new() -> Self {
        TtsEngine
    }

    #[cfg(windows)]
    pub fn speak(&self, text: &str) -> Result<(), String> {
        use windows::Media::SpeechSynthesis::SpeechSynthesizer;
        use windows::Storage::Streams::DataReader;

        let synth = SpeechSynthesizer::new().map_err(|e| format!("Failed to create synthesizer: {}", e))?;
        let stream = synth.SynthesizeTextToStreamAsync(&windows::core::HSTRING::from(text))
            .map_err(|e| format!("Synthesize failed: {}", e))?
            .get()
            .map_err(|e| format!("Async get failed: {}", e))?;

        let input_stream = stream.GetInputStreamAt(0).map_err(|e| format!("GetInputStream failed: {}", e))?;
        let reader = DataReader::CreateDataReader(&input_stream)
            .map_err(|e| format!("CreateDataReader failed: {}", e))?;

        let mut audio_data = Vec::new();
        let buffer = vec![0u8; 4096];
        loop {
            let loaded = reader.LoadAsync(buffer.len() as u32)
                .map_err(|e| format!("LoadAsync failed: {}", e))?
                .get()
                .map_err(|e| format!("Async get failed: {}", e))?;
            if loaded == 0 {
                break;
            }
            let mut chunk = vec![0u8; loaded as usize];
            reader.ReadBytes(&mut chunk).map_err(|e| format!("ReadBytes failed: {}", e))?;
            audio_data.extend_from_slice(&chunk);
        }

        play_audio(&audio_data)
    }

    #[cfg(not(windows))]
    pub fn speak(&self, _text: &str) -> Result<(), String> {
        Err("TTS not supported on this platform without AI TTS configuration".to_string())
    }
}

fn play_audio(data: &[u8]) -> Result<(), String> {
    let cursor = Cursor::new(data.to_vec());
    let (_stream, handle) = rodio::OutputStream::try_default()
        .map_err(|e| format!("Audio output failed: {}", e))?;
    let sink = rodio::Sink::try_new(&handle)
        .map_err(|e| format!("Sink creation failed: {}", e))?;
    sink.append(rodio::Decoder::new(cursor)
        .map_err(|e| format!("Audio decode failed: {}", e))?);
    sink.sleep_until_end();
    Ok(())
}

pub async fn ai_tts_speak(text: &str, api_url: &str, api_key: &str, voice: &str, model: &str) -> Result<(), String> {
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

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI TTS error {}: {}", status, body_text));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?.to_vec();
    play_audio(&bytes)
}
