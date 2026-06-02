# MintWord (薄荷词汇)

> [简体中文](../README.md) · [日本語](./README-ja.md) · [한국어](./README-ko.md)

A cross-platform vocabulary learning app built with **Tauri v2**, **React**, **TypeScript**, and **Rust**. Uses the **SM-2 spaced repetition algorithm** to help you memorize words efficiently.

## Features

- **Spaced Repetition** — SM-2 algorithm for optimal review scheduling
- **Built-in Decks** — 8 Chinese exam vocabulary decks (CET-4, CET-6, TOEFL, IELTS, GRE, 考研, 高考, 中考)
- **Custom Decks** — Create your own decks and add words manually or in bulk
- **CSV Import** — Import vocabulary from CSV files
- **Text-to-Speech** — Windows / macOS system TTS + configurable AI TTS (OpenAI-compatible API)
- **Study Statistics** — Review history, heatmap activity, and learning progress
- **Mastered Cards** — Mark cards as mastered to exclude them from reviews
- **Dictation Mode** — Randomly mix dictation into study sessions — hear the word then type it
- **AI Quiz Generation** — Automatically generate multiple-choice quizzes from your decks with configurable difficulty, question count, and options
- **AI Reading Comprehension** — Import articles and generate reading comprehension questions with AI
- **AI Provider Management** — Add custom AI providers (OpenAI-compatible), configure models and parameters
- **Library** — Manage learning articles with TXT import or manual paste
- **Quick Preview** — Quickly review words from the current study session
- **Notes** — Add personal notes to cards during study
- **Theming** — 4 color themes (Mint, Ocean, Warm, Lavender) + dark mode
- **i18n** — Simplified Chinese (简体中文), Traditional Chinese (繁體中文), and English interface
- **Keyboard Shortcuts** — Flip card, rate, mark mastered during study

## Built-in Decks

| Deck   | Description         |
| ------ | ------------------- |
| CET-4  | College English Band 4 |
| CET-6  | College English Band 6 |
| 考研   | Graduate Entrance Exam |
| GRE    | Graduate Record Exam |
| TOEFL  | Test of English as a Foreign Language |
| IELTS  | International English Language Testing System |
| 高考   | College Entrance Exam |
| 中考   | High School Entrance Exam |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | [Tauri v2](https://tauri.app/) |
| Frontend | React 19 + TypeScript + Vite |
| CSS | Tailwind CSS v4 |
| State Management | TanStack React Query |
| Routing | React Router DOM v7 |
| Backend | Rust |
| Database | SQLite (rusqlite) |
| Spaced Repetition | SM-2 (SuperMemo 2) |
| TTS (System) | Windows.Media.SpeechSynthesis / macOS `say` |
| TTS (AI) | OpenAI-compatible API via reqwest |
| Audio Playback | rodio |
| AI Question Generation | OpenAI-compatible API via reqwest |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.77.2+)
- [Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install frontend dependencies
npm install

# Run in development mode (starts Vite + Rust backend)
npx tauri dev
```

### Build

```bash
# Build a production installer/bundle
npx tauri build
```

### Frontend-only

```bash
npm run dev      # Vite dev server on localhost:5173
npm run build    # Type-check + build frontend
npm run lint     # ESLint
```

## Keyboard Shortcuts (Study)

| Key          | Action       |
| ------------ | ------------ |
| Space / Enter | Flip card    |
| 1            | Forgot       |
| 2            | Hazy         |
| 3            | Remembered   |
| M            | Mark mastered |
| Ctrl + R     | Replay pronunciation |
| Ctrl + ↑↓←→ | Quick preview navigation |

## License

AGPL-3.0
