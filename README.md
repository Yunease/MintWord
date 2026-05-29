# MintWord (薄荷词汇)

> [English Version](./doc/README-en.md)

**MintWord** 是一款基于 **SM-2 间隔重复算法** 的跨平台词汇学习桌面应用。前端使用 React + TypeScript + Vite，后端使用 Rust (Tauri v2)，数据库使用 SQLite。

## 功能特点

- **间隔重复** — 基于 SM-2 算法，科学安排复习计划
- **内置词库** — 预装 8 套国内考试词库（CET-4、CET-6、考研、GRE、TOEFL、IELTS、高考、中考）
- **自定义词库** — 创建自己的词库，支持手动添加、批量添加
- **CSV 导入** — 从 CSV 文件导入词汇
- **语音朗读** — Windows 原生 SAPI5 TTS 及可配置的 AI TTS（兼容 OpenAI 接口）
- **学习统计** — 复习记录、热力图和学习进度追踪
- **掌握标记** — 标记已掌握的卡片，自动跳过复习
- **主题配色** — 4 套主题色（薄荷、海洋、暖阳、薰衣草）+ 深色模式
- **国际化** — 支持中文和英文界面
- **快捷键** — 学习时使用键盘快速操作

## 内置词库

| 词库     | 说明                   |
| -------- | ---------------------- |
| CET-4    | 大学英语四级           |
| CET-6    | 大学英语六级           |
| 考研     | 研究生入学考试         |
| GRE      | 美国研究生入学考试     |
| TOEFL    | 托福考试               |
| IELTS    | 雅思考试               |
| 高考     | 普通高等学校招生考试   |
| 中考     | 初中学业水平考试       |

## 技术栈

| 层       | 技术                         |
| -------- | ---------------------------- |
| 桌面框架 | [Tauri v2](https://tauri.app/) |
| 前端     | React 19 + TypeScript + Vite |
| CSS      | Tailwind CSS v4              |
| 状态管理 | TanStack React Query         |
| 路由     | React Router DOM v7          |
| 后端     | Rust                         |
| 数据库   | SQLite (rusqlite)            |
| 间隔重复 | SM-2 (SuperMemo 2)           |
| TTS（Windows） | Windows.Media.SpeechSynthesis |
| TTS（AI） | OpenAI 兼容接口 (reqwest)    |
| 音频播放 | rodio                        |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.77.2+)
- [Tauri v2 系统依赖](https://v2.tauri.app/start/prerequisites/)

### 开发模式

```bash
# 安装前端依赖
npm install

# 启动开发模式（同时启动 Vite 和 Rust 后端）
npx tauri dev
```

### 构建安装包

```bash
npx tauri build
```

### 仅前端

```bash
npm run dev      # Vite 开发服务器，默认 localhost:5173
npm run build    # 类型检查 + 构建前端
npm run lint     # ESLint 检查
```

## 学习快捷键

| 按键         | 功能         |
| ------------ | ------------ |
| Space / Enter | 翻转卡片     |
| 1            | 忘记         |
| 2            | 模糊         |
| 3            | 记得         |
| M            | 标记已掌握   |

## 许可证

AGPL-3.0
