> 翻译自 [English version](/creating-agents)

# 创建 Agent

> 通过 CLI、Dashboard 或 HTTP API 创建新的 AI agent。

## 概述

创建 agent 有三种方式：通过 CLI 交互式向导、Web Dashboard，或直接调用 HTTP API。每个 agent 需要唯一的 key、显示名称、LLM provider 和模型。可选字段包括 context window 大小、最大 tool 迭代次数、workspace 目录和 tool 配置。

## Agent 状态生命周期

当创建一个带有描述的 predefined agent 时，会经历以下状态：

| 状态 | 说明 |
|------|------|
| `summoning` | LLM 正在生成 personality 文件（SOUL.md、IDENTITY.md、USER_PREDEFINED.md） |
| `active` | Agent 已就绪，可以使用 |
| `summon_failed` | LLM 生成失败，使用模板文件作为备用 |

Open agent 创建后直接进入 `active` 状态，无需 summoning 步骤。

## CLI：交互式向导

最简单的入门方式：

```bash
./goclaw agent add
```

这会启动一个分步向导，依次询问：

1. **Agent name** — 用于生成规范化 ID（小写、连字符）。例如："coder" → `coder`
2. **Display name** — 在 dashboard 中显示的名称。同一个 `coder` agent 可以显示为 "Code Assistant"
3. **Provider** — LLM provider（可选：继承默认值，或选择 OpenRouter、Anthropic、OpenAI、Groq、DeepSeek、Gemini、Mistral）
4. **Model** — 模型名称（可选：继承默认值，或指定如 `claude-sonnet-4-6`）
5. **Workspace directory** — context 文件存放目录，默认为 `~/.goclaw/workspace-{agent-id}`

创建完成后，重启 gateway 以激活 agent：

```bash
./goclaw agent list          # 查看所有 agent
./goclaw gateway             # 重启以激活
```

## Dashboard：Web 界面

在 Web Dashboard 的 agents 页面：

1. 点击 **"Create Agent"** 或 **"+"**
2. 填写表单：
   - **Agent key** — 小写 slug（只允许字母、数字、连字符）
   - **Display name** — 易读的名称
   - **Agent type** — "Open"（每用户独立 context）或 "Predefined"（共享 context）
   - **Provider** — LLM provider
   - **Model** — 具体模型
   - **其他字段** — context window、最大迭代次数等
3. 点击 **Save**

如果创建的是**带描述的 predefined agent**，系统会自动触发 LLM "summoning"——根据描述生成 SOUL.md、IDENTITY.md，以及可选的 USER_PREDEFINED.md。

## HTTP API

也可以通过 HTTP API 创建 agent：

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "research",
    "display_name": "Research Assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "context_window": 200000,
    "max_tool_iterations": 20,
    "workspace": "~/.goclaw/research-workspace"
  }'
```

**必填字段：**
- `agent_key` — 唯一标识符（slug 格式）
- `display_name` — 易读的名称
- `provider` — LLM provider 名称
- `model` — 模型标识符

**可选字段：**
- `agent_type` — `"open"`（默认）或 `"predefined"`
- `context_window` — 最大 context token 数（默认：200,000）
- `max_tool_iterations` — 每次运行最大 tool 调用次数（默认：20）
- `workspace` — agent 文件路径（默认：`~/.goclaw/{agent-key}-workspace`）
- `other_config` — 自定义 JSON 字段（如用于 summoning 的 `{"description": "..."}`）

**响应：** 返回创建的 agent 对象，包含唯一 ID 和状态。

## 必填字段参考

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `agent_key` | string | 唯一 slug（小写字母数字连字符） | `code-bot`, `faq-helper` |
| `display_name` | string | 界面中显示的易读名称 | `Code Assistant` |
| `provider` | string | LLM provider（覆盖默认值） | `anthropic`, `openrouter` |
| `model` | string | 模型标识符（覆盖默认值） | `claude-sonnet-4-6` |

## 可选字段参考

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `agent_type` | string | `open` | `open`（每用户 context）或 `predefined`（共享） |
| `context_window` | integer | 200,000 | context 最大 token 数 |
| `max_tool_iterations` | integer | 20 | 每次请求最大 tool 调用次数 |
| `workspace` | string | `~/.goclaw/{key}-workspace` | context 文件目录 |
| `other_config` | JSON | `{}` | 自定义字段（如用于 summoning 的 `description`） |

> **frontmatter 字段：** Summoning 完成后，GoClaw 会将从 SOUL.md 中自动提取的专业能力摘要存储在 agent 的 `frontmatter` 字段中，用于 agent 发现与委派——不需要手动设置。

## 示例

### CLI：添加 Research Agent

```bash
$ ./goclaw agent add

