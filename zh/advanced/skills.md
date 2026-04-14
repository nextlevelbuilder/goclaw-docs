> 翻译自 [English version](/skills)

# Skills

> 将可复用知识打包成 Markdown 文件，自动注入到任意 agent 的上下文中。

## 概述

Skill 是一个包含 `SKILL.md` 文件的目录。当 agent 运行时，GoClaw 读取该作用域内的 skill 文件，并将其内容以 `## Available Skills` 章节注入到系统提示词中。agent 随即可以使用这些知识，无需在每次对话中重复。

Skill 适合用于编码重复流程、工具使用指南、领域知识或 agent 应始终遵循的编码规范。

## SKILL.md 格式

每个 skill 存放在独立目录中，目录名即为 skill 的 **slug** — 用于过滤和搜索的唯一标识符。

```
~/.goclaw/skills/
└── code-reviewer/
    └── SKILL.md
```

`SKILL.md` 文件包含可选的 YAML frontmatter 块，后跟 skill 内容：

```markdown
---
name: Code Reviewer
description: Guidelines for reviewing pull requests — style, security, and performance checks.
---

## How to Review Code

When asked to review code, always check:
1. **Security** — SQL injection, XSS, hardcoded secrets
2. **Error handling** — all errors returned or logged
3. **Tests** — new logic has corresponding test coverage

Use `{baseDir}` to reference files alongside this SKILL.md:
- Checklist: {baseDir}/review-checklist.md
```

`{baseDir}` 占位符在加载时替换为 skill 目录的绝对路径，方便引用同级文件。

> **多行块**：YAML frontmatter 支持使用 `|` 块标量为 `description` 编写多行字符串，适合较长的描述。

**Frontmatter 字段：**

| 字段 | 描述 |
|---|---|
| `name` | 人类可读的显示名称（默认为目录名） |
| `description` | 供 `skill_search` 匹配查询的单行摘要 |

## 六层优先级

GoClaw 按优先级从六个位置加载 skill。高优先级位置的 skill 会覆盖低优先级的同名 slug：

| 优先级 | 位置 | 来源标签 |
|---|---|---|
| 1（最高） | `<workspace>/skills/` | `workspace` |
| 2 | `<workspace>/.agents/skills/` | `agents-project` |
| 3 | `~/.agents/skills/` | `agents-personal` |
| 4 | `~/.goclaw/skills/` | `global` |
| 5 | `~/.goclaw/skills-store/`（DB 托管，版本化） | `managed` |
| 6（最低） | 内置（随二进制文件打包） | `builtin` |

通过 Dashboard 上传的 skill 存储在 `~/.goclaw/skills-store/`，使用版本化子目录结构（`<slug>/<version>/SKILL.md`）。它们作用于 `managed` 层级——高于 builtin，但低于四个文件系统层级。Loader 始终为每个 slug 提供编号最高的版本。

**优先级示例：** 如果 `~/.goclaw/skills/` 和 `<workspace>/skills/` 中都有 `code-reviewer` skill，则 workspace 版本优先。

## 热重载

GoClaw 使用 `fsnotify` 监听所有 skill 目录。当你创建、修改或删除 `SKILL.md` 时，500 毫秒内生效 — 无需重启。watcher 会递增内部版本计数器；agent 在每次请求时比较缓存的版本，如版本变更则重新加载 skill。

```
# 放入新 skill — agent 在下次请求时自动拾取
mkdir ~/.goclaw/skills/my-new-skill
echo "---\nname: My Skill\ndescription: Does something useful.\n---\n\n## Instructions\n..." \
  > ~/.goclaw/skills/my-new-skill/SKILL.md
```

## 通过 Dashboard 上传

进入 **Skills → Upload**，拖入 ZIP 文件。ZIP 可以包含**单个 skill** 或**多个 skill**：

