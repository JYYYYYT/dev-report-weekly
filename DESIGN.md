# DevWeek — 设计文档（AI 开发参考）

## 1. 产品定位

**一句话：** 本地优先的开发者周报助手，扫描本机多个 Git 仓库，按项目维度提取个人提交记录，通过 AI 生成可直接粘贴到飞书/钉钉/Notion 的中文周报。

**核心原则：**
- 隐私优先：不上传源码 diff，默认只读取 commit message、变更文件路径、统计数字
- 本地优先：所有数据、配置、密钥均存储在本地
- BYOK：用户自带 AI Key，没有中间服务器

---

## 2. 用户身份定位

**不需要账号系统，不需要登录。**

用户身份通过以下方式自动识别或手动指定：

1. **自动检测（默认）：** 启动时读取系统全局 Git 配置
   - `git config --global user.name`
   - `git config --global user.email`
   作为默认过滤条件，只提取该作者的 commit。

2. **手动切换/校准：** 用户可在设置页修改 `user.name` / `user.email` 的过滤值，支持多值（如有人用不同邮箱提交）。

3. **本地配置持久化：** 用户身份过滤条件、AI Key、偏好设置均存储在 Tauri 的 `appLocalDataDir()` 下（如 SQLite 或 JSON），无云端同步。

> **为什么不做账号系统：** 这是一个纯本地工具，没有服务端。账号系统会增加复杂度且毫无必要。用户就是“这台电脑上写代码的开发者”。

---

## 3. 项目导入与管理

### 3.1 导入项目
- **手动添加：** 通过系统文件夹选择器（Tauri `open` dialog）选择一个或多个 Git 仓库根目录。
- **自动扫描（可选 MVP 后）：** 扫描常见目录（如 `~/Projects`、`~/Code`、`~/Workspace`）自动发现 Git 仓库。
- **有效性校验：** 导入时校验目录下是否存在 `.git`，非 Git 仓库拒绝导入并提示。

### 3.2 多项目管理
- 左侧边栏展示已导入的项目列表，支持：
  - 启用/禁用某个项目（参与/不参与周报生成）
  - 删除项目（仅从列表移除，不删本地文件）
  - 项目别名：允许给路径起别名（如把 `/Users/xxx/company/frontend` 显示为 `前端主站`）
- 项目信息缓存：记录项目路径、别名、启用状态，持久化到本地配置。

---

## 4. 按项目维度提取 Commit

### 4.1 时间范围选择
用户选择时间范围，提供快捷选项：
- 本周（周一 00:00 ~ 现在）
- 上周
- 近 7 天
- 近 30 天
- 自定义范围（日期选择器）

### 4.2 提取逻辑（Tauri 后端/命令层）
对每个**已启用**的项目，执行类似命令：

```bash
git log --author="user.name|user.email" --since="2024-01-01" --until="2024-01-07" \
  --pretty=format:"%H|%s|%b|%ci" --numstat --no-merges
```

解析每个 commit：
- `hash`：commit hash（短 hash 用于展示）
- `subject`：commit message 第一行
- `body`：commit message 详细描述
- `date`：提交时间
- `files_changed`：变更文件路径列表
- `additions` / `deletions`：增删行数统计

### 4.3 原始摘要结构化（前端状态）
提取后按项目聚合，数据结构示例：

```typescript
interface ProjectCommitSummary {
  projectId: string;       // 项目别名或路径
  projectPath: string;     // 绝对路径
  commits: Commit[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: string[];  // 去重后的变更文件列表
}

interface Commit {
  hash: string;
  shortHash: string;
  subject: string;
  body?: string;
  date: string;
  authorName: string;
  authorEmail: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
}
```

前端展示原始摘要，供用户预览和手动删减（决定哪些 commit 不送给 AI）。

---

## 5. AI 集成设计（BYOK）

### 5.1 支持的 Provider（MVP 阶段）
| Provider | 说明 | 优先级 |
|---------|------|--------|
| OpenAI (GPT-4o / GPT-3.5) | 主流，响应快 | P0 |
| DeepSeek | 中文效果好，便宜 | P0 |
| Claude (Anthropic) | 长文本总结强 | P1 |
| Ollama | 本地模型，完全离线 | P1（简单就做） |

### 5.2 配置方式
用户在「设置」页配置：
- 选择 Provider
- 填写 API Base URL（可自定义，方便代理/企业内部接口）
- 填写 API Key（密码输入框，本地加密存储或至少 obscured）
- 选择模型（根据 provider 动态下拉或手动输入）

> **存储：** API Key 通过 Tauri 的 `stronghold` 插件或至少存储在本地配置文件中进行 base64 混淆。MVP 可先简单明文存本地 JSON，后续升级加密。

### 5.3 Prompt Pipeline

**输入给 AI 的内容必须对用户可见、可编辑。** 在 AI 生成前，展示一个「上下文编辑区」，包含：
- 当前选中的项目列表及时间范围
- 汇总后的 commit 信息（项目 -> commit 列表 -> 文件变更）
- 用户可手动删除不想提及的 commit 或补充额外上下文（如非代码工作：会议、文档、code review）

**Prompt 结构（参考）：**

```
你是一名资深[User Position]工程师，正在撰写周报。请根据以下 Git 提交记录，生成一份结构化的中文周报。

要求：
1. 按项目分类总结
2. 用业务语言描述，不要罗列技术细节
3. 包含：本周完成、问题与风险、下周计划（推测）
4. 语气专业、简洁
5. 总字数控制在 300-500 字

以下是提交记录：
{结构化 commit 数据}
```