── Add New Agent ──

Agent name: researcher
Display name: Research Assistant
Provider: (inherit: openrouter)
Model: (inherit: claude-sonnet-4-6)
Workspace directory: ~/.goclaw/workspace-researcher

Agent "researcher" created successfully.
  Display name: Research Assistant
  Provider: (inherit: openrouter)
  Model: (inherit: claude-sonnet-4-6)
  Workspace: ~/.goclaw/workspace-researcher

Restart the gateway to activate this agent.
```

### API：创建带 Summoning 的 Predefined FAQ Bot

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token123" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "faq-bot",
    "display_name": "FAQ Assistant",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "A friendly FAQ bot that answers common questions about our product. Organized, helpful, patient. Answers in the user'\''s language."
    }
  }'
```

系统会触发后台 LLM summoning 生成 personality 文件。轮询 agent 状态，查看其何时从 `summoning` 转变为 `active`。若 summoning 失败，状态设为 `summon_failed`，模板文件将作为备用保留。

> **注意：** HTTP 请求中的 `provider` 和 `model` 字段设定 agent 的默认 LLM。若 `GOCLAW_CONFIG` 中配置了全局默认值，运行时可能会覆盖这些字段。Summoning 本身使用全局默认 provider/model，除非 agent 有自己的配置。
>
> **Summoner 服务：** Predefined agent summoning 需要启用 summoner 服务。若服务未运行，agent 将直接使用模板文件以 `active` 状态创建（不进行 LLM 生成）。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| "Agent key must be a valid slug" | 只使用小写字母、数字和连字符，不能有空格或特殊字符 |
| "An agent with key already exists" | 选择唯一的 key，用 `./goclaw agent list` 查看已有 agent |
| "Agent created but not showing up" | 重启 gateway：`./goclaw`，新 agent 在启动时加载 |
| Summoning 耗时过长或失败 | 检查 LLM provider 连接和模型可用性，失败后模板文件仍作为备用 |
| Provider 或 model 未识别 | 确保 provider 已在 `GOCLAW_CONFIG` 中配置，参阅 provider 文档确认正确的模型名称 |

## 启动模板（Bootstrap Templates）

创建 agent 时，GoClaw 从内置模板 seed context 文件。seed 的文件集取决于 agent 类型：

**Open agents（用户首次聊天时）：**

| 文件 | 模板 | 用途 |
|------|------|------|
| `SOUL.md` | `SOUL.md` 模板 | Personality、tone、边界 |
| `IDENTITY.md` | `IDENTITY.md` 模板 | 名称、creature、emoji |
| `USER.md` | `USER.md` 模板 | 用户上下文（姓名、语言、时区） |
| `BOOTSTRAP.md` | `BOOTSTRAP.md` 模板 | 首次运行对话脚本 |
| `AGENTS_CORE.md` | `AGENTS_CORE.md` 模板 | 核心操作规则 |
| `AGENTS_TASK.md` | `AGENTS_TASK.md` 模板 | 任务/自动化规则 |
| `CAPABILITIES.md` | `CAPABILITIES.md` 模板 | 领域专业知识占位符 |

**v3 新增模板：**
- **`AGENTS_CORE.md`** — 向所有 agent 注入核心操作规则（语言匹配、系统消息处理）
- **`AGENTS_TASK.md`** — 补充任务/自动化规则（memory、调度）
- **`CAPABILITIES.md`** — 将领域专业知识与 persona 分离（SOUL.md 是*你是谁*；CAPABILITIES.md 是*你知道什么*）

---

## 下一步

- [Open vs. Predefined](/open-vs-predefined) — 了解 context 隔离差异
- [Context Files](/context-files) — 学习 SOUL.md、IDENTITY.md 等系统文件
- [Summoning & Bootstrap](/summoning-bootstrap) — LLM 如何在首次使用时生成 personality 文件

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