```
# 单个 skill — SKILL.md 在根目录
my-skill.zip
└── SKILL.md

# 单个 skill — 包裹在单个目录中
my-skill.zip
└── code-reviewer/
    ├── SKILL.md
    └── review-checklist.md

# 多 skill ZIP — 一次上传多个 skill
skills-bundle.zip
└── skills/
    ├── code-reviewer/
    │   ├── SKILL.md
    │   └── metadata.json
    └── sql-style/
        ├── SKILL.md
        └── metadata.json
```

上传的 skill 以版本化子目录结构存储在管理目录下（默认 `~/.goclaw/skills-store/`）：

```
~/.goclaw/skills-store/<slug>/<version>/SKILL.md
```

元数据（名称、描述、可见性、授权）存在 PostgreSQL 中；文件内容存在磁盘上。GoClaw 始终提供编号最高的版本。旧版本保留以备回滚。

通过 Dashboard 上传的 skill 初始可见性为 **internal** — 可立即被你授权的任意 agent 或用户访问。

## 通过 API 导入

`POST /v1/skills/import` 端点接受与 Dashboard 上传相同的 ZIP 格式，支持单 skill 和多 skill 归档包。

**标准导入（JSON 响应）：**

```bash
curl -X POST http://localhost:8080/v1/skills/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@skills-bundle.zip"
```

返回 `SkillsImportSummary` JSON 对象：

```json
{
  "skills_imported": 2,
  "skills_skipped": 0,
  "grants_applied": 3
}
```

**SSE 流式进度导入（`?stream=true`）：**

```bash
curl -X POST "http://localhost:8080/v1/skills/import?stream=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  -F "file=@skills-bundle.zip"
```

使用 `?stream=true` 时，服务器在处理每个 skill 时发送 Server-Sent Events（SSE）：

```
event: progress
data: {"phase":"skill","status":"running","detail":"code-reviewer"}

event: progress
data: {"phase":"skill","status":"done","detail":"code-reviewer"}

event: complete
data: {"skills_imported":2,"skills_skipped":0,"grants_applied":3}
```

**基于哈希的幂等性：** 上传端点使用 `SKILL.md` 内容的 SHA-256 哈希进行去重。如果相同的 `SKILL.md` 内容再次上传（即使打包在不同的 ZIP 中），也不会创建新版本 — 现有版本保持不变。只有 `SKILL.md` 实际内容发生变化时才会触发新版本创建。

## 运行时环境

使用 Python 或 Node.js 的 skill 在预装了相应包的 Docker 容器中运行。

### 预装包

| 类别 | 包 |
|---|---|
| Python | `pypdf`、`openpyxl`、`pandas`、`python-pptx`、`markitdown` |
| Node.js（全局 npm） | `docx`、`pptxgenjs` |
| 系统工具 | `python3`、`nodejs`、`pandoc`、`gh`（GitHub CLI） |

### 可写运行时目录

容器根文件系统为只读。agent 将额外包安装到可写的卷挂载目录：

```
/app/data/.runtime/
├── pip/         ← PIP_TARGET（Python 包）
├── pip-cache/   ← PIP_CACHE_DIR
└── npm-global/  ← NPM_CONFIG_PREFIX（Node.js 包）
```

运行时安装的包在同一容器生命周期内的工具调用间持久存在。

### 安全约束

| 约束 | 详情 |
|---|---|
| `read_only: true` | 容器根文件系统不可变；只有卷可写 |
| `/tmp` 为 `noexec` | 不能从 tmpfs 执行二进制文件 |
| `cap_drop: ALL` | 无提权 |
| Exec 拒绝模式 | 阻止 `curl \| sh`、反弹 shell、加密挖矿 |
| `.goclaw/` 被拒绝 | Exec 工具阻止访问 `.goclaw/`，但允许 `.goclaw/skills-store/` |

### Agent 可以 / 不可以做什么

Agent **可以**：运行 Python/Node 脚本，通过 `pip3 install` 或 `npm install -g` 安装包，访问 `/app/workspace/` 中的文件（包括 `.media/`）。

Agent **不可以**：写入系统路径，从 `/tmp` 执行二进制文件，运行被拦截的 shell 模式（网络工具、反弹 shell）。

## 内置 Skill

