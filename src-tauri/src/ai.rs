use regex::Regex;
use serde_json::json;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct Question {
    pub id: String,
    pub question: String,
    pub options: Vec<String>,
    pub answer: usize,
}

pub const DEFAULT_PROMPT: &str = include_str!("../../resources/default-prompt.txt");

pub async fn chat_completion(
    api_url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let base_url = api_url.trim_end_matches('/');
    let url = format!("{}/chat/completions", base_url);

    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
    });

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("AI API error {}: {}", status, body_text));
    }

    let result: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    let text = result["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "No content in AI response".to_string())?;

    Ok(text.to_string())
}

pub fn parse_questions(text: &str) -> Result<Vec<Question>, String> {
    // Pattern: number followed by question text, then A/B/C/D options, then answer
    let block_re = Regex::new(
        r"(?m)^\s*(\d+)[.、)]\s*(.+)$"
    ).map_err(|e| format!("Regex error: {}", e))?;

    let opt_re = Regex::new(
        r"(?m)^\s*([A-Da-d])[.、)]\s*(.+)$"
    ).map_err(|e| format!("Regex error: {}", e))?;

    let answer_re = Regex::new(
        r"(?m)^\s*(?:答案|Answer|answer)[:：]\s*([A-Da-d])"
    ).map_err(|e| format!("Regex error: {}", e))?;

    let lines: Vec<&str> = text.lines().collect();
    let mut questions = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();
        if line.is_empty() { i += 1; continue; }

        // Check if this line starts a new question (number + text)
        if let Some(cap) = block_re.captures(line) {
            let q_text = cap[2].trim().to_string();
            let mut options = Vec::new();
            let mut found_answer: Option<usize> = None;
            i += 1;

            // Collect the next few lines looking for options and answer
            while i < lines.len() {
                let l = lines[i].trim();
                if l.is_empty() { i += 1; continue; }

                // Check for answer line
                if let Some(a_cap) = answer_re.captures(l) {
                    let letter = a_cap[1].trim().to_uppercase();
                    found_answer = match letter.as_str() {
                        "A" => Some(0),
                        "B" => Some(1),
                        "C" => Some(2),
                        "D" => Some(3),
                        _ => None,
                    };
                    i += 1;
                    break;
                }

                // Check for option line
                if let Some(o_cap) = opt_re.captures(l) {
                    options.push(o_cap[2].trim().to_string());
                    i += 1;
                    continue;
                }

                // Check if this is the start of a new question block
                if block_re.is_match(l) {
                    break;
                }

                i += 1;
            }

            if q_text.is_empty() || options.len() < 4 {
                continue;
            }

            // Pad options if fewer than 4
            while options.len() < 4 {
                options.push(String::new());
            }

            questions.push(Question {
                id: uuid::Uuid::new_v4().to_string(),
                question: q_text,
                options: options.into_iter().take(4).collect(),
                answer: found_answer.unwrap_or(0),
            });
        } else {
            i += 1;
        }
    }

    if questions.is_empty() {
        return Err("无法从 AI 回复中解析出题目，请检查提示词格式或 API 返回内容。".to_string());
    }

    Ok(questions)
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApiMode {
    ChatCompletions,
    AnthropicMessages,
    OpenaiResponses,
    GeminiNative,
}

