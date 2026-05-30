use std::path::{Path, PathBuf};
use std::fs;
use serde::{Serialize, Deserialize};
use crate::ai::Question;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    pub id: String,
    pub title: String,
    pub content: String,
    pub source: String,
    pub created_at: String,
    pub questions: Option<Vec<Question>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArticleSummary {
    pub id: String,
    pub title: String,
    pub source: String,
    pub created_at: String,
    pub has_questions: bool,
}


pub fn get_library_dir(app_dir: &Path) -> PathBuf {
    app_dir.join("library")
}

fn ensure_library_dir(app_dir: &Path) -> Result<PathBuf, String> {
    let dir = get_library_dir(app_dir);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create library dir: {}", e))?;
    Ok(dir)
}

fn article_path(lib_dir: &Path, id: &str) -> PathBuf {
    lib_dir.join(format!("{}.json", id))
}

pub fn list_articles(app_dir: &Path) -> Result<Vec<ArticleSummary>, String> {
    let lib_dir = ensure_library_dir(app_dir)?;
    let mut articles = Vec::new();
    let entries = fs::read_dir(&lib_dir).map_err(|e| format!("Failed to read library: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(article) = serde_json::from_str::<Article>(&content) {
                articles.push(ArticleSummary {
                    id: article.id,
                    title: article.title,
                    source: article.source,
                    created_at: article.created_at,
                    has_questions: article.questions.as_ref().map_or(false, |q| !q.is_empty()),
                });
            }
        }
    }
    articles.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(articles)
}

pub fn get_article(app_dir: &Path, id: &str) -> Result<Article, String> {
    let lib_dir = ensure_library_dir(app_dir)?;
    let path = article_path(&lib_dir, id);
    let content = fs::read_to_string(&path).map_err(|e| format!("Article not found: {}", e))?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn create_article(app_dir: &Path, title: String, content: String, source: String) -> Result<Article, String> {
    let lib_dir = ensure_library_dir(app_dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let article = Article {
        id: id.clone(),
        title,
        content,
        source,
        created_at: now,
        questions: None,
    };
    let json = serde_json::to_string_pretty(&article).map_err(|e| e.to_string())?;
    fs::write(article_path(&lib_dir, &id), json).map_err(|e| e.to_string())?;
    Ok(article)
}

pub fn delete_article(app_dir: &Path, id: &str) -> Result<(), String> {
    let lib_dir = ensure_library_dir(app_dir)?;
    let path = article_path(&lib_dir, id);
    fs::remove_file(&path).map_err(|e| format!("Failed to delete article: {}", e))
}

pub fn import_txt(app_dir: &Path, file_path: &str) -> Result<Article, String> {
    let txt_path = Path::new(file_path);
    let content = fs::read_to_string(txt_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let title = txt_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    create_article(app_dir, title, content, "txt".to_string())
}

pub fn save_questions(app_dir: &Path, article_id: &str, questions: Vec<Question>) -> Result<(), String> {
    let lib_dir = ensure_library_dir(app_dir)?;
    let path = article_path(&lib_dir, article_id);
    let mut article: Article = {
        let content = fs::read_to_string(&path).map_err(|e| format!("Article not found: {}", e))?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    };
    article.questions = Some(questions);
    let json = serde_json::to_string_pretty(&article).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_questions(app_dir: &Path, article_id: &str) -> Result<Vec<Question>, String> {
    let article = get_article(app_dir, article_id)?;
    article.questions.ok_or_else(|| "No questions for this article".to_string())
}
