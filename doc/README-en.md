# MintWord (薄荷词汇)

A cross-platform vocabulary learning app built with **Tauri v2**, **React**, **TypeScript**, and **Rust**. Uses the **SM-2 spaced repetition algorithm** to help you memorize words efficiently.

## Features

- **Spaced Repetition** — SM-2 algorithm for optimal review scheduling
- **Built-in Decks** — 8 Chinese exam vocabulary decks (CET-4, CET-6, TOEFL, IELTS, GRE, 考研, 高考, 中考)
- **Custom Decks** — Create your own decks and add words manually or in bulk
- **CSV Import** — Import vocabulary from CSV files
- **Text-to-Speech** — Windows / macOS system TTS + configurable AI TTS (OpenAI-compatible API)
- **Study Statistics** — Review history, heatmap activity, and learning progress
- **Mastered Cards** — Mark cards as mastered to exclude them from reviews
- **Theming** — 4 color themes (Mint, Ocean, Warm, Lavender) + dark mode
- **i18n** — English and Chinese (中文) interface
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

### Release macOS Bundles

Push an `app-v*` tag (for example, `app-v0.2.0`) or manually run the
`Release macOS` GitHub Actions workflow. It uploads `.dmg` and `.app` bundles
for both Apple Silicon (`arm64`) and Intel (`x64`) Macs to a GitHub Release.

The default bundle uses ad-hoc signing. Without an Apple Developer certificate,
users may need to allow the downloaded app in macOS Privacy & Security settings
when opening it for the first time.

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

## License

AGPL-3.0
