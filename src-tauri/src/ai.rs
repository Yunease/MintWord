use regex::Regex;

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