GoClaw 在 Docker 镜像内的 `/app/bundled-skills/` 中内置了五个核心 skill，优先级最低 — 用户上传的同名 slug skill 可覆盖它们。

| Skill | 用途 |
|---|---|
| `pdf` | 读取、创建、合并、拆分 PDF |
| `xlsx` | 读取、创建、编辑电子表格 |
| `docx` | 读取、创建、编辑 Word 文档 |
| `pptx` | 读取、创建、编辑演示文稿 |
| `skill-creator` | 创建新 skill |

内置 skill 在每次网关启动时种入 PostgreSQL（哈希跟踪，未变更则不重新导入）。它们被标记为 `is_system = true` 且 `visibility = 'public'`。

### 依赖系统

GoClaw 自动检测并安装缺失的 skill 依赖：

1. **扫描器** — 静态分析 `scripts/` 子目录中的 Python（`import X`、`from X import`）和 Node.js（`require('X')`、`import from 'X'`）导入
2. **检查器** — 通过子进程验证每个导入在运行时是否可解析（`python3 -c "import X"` / `node -e "require.resolve('X')"`）
3. **安装器** — 按前缀安装：`pip:name` → `pip3 install`，`npm:name` → `npm install -g`，`apk:name` → `doas apk add`

依赖检查在启动时的后台 goroutine 中运行（非阻塞）。缺少依赖的 skill 会被自动归档；安装依赖后重新激活。也可通过 Dashboard 的 **Skills → Rescan Deps** 或 `POST /v1/skills/rescan-deps` 触发重新扫描。

## 内置 Skill 工具

GoClaw 提供三个内置工具，供 agent 在运行时发现和激活 skill。

### skill_search

Agent 使用 `skill_search` 搜索 skill。搜索使用基于每个 skill 名称和描述构建的 **BM25 索引**，当配置了 embedding provider 时可选混合搜索（BM25 + 向量嵌入）。

```
# agent 在内部调用此工具 — 你不需要直接调用它
skill_search(query="how to review a pull request", max_results=5)
```

该工具返回包含名称、描述、位置路径和得分的排名结果。收到结果后，agent 调用 `use_skill` 再调用 `read_file` 来加载 skill 内容。

每次 loader 版本计数器递增时（即任何热重载事件或启动后）索引都会重建。

### use_skill

轻量级可观测性标记工具。agent 在读取 skill 文件前调用 `use_skill`，使 skill 激活在追踪和实时事件中可见。它本身不加载任何内容。

```
use_skill(name="code-reviewer")
# 然后：
read_file(path="/path/to/code-reviewer/SKILL.md")
```

### publish_skill

Agent 可以使用 `publish_skill` 将本地 skill 目录注册到系统数据库中。目录必须包含 frontmatter 中有 `name` 的 `SKILL.md`。skill 发布后自动授权给调用的 agent。

```
publish_skill(path="./skills/my-skill")
```

skill 以 `private` 可见性存储，并自动授权给调用的 agent。管理员可以在之后通过 Dashboard 或 API 将其授权给其他 agent 或提升可见性。

## 向 Agent 授权 Skill（管理模式）

通过 `publish_skill` 发布的 skill 初始可见性为 **private**，通过 Dashboard 上传的为 **internal**。无论哪种方式，都必须将 skill **授权**给 agent，才能将其注入该 agent 的上下文。

### 通过 Dashboard

1. 在侧边栏点击 **Skills**
2. 点击要授权的 skill
3. 在 **Agent Grants** 下选择 agent 并点击 **Grant**
4. skill 将在下次请求时注入该 agent 的上下文

要撤销，在授权列表中关闭该 agent 的切换。

### 通过 API

授权 skill 给 agent：

```bash
curl -X POST http://localhost:8080/v1/skills/{id}/grants/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "AGENT_UUID", "version": 1}'
```

撤销 agent 授权：

```bash
curl -X DELETE http://localhost:8080/v1/skills/{id}/grants/agent/{agent_id} \
  -H "Authorization: Bearer $TOKEN"
```

