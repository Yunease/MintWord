# MintWord (薄荷词汇)

> [简体中文](../README.md) · [English](./README-en.md) · [日本語](./README-ja.md)

**MintWord**는 **SM-2 간격 반복 알고리즘** 기반의 크로스 플랫폼 어휘 학습 데스크톱 앱입니다. 프론트엔드는 React + TypeScript + Vite, 백엔드는 Rust (Tauri v2), 데이터베이스는 SQLite를 사용합니다.

## 기능

- **간격 반복** — SM-2 알고리즘 기반의 최적 복습 일정
- **내장 단어장** — 중국어 시험 대비 8종 단어장 (CET-4, CET-6, 대학원 시험, GRE, TOEFL, IELTS, 수능, 중간고사)
- **사용자 정의 단어장** — 직접 단어장을 만들고 수동 또는 일괄 추가
- **CSV 가져오기** — CSV 파일에서 어휘 가져오기
- **음성 읽기** — Windows / macOS 시스템 TTS + 설정 가능한 AI TTS (OpenAI 호환 API)
- **학습 통계** — 복습 기록, 히트맵, 학습 진행 상황 추적
- **숙련 표시** — 숙련된 카드에 표시하여 복습에서 자동 제외
- **받아쓰기 모드** — 학습 중 무작위로 받아쓰기 출제, 단어 발음 듣고 철자 입력
- **AI 출제** — 단어장에서 자동으로 객관식 문제 생성, 난이도·문항 수·선지 개수 설정 가능
- **AI 독해 문제** — 문서를 가져와 AI로 독해 문제 생성
- **AI 공급자 관리** — 맞춤형 AI 공급자(OpenAI 호환 인터페이스) 추가, 모델 및 매개변수 설정
- **라이브러리** — 학습 문서 관리, TXT 가져오기 또는 수동 붙여넣기 지원
- **빠른 미리보기** — 학습 종료 후 학습한 단어를 빠르게 복습
- **노트 기능** — 학습 중 카드에 개인 메모 추가
- **테마 색상** — 4가지 테마(민트, 오션, 웜, 라벤더) + 다크 모드
- **다국어 지원** — 간체 중국어, 번체 중국어, 영어, 일본어, 한국어 인터페이스
- **단축키** — 학습 중 키보드로 빠르게 조작

## 내장 단어장

| 단어장     | 설명                     |
| ---------- | ------------------------ |
| CET-4      | 대학 영어 4급            |
| CET-6      | 대학 영어 6급            |
| 考研       | 대학원 입학 시험         |
| GRE        | 미국 대학원 입학 시험    |
| TOEFL      | 토플 시험                |
| IELTS      | 아이엘츠 시험            |
| 高考       | 중국 대학 입학 시험      |
| 中考       | 중국 고등학교 입학 시험  |

## 기술 스택

| 계층           | 기술                                |
| -------------- | ----------------------------------- |
| 데스크톱 프레임워크 | [Tauri v2](https://tauri.app/)  |
| 프론트엔드     | React 19 + TypeScript + Vite        |
| CSS            | Tailwind CSS v4                     |
| 상태 관리      | TanStack React Query                |
| 라우팅         | React Router DOM v7                 |
| 백엔드         | Rust                                |
| 데이터베이스   | SQLite (rusqlite)                  |
| 간격 반복      | SM-2 (SuperMemo 2)                  |
| TTS (시스템)   | Windows.Media.SpeechSynthesis / macOS `say` |
| TTS (AI)       | OpenAI 호환 API (reqwest)          |
| 오디오 재생    | rodio                               |
| AI 문제 생성   | OpenAI 호환 API (reqwest)          |

## 빠른 시작

### 환경 요구 사항

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.77.2+)
- [Tauri v2 시스템 종속성](https://v2.tauri.app/start/prerequisites/)

### 개발 모드

```bash
# 프론트엔드 종속성 설치
npm install

# 개발 모드 실행 (Vite + Rust 백엔드 동시 시작)
npx tauri dev
```

### 빌드

```bash
npx tauri build
```

### 프론트엔드만

```bash
npm run dev      # Vite 개발 서버 (기본 localhost:5173)
npm run build    # 타입 체크 + 프론트엔드 빌드
npm run lint     # ESLint 체크
```

## 학습 단축키

| 키            | 기능               |
| ------------- | ------------------ |
| Space / Enter | 카드 뒤집기        |
| 1             | 잊었음             |
| 2             | 애매함             |
| 3             | 기억함             |
| M             | 숙련됨으로 표시    |
| Ctrl + R      | 발음 다시 듣기     |
| Ctrl + ↑↓←→  | 빠른 미리보기 이동 |

## 라이선스

AGPL-3.0