impl Default for ApiMode {
    fn default() -> Self {
        ApiMode::ChatCompletions
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub provider_id: String,
    pub url: String,
    pub api_key: String,
    pub model_id: String,
    #[serde(default)]
    pub api_mode: ApiMode,
    #[serde(default)]
    pub thinking_effort: Option<String>,
    #[serde(default)]
    pub thinking_pattern: Option<String>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub top_p: Option<f32>,
    #[serde(default)]
    pub top_k: Option<u32>,
    #[serde(default)]
    pub frequency_penalty: Option<f32>,
    #[serde(default)]
    pub presence_penalty: Option<f32>,
    #[serde(default)]
    pub repetition_penalty: Option<f32>,
    #[serde(default)]
    pub thinking_budget: Option<u32>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub reasoning: Option<String>,
}

impl ChatResponse {
    pub fn text(content: String) -> Self {
        Self { content, reasoning: None }
    }
}

pub async fn chat_with_provider(
    config: &ProviderConfig,
    system_prompt: &str,
    user_content: &str,
) -> Result<ChatResponse, String> {
    let client = reqwest::Client::new();

    let (url, headers, body) = match config.api_mode {
        ApiMode::ChatCompletions => build_chat_completions(config, system_prompt, user_content),
        ApiMode::AnthropicMessages => build_anthropic_messages(config, system_prompt, user_content),
        ApiMode::OpenaiResponses => build_openai_responses(config, system_prompt, user_content),
        ApiMode::GeminiNative => build_gemini_native(config, system_prompt, user_content),
    };

    let mut req = client.post(&url)
        .header("Content-Type", "application/json");

    for (k, v) in &headers {
        req = req.header(k, v);
    }

    let resp = req.json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }

    let resp_json: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    extract_response_content(&config.api_mode, &resp_json)
}

fn build_chat_completions(config: &ProviderConfig, system: &str, user: &str) -> (String, Vec<(String, String)>, serde_json::Value) {
    let url = format!("{}/chat/completions", config.url.trim_end_matches('/'));
    let headers = vec![
        ("Authorization".to_string(), format!("Bearer {}", config.api_key)),
    ];

    let mut body = json!({
        "model": config.model_id,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    });

    if let Some(mt) = config.max_tokens { body["max_tokens"] = json!(mt); }
    if let Some(t) = config.temperature { body["temperature"] = json!(t); }
    if let Some(tp) = config.top_p { body["top_p"] = json!(tp); }
    if let Some(tk) = config.top_k { body["top_k"] = json!(tk); }
    if let Some(fp) = config.frequency_penalty { body["frequency_penalty"] = json!(fp); }
    if let Some(pp) = config.presence_penalty { body["presence_penalty"] = json!(pp); }
    if let Some(rp) = config.repetition_penalty { body["repetition_penalty"] = json!(rp); }

    apply_thinking_chat(&mut body, config);

    (url, headers, body)
}

fn build_anthropic_messages(config: &ProviderConfig, system: &str, user: &str) -> (String, Vec<(String, String)>, serde_json::Value) {
    let url = format!("{}/messages", config.url.trim_end_matches('/'));
    let headers = vec![
        ("x-api-key".to_string(), config.api_key.clone()),
        ("anthropic-version".to_string(), "2023-06-01".to_string()),
    ];

    let mut body = json!({
        "model": config.model_id,
        "max_tokens": config.max_tokens.unwrap_or(4096),
        "system": system,
        "messages": [
            {"role": "user", "content": user}
        ]
    });

    if let Some(t) = config.temperature { body["temperature"] = json!(t); }
    if let Some(tp) = config.top_p { body["top_p"] = json!(tp); }
    if let Some(tk) = config.top_k { body["top_k"] = json!(tk); }

    apply_thinking_anthropic(&mut body, config);

    (url, headers, body)
}

fn build_openai_responses(config: &ProviderConfig, _system: &str, user: &str) -> (String, Vec<(String, String)>, serde_json::Value) {
    let url = format!("{}/responses", config.url.trim_end_matches('/'));
    let headers = vec![
        ("Authorization".to_string(), format!("Bearer {}", config.api_key)),
    ];

    let mut body = json!({
        "model": config.model_id,
        "input": user,
        "stream": false
    });

    if let Some(mt) = config.max_tokens { body["max_tokens"] = json!(mt); }

    if let Some(ref effort) = config.thinking_effort {
        if effort != "off" {
            body["reasoning"] = json!({"effort": effort, "summary": "auto"});
        }
    }

    (url, headers, body)
}

