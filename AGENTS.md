# AGENTS.md

## 项目

MintWord (薄荷词汇) — 基于 SM-2 间隔重复算法的跨平台词汇学习桌面应用。Tauri v2 (Rust 后端 + React 前端)，SQLite 存储，AGPL-3.0 协议。

## 常用命令

```bash
npm install              # 安装前端依赖
npx tauri dev            # 完整开发模式（Vite + Rust 后端同时启动）
npm run dev              # 仅前端 Vite 开发服务器，端口 :5173
npm run build            # tsc -b && vite build（仅前端）
npm run lint             # ESLint 检查
npx tauri build          # 完整生产构建（前端 + Rust → 安装包）
```

`npx tauri dev` 会自动执行 `beforeDevCommand: "npm run dev"` — 不要另外启动 Vite。

项目没有测试。没有单独的类型检查命令；`npm run build` 内部执行 `tsc -b`。

## 提交前必须通过的检查

**变更代码或提交前，必须依次执行以下命令且全部通过：**

```bash
npm run build            # 类型检查 (tsc -b) + 构建
npm run lint             # ESLint 检查
```

三项缺一不可。没有单独的 typecheck 命令，`npm run build` 同时承担类型检查和构建。先 build 再 lint，顺序不可颠倒。

## 约定式提交

本项目遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)（Conventional Commits）。每次提交必须使用以下格式：

```
<type>(<scope>): <subject>

<body>
```

常用 type：`feat`、`fix`、`refactor`、`style`、`docs`、`chore`、`perf`、`test`、`build`、`ci`。

使用多个 `-m` 参数撰写详细提交信息，用无序列表逐一说明变更的需求、代码、功能或影响（可以说明其一或者多项内容）：

```bash
git commit -m "feat(study): 新增快捷键支持" \
  -m "- 需求：学习页面支持键盘快捷键操作" \
  -m "- 代码：Study 组件新增 keydown 事件监听" \
  -m "- 功能：Space/Enter 翻转卡片，1/2/3 评分，M 标记掌握" \
  -m "- 影响：仅影响学习页面，不影响其他模块"
```

语言不限（中文或英文均可），但 type 和 scope 必须使用英文。

## 项目结构

```
src/                    React 前端 (TSX)
  main.tsx              入口 → App.tsx
  App.tsx               路由 + QueryClient 配置
  pages/                页面组件（Dashboard, Decks, Study, Stats 等）
  components/           共享 UI（Layout, PreviewGrid, Select）
  lib/api.ts            Tauri invoke 封装 — 前端调用 Rust 后端的唯一桥梁
  lib/i18n.ts           国际化
  types/index.ts        共享 TypeScript 类型定义
  index.css             Tailwind v4 + 自定义主题变量（mint/ocean/warm/lavender + dark）

src-tauri/              Rust 后端
  src/main.rs           薄入口 → 调用 app_lib::run()
  src/lib.rs            Tauri 构建器、插件注册、内置词库导入、命令注册
  src/commands.rs       所有 #[tauri_command] 函数 — 结构体也定义在此（Deck, Card, StudyCard 等）
  src/db.rs             Database 结构体 (Mutex<Connection>)，数据库迁移
  src/engine.rs         SM-2 算法逻辑
  src/importer.rs       CSV 导入（内置词库 + 用户文件）
  src/library.rs        文章库 CRUD
  src/ai.rs             AI API 集成（OpenAI 兼容接口）
  src/tts.rs            TTS 语音合成（Windows SAPI5 + AI TTS via rodio）
  tauri.conf.json       窗口配置、构建命令、打包设置
  capabilities/         Tauri 前端权限声明
```

## 核心模式