**输出：** AI 返回 Markdown 格式的周报正文，用户可在右侧编辑区进一步修改。

### 5.4 Ollama 支持（P1）
如果 Tauri 侧通过 HTTP 请求 Ollama 本地接口（`http://localhost:11434`）没有额外复杂度，则一并支持：
- 在 Provider 列表增加「Ollama (本地)」
- 默认 base URL 为 `http://localhost:11434/api/chat`
- 模型列表从 Ollama 本地 API 拉取 `/api/tags`
- 无需 API Key

---

## 6. 技术栈

| 层级 | 技术 | 说明 |
|-----|------|------|
| 桌面框架 | Tauri v2 | Rust 后端 + Web 前端，轻量、原生性能 |
| 前端框架 | React 18 | 组件化 UI |
| 构建工具 | Vite | Tauri 官方推荐 |
| 样式方案 | TailwindCSS | 原子化 CSS，与 Tauri/Vite 集成无难度 |
| UI 组件 | shadcn/ui 或 Radix + Tailwind | 快速搭建高质量桌面 UI |
| 状态管理 | Zustand | 轻量，适合本地工具 |
| 后端命令 | Rust (`std::process::Command`) 或 `git2` crate | 执行 git 命令或直接用 libgit2 |
| 本地存储 | Tauri FS API + JSON / SQLite | 配置、项目列表、缓存 |
| AI 请求 | 前端 `fetch` 直接调用各平台 API | 无后端代理，密钥存在本地 |

### 6.1 TailwindCSS + Tauri 说明
**完全没有难度。** Tauri 不限制前端技术栈。接入方式：
1. `npm install -D tailwindcss postcss autoprefixer`
2. `npx tailwindcss init -p`
3. `tailwind.config.js` 中配置 `content: ["./src/**/*.{html,js,jsx,ts,tsx}"]`
4. `src/index.css` 中写入 `@tailwind base; @tailwind components; @tailwind utilities;`
5. Vite 天然支持 PostCSS，无需额外配置。

---

## 7. 核心界面流程

```
+---------------------------------------------------+
|  DevWeek                                          |
+----------+----------------------------------------+
| Projects |  Step 1: 选择时间范围                   |
| ───────  |  [本周] [上周] [自定义...]               |
| ☐ Proj A |                                        |
| ☐ Proj B |  Step 2: 原始摘要预览（按项目）          |
| ☐ Proj C |  ┌─ Proj A ─────────────────────┐      |
|          |  │ • fix: login bug (3 files)   │      |
| [+ 添加]  |  │ • feat: dashboard chart      │      |
|          |  └────────────────────────────────┘      |
|          |  [编辑上下文] [排除此项目]               |
|          |                                        |
|          |  Step 3: AI 生成周报                    |
|          |  [生成周报]  Provider: DeepSeek ▼       |
|          |                                        |
|          |  ┌─ 生成的周报（可编辑）────────────────┐|
|          |  │ ## 本周工作总结                     │|
|          |  │ ...                                 │|
|          |  └─────────────────────────────────────┘|
|          |  [复制为 Markdown] [复制为 飞书格式]     |
+----------+----------------------------------------+
```

---

## 8. MVP 功能边界

**必须有（2 周内）：**
- [ ] 手动导入本地 Git 仓库（多选目录）
- [ ] 项目列表管理（启用/禁用/删除/别名）
- [ ] 自动识别当前 Git 用户身份，可手动修改过滤条件
- [ ] 时间范围选择（本周/上周/自定义）
- [ ] 按项目提取 commit 并展示原始摘要
- [ ] 可编辑的 AI 上下文区（用户能删减 commit）
- [ ] 接入至少 OpenAI 和 DeepSeek（BYOK）
- [ ] AI 生成中文周报，支持编辑
- [ ] 一键复制 Markdown 格式

**可以延后：**
- [ ] Ollama 本地模型支持
- [ ] 自动扫描目录发现 Git 仓库
- [ ] 飞书/钉钉特定格式复制
- [ ] 周报历史记录
- [ ] 定时提醒（周五下午弹窗）
- [ ] 变更文件 diff 预览（非发送给 AI，仅本地查看）
- [ ] API Key 加密存储（Stronghold）

---

## 9. 项目目录建议

```
dev-report-weekly/
├── src/
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 主布局
│   ├── components/           # 通用组件
│   ├── pages/                # 页面级组件（Step 1/2/3）
│   ├── stores/               # Zustand stores
│   ├── hooks/                # 自定义 hooks
│   ├── lib/                  # 工具函数（git 解析、时间处理）
│   ├── types/                # TypeScript 类型
│   └── styles/
│       └── index.css         # Tailwind 入口
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri 入口
│   │   └── git.rs            # Git 命令封装
│   └── tauri.conf.json
├── DESIGN.md                 # 本文件
└── README.md
```

---

## 10. 隐私与安全红线（开发时必须遵守）

1. **默认不读取源码 diff。** 只提取 commit message、文件路径、增删统计。
2. **AI 上下文必须对用户完全可见、可编辑**，生成前明确展示「以下信息将发送给 AI」。
3. **无服务端。** 所有 API 请求从前端直接发往 OpenAI/DeepSeek 等平台。
4. **API Key 本地存储。** 绝不外传。