fn build_gemini_native(config: &ProviderConfig, system: &str, user: &str) -> (String, Vec<(String, String)>, serde_json::Value) {
    let url = format!(
        "{}/models/{}:generateContent?key={}",
        config.url.trim_end_matches('/'),
        config.model_id,
        config.api_key
    );
    let headers = vec![];

    let mut body = json!({
        "contents": [
            {"role": "user", "parts": [{"text": format!("{}\n\n{}", system, user)}]}
        ]
    });

    let mut gen_config = json!({});
    if let Some(mt) = config.max_tokens { gen_config["maxOutputTokens"] = json!(mt); }
    if let Some(t) = config.temperature { gen_config["temperature"] = json!(t); }
    if let Some(tp) = config.top_p { gen_config["topP"] = json!(tp); }
    if let Some(tk) = config.top_k { gen_config["topK"] = json!(tk); }

    apply_thinking_gemini(&mut gen_config, config);

    if gen_config != json!({}) {
        body["generationConfig"] = gen_config;
    }

    (url, headers, body)
}

fn apply_thinking_chat(body: &mut serde_json::Value, config: &ProviderConfig) {
    if let Some(ref effort) = config.thinking_effort {
        match config.provider_id.as_str() {
            "deepseek" | "kimi" | "kimi-coding" => {
                if effort == "off" {
                    body["thinking"] = json!({"type": "disabled"});
                } else {
                    body["thinking"] = json!({"type": "enabled"});
                    body["reasoning_effort"] = json!(effort);
                }
            }
            "zhipu" | "zhipu-coding" | "zai" | "zai-coding" => {
                if effort == "off" {
                    body["thinking"] = json!({"type": "disabled"});
                } else {
                    body["thinking"] = json!({"type": "enabled"});
                }
            }
            "alibaba-cn" | "alibaba-intl" => {
                body["enable_thinking"] = json!(effort != "off");
            }
            "siliconflow-cn" | "siliconflow-intl" => {
                body["enable_thinking"] = json!(effort != "off");
            }
            "stepfun" | "stepfun-intl" => {
                if effort != "off" {
                    body["reasoning_effort"] = json!(effort);
                }
            }
            "tencent" | "tencent-intl" => {}
            "minimax" | "minimax-coding" => {
                if effort != "off" {
                    body["reasoning_split"] = json!(true);
                }
            }
            _ => {
                if effort != "off" {
                    body["reasoning_effort"] = json!(effort);
                }
            }
        }
    }
}

fn apply_thinking_anthropic(body: &mut serde_json::Value, config: &ProviderConfig) {
    if let Some(ref effort) = config.thinking_effort {
        if effort == "off" {
            return;
        }
        if config.model_id.contains("4-7") || config.model_id.contains("4-8") {
            body["thinking"] = json!({
                "type": "adaptive"
            });
        } else {
            let budget = config.thinking_budget.unwrap_or(8000);
            body["thinking"] = json!({
                "type": "enabled",
                "budget_tokens": budget
            });
        }
    }
}

fn apply_thinking_gemini(gen_config: &mut serde_json::Value, config: &ProviderConfig) {
    if let Some(ref effort) = config.thinking_effort {
        if effort == "off" {
            gen_config["thinkingConfig"] = json!({"includeThoughts": false});
        } else {
            if config.model_id.contains("gemini-3") || config.model_id.contains("gemini-3.1") {
                gen_config["thinkingConfig"] = json!({
                    "includeThoughts": true,
                    "thinkingLevel": effort.to_uppercase()
                });
            } else {
                let budget = config.thinking_budget.unwrap_or(8192);
                gen_config["thinkingConfig"] = json!({
                    "includeThoughts": true,
                    "thinkingBudget": budget
                });
            }
        }
    }
}

