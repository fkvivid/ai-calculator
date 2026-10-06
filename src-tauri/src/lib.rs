use regex::Regex;
use serde::Deserialize;

const OLLAMA_URL: &str = "http://127.0.0.1:11434/api/generate";
const MODEL: &str = "llama3.2:1b";

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

#[tauri::command]
async fn ai_calculate(expression: String) -> Result<String, String> {
    let expression = expression.trim().to_string();
    if expression.is_empty() {
        return Err("Nothing to compute. Even AI needs an expression.".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Could not build HTTP client: {e}"))?;

    let prompt = format!(
        "You are a calculator. Evaluate the math expression exactly. \
         Reply with ONLY the numeric result and nothing else. \
         No words, no units, no explanation. Expression: {expression}"
    );

    eprintln!("[ai_calculate] expression: {expression}");
    eprintln!("[ai_calculate] prompt: {prompt}");

    let body = serde_json::json!({
        "model": MODEL,
        "prompt": prompt,
        "stream": false,
        "options": {
            "temperature": 0.0
        }
    });

    let http_response = client
        .post(OLLAMA_URL)
        .json(&body)
        .send()
        .await
        .map_err(|_| {
            "Ollama not running? Even AI needs coffee. Start Ollama and pull llama3.2:1b."
                .to_string()
        })?;

    if !http_response.status().is_success() {
        let status = http_response.status();
        let detail = http_response.text().await.unwrap_or_default();
        eprintln!("[ai_calculate] ollama error status={status} body={detail}");
        if status.as_u16() == 404 {
            return Err(
                "Model missing. Run: ollama pull llama3.2:1b — then try again.".into(),
            );
        }
        return Err(format!(
            "Ollama returned {status}. {detail}"
        ));
    }

    let parsed: OllamaResponse = http_response
        .json()
        .await
        .map_err(|e| format!("Ollama replied with gibberish JSON: {e}"))?;

    eprintln!("[ai_calculate] raw response: {:?}", parsed.response.trim());

    let result = extract_number(&parsed.response).ok_or_else(|| {
        format!(
            "AI mumbled something unusable: \"{}\"",
            parsed.response.trim()
        )
    })?;

    eprintln!("[ai_calculate] parsed number: {result}");
    Ok(result)
}

fn extract_number(text: &str) -> Option<String> {
    // Models often format large numbers with commas: "2,843,513"
    let cleaned: String = text
        .chars()
        .filter(|c| *c != ',' && *c != ' ')
        .collect();
    let re = Regex::new(r"-?\d+(?:\.\d+)?").ok()?;
    let caps = re.find(&cleaned)?;
    Some(caps.as_str().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![ai_calculate])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