授权 skill 给特定用户（使其出现在该用户的 agent 会话中）：

```bash
curl -X POST http://localhost:8080/v1/skills/{id}/grants/user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user@example.com"}'
```

撤销用户授权：

```bash
curl -X DELETE http://localhost:8080/v1/skills/{id}/grants/user/{user_id} \
  -H "Authorization: Bearer $TOKEN"
```

### 可见性级别

| 级别 | 可访问者 |
|---|---|
| `private` | 仅 skill 所有者（上传者） |
| `internal` | 明确被授权的 agent 和用户 |
| `public` | 所有 agent 和用户 |

## 示例

### 工作空间范围的 SQL 风格指南

```
my-project/
└── skills/
    └── sql-style/
        └── SKILL.md
```

```markdown
---
name: SQL Style Guide
description: Team conventions for writing PostgreSQL queries in this project.
---

## SQL Conventions

- Use `$1, $2` positional parameters — never string interpolation
- Always use `RETURNING id` on INSERT
- Table and column names: snake_case
- Never use `SELECT *` in application queries
```

### 全局"保持简洁"提醒

```
~/.goclaw/skills/
└── concise-responses/
    └── SKILL.md
```

```markdown
---
name: Concise Responses
description: Keep all responses short, bullet-pointed, and actionable.
---

Always:
- Lead with the answer, not the explanation
- Use bullet points for lists of 3 or more items
- Keep code examples under 20 lines
```

## Agent 注入阈值

GoClaw 决定是将 skill 内联嵌入系统提示词，还是回退到 `skill_search`：

| 条件 | 模式 |
|---|---|
| `≤ 40 个 skill` 且估算 token `≤ 5000` | **内联** — skill 以 XML 形式注入系统提示词 |
| `> 40 个 skill` 或估算 token `> 5000` | **搜索** — agent 使用 `skill_search` 工具 |

Token 估算：每个 skill 约 `(len(name) + len(description) + 10) / 4`（约 100–150 token）。

已禁用的 skill（`enabled = false`）不参与内联和搜索注入。

### 列出已归档的 Skill

缺少依赖的 skill 状态设为 `status = 'archived'`，仍可在 Dashboard 中查看。可通过 `GET /v1/skills?status=archived` 或 `skills.list` WebSocket RPC 方法列出（返回每个 skill 的 `enabled`、`status` 和 `missing_deps` 字段）。

## Skill 进化

当 agent 配置中启用了 `skill_evolve` 时，agent 获得 `skill_manage` 工具，可以在对话中创建、更新和版本化 skill — 形成一个让 agent 改善自身知识库的学习循环。当 `skill_evolve` 为 **off**（默认值）时，`skill_manage` 工具完全从 LLM 的工具列表中隐藏。

详见 [Agent 进化](agent-evolution.md) 中关于 `skill_manage` 工具和进化工作流的完整说明。

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| Skill 未出现在 agent 中 | 目录结构错误（SKILL.md 不在子目录中） | 确保路径为 `<skills-dir>/<slug>/SKILL.md` |
| 修改未被拾取 | watcher 未启动（非 Docker 环境） | 重启 GoClaw；验证日志中的 `skills watcher started` |
| 使用了低优先级 skill | 名称冲突 — slug 在更高层级已存在 | 使用唯一 slug，或将 skill 放在更高优先级位置 |
| `skill_search` 无结果 | 索引尚未构建（第一次请求）或 frontmatter 无描述 | 在 frontmatter 中添加 `description`；下次热重载时索引重建 |
| ZIP 上传失败 | ZIP 中未找到 `SKILL.md` | 将 `SKILL.md` 放在 ZIP 根目录、一个顶层目录中，或使用多 skill 布局 `skills/<slug>/SKILL.md` |

## 下一步

- [MCP 集成](/mcp-integration) — 连接外部工具服务器
- [自定义工具](/custom-tools) — 为 agent 添加基于 shell 的工具
- [定时任务与 Cron](/scheduling-cron) — 按计划运行 agent

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-15 -->