fn extract_response_content(api_mode: &ApiMode, resp: &serde_json::Value) -> Result<ChatResponse, String> {
    match api_mode {
        ApiMode::ChatCompletions => {
            if let Some(choices) = resp.get("choices").and_then(|c| c.as_array()) {
                if let Some(first) = choices.first() {
                    if let Some(message) = first.get("message") {
                        let content = message.get("content")
                            .and_then(|c| c.as_str())
                            .unwrap_or("")
                            .to_string();
                        let reasoning = message.get("reasoning_content")
                            .and_then(|r| r.as_str())
                            .map(|s| s.to_string())
                            .or_else(|| message.get("reasoning").and_then(|r| r.as_str()).map(|s| s.to_string()));
                        if !content.is_empty() || reasoning.is_some() {
                            return Ok(ChatResponse { content, reasoning });
                        }
                    }
                }
            }
            Err(format!("Could not extract content from response: {}", serde_json::to_string(resp).unwrap_or_default()))
        }
        ApiMode::OpenaiResponses => {
            if let Some(output) = resp.get("output").and_then(|o| o.as_array()) {
                let mut text = String::new();
                let mut reasoning = String::new();
                for item in output {
                    let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    match item_type {
                        "message" => {
                            if let Some(content_arr) = item.get("content").and_then(|c| c.as_array()) {
                                for c in content_arr {
                                    if c.get("type").and_then(|t| t.as_str()) == Some("output_text") {
                                        if let Some(t) = c.get("text").and_then(|t| t.as_str()) {
                                            text.push_str(t);
                                        }
                                    }
                                }
                            }
                        }
                        "reasoning" => {
                            if let Some(summary_arr) = item.get("summary").and_then(|s| s.as_array()) {
                                for s in summary_arr {
                                    if let Some(t) = s.get("text").and_then(|t| t.as_str()) {
                                        reasoning.push_str(t);
                                        reasoning.push('\n');
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
                if !text.is_empty() || !reasoning.is_empty() {
                    return Ok(ChatResponse {
                        content: text,
                        reasoning: if reasoning.is_empty() { None } else { Some(reasoning) },
                    });
                }
            }
            Err(format!("Could not extract content from OpenAI responses: {}", serde_json::to_string(resp).unwrap_or_default()))
        }
        ApiMode::AnthropicMessages => {
            if let Some(content) = resp.get("content").and_then(|c| c.as_array()) {
                let mut text = String::new();
                let mut reasoning = String::new();
                for block in content {
                    let block_type = block.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    match block_type {
                        "text" => {
                            if let Some(t) = block.get("text").and_then(|t| t.as_str()) {
                                text.push_str(t);
                            }
                        }
                        "thinking" => {
                            if let Some(t) = block.get("thinking").and_then(|t| t.as_str()) {
                                reasoning.push_str(t);
                            }
                        }
                        _ => {}
                    }
                }
                if !text.is_empty() || !reasoning.is_empty() {
                    return Ok(ChatResponse {
                        content: text,
                        reasoning: if reasoning.is_empty() { None } else { Some(reasoning) },
                    });
                }
            }
            Err("Could not extract content from Anthropic response".to_string())
        }
        ApiMode::GeminiNative => {
            if let Some(candidates) = resp.get("candidates").and_then(|c| c.as_array()) {
                if let Some(first) = candidates.first() {
                    if let Some(parts) = first.get("content").and_then(|c| c.get("parts")).and_then(|p| p.as_array()) {
                        let mut text = String::new();
                        let mut reasoning = String::new();
                        for part in parts {
                            let is_thought = part.get("thought").and_then(|t| t.as_bool()).unwrap_or(false);
                            if let Some(t) = part.get("text").and_then(|t| t.as_str()) {
                                if is_thought {
                                    reasoning.push_str(t);
                                } else {
                                    text.push_str(t);
                                }
                            }
                        }
                        if !text.is_empty() || !reasoning.is_empty() {
                            return Ok(ChatResponse {
                                content: text,
                                reasoning: if reasoning.is_empty() { None } else { Some(reasoning) },
                            });
                        }
                    }
                }
            }
            Err("Could not extract content from Gemini response".to_string())
        }
    }
}