- **前端 ↔ 后端桥梁**：所有数据通过 `src/lib/api.ts` → `invoke()` → Rust `commands.rs` 流转。页面中不要直接调用 Tauri API，统一使用 `api.ts` 封装。
- **Tauri 命名转换**：Rust 用 `snake_case`（`get_decks`），TypeScript 用 `camelCase`（`getDecks`）。Tauri 自动转换。
- **状态管理**：TanStack React Query（staleTime 30s, retry 1）。无 Redux/Zustand。
- **路由**：React Router DOM v7 + `BrowserRouter`。路由定义在 `App.tsx`。
- **CSS**：Tailwind CSS v4 通过 Vite 插件加载。主题切换通过 `index.css` 中的 CSS 自定义属性（`.theme-ocean`、`.theme-warm`、`.theme-lavender`）+ `.dark` 类实现深色模式。
- **SQLite**：WAL 模式，外键开启。连接通过 `Mutex` 保护。Schema 迁移在 `db.rs:migrate()`。数据库文件位于应用数据目录（`mintword.db`）。
- **内置词库**：`resources/bundled-decks/` 下的 CSV 文件通过 `include_str!()` 编译时嵌入，首次启动时导入。
- **ID**：所有实体（decks、cards、articles）使用 UUID v4。
- **Tauri 权限**：`capabilities/default.json` 控制前端可访问的能力。当前允许对话框 + 文件系统读取。

## 国际化 (i18n)

- 所有翻译键定义在 `src/lib/i18n.ts` 的 `messages` 对象中，当前支持 `zh`（简体中文）、`zh-TW`（繁体中文）、`en`（英文）。
- **添加新语言时，必须第一时间在 `i18n.ts` 中补全所有翻译键**，然后才能在 Settings 页面添加对应的语言按钮。
- 前端所有用户可见文本必须通过 `t('key')` 函数获取，不要硬编码字符串。
- 参数化文本使用 `t('key', { param: value })` 格式，模板中用 `{param}` 占位。
- 回退链：`currentLang` → `en` → 原始 key。
- 语言设置通过 `getSetting('lang')` 持久化，在 `Layout` 组件启动时加载。

## 共享组件

项目中所有可复用 UI 组件位于 `src/components/`，编写代码时必须优先使用已有组件，不要重复实现。

| 组件 | 文件 | 用途 |
|------|------|------|
| `Layout` | `components/Layout.tsx` | 应用外壳：顶栏导航 + 内容区，启动时加载主题和语言设置 |
| `PreviewGrid` | `components/PreviewGrid.tsx` | 学习卡片快速预览网格，支持 Ctrl+方向键导航 |
| `Select` | `components/Select.tsx` | 自定义下拉选择器，支持键盘导航（↑↓/Enter/Escape/Home/End）、无障碍 ARIA、暗色模式。用法：`<Select options={[{value, label}]} value={v} onChange={fn} label="..." />` |

**规则：实现新的可复用组件后，必须写入此表。**

## TypeScript 配置要点

- TypeScript ~6.0，`noEmit: true`（Vite 负责打包），`verbatimModuleSyntax: true`，`erasableSyntaxOnly: true`
- `noUnusedLocals` 和 `noUnusedParameters` 已开启 — 未使用的导入/变量会导致 `tsc` 失败
- 模块解析：`bundler` 模式，`allowImportingTsExtensions: true`

## Rust 配置要点

- Edition 2021，MSRV 1.77.2
- `crate-type = ["staticlib", "cdylib", "rlib"]`（Tauri 要求）
- Windows 专属依赖：`windows` crate 用于原生 TTS（`Media_SpeechSynthesis`）
- SQLite 使用 `rusqlite` 的 `bundled` feature（无需系统 sqlite）

## 注意事项

- 非 monorepo / workspaces。根目录单包结构。
- `build` 脚本先执行 `tsc -b` 再执行 `vite build` — TypeScript 错误会阻断构建。
- Tauri 环境变量通过 vite.config.ts 的 `envPrefix: ['VITE_', 'TAURI_']` 暴露给前端。
- `main.rs` 中的 `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` 用于在 Windows Release 构建时隐藏控制台窗口。不要删除。
