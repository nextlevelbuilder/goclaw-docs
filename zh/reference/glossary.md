> 翻译自 [English version](/glossary)

# 术语表

> GoClaw 文档中使用的专有术语定义。

## Agent

一个 AI 助理实例，拥有自己的身份、LLM 配置、工作区和上下文文件。每个 agent 都有唯一的 `agent_key`（如 `researcher`）、显示名称、provider/模型对和类型（`open` 或 `predefined`）。

Agent 存储在 `agents` 表中。运行时，gateway 通过合并 `config.json` 中的 `agents.defaults` 与每 agent 的 `agents.list` 覆盖设置来解析 agent 配置，然后应用数据库级覆盖。

参见：[Open vs Predefined Agents](/open-vs-predefined)

---

## Open Agent

上下文**按用户**隔离的 agent。每个与 open agent 聊天的用户都有自己的私有会话历史和 USER.md 上下文文件。系统提示文件（SOUL.md、IDENTITY.md）是共享的，但对话和用户特定的记忆是隔离的。

这是默认的 agent 类型（`agent_type: "open"`）。

---

## Predefined Agent

**核心上下文在所有用户间共享**的 agent。所有用户与同一 SOUL.md、IDENTITY.md 和系统提示交互。只有 USER_PREDEFINED.md 是按用户的。预定义 agent 专为特定用途的 bot 设计（如 FAQ bot 或编程助理），在这类场景中一致的人设比按用户隔离更重要。

通过 `agent_type: "predefined"` 设置。

---

## Summon / 召唤

使用 LLM 从纯文本描述**自动生成** agent 个性文件（SOUL.md、IDENTITY.md、USER_PREDEFINED.md）的过程。当你创建带 `description` 字段的预定义 agent 时，gateway 在后台触发召唤。Agent 状态显示 `summoning`，直到生成完成，然后转为 `active`。

召唤每个 agent 只运行一次，或在你触发 `POST /v1/agents/{id}/resummon` 时运行。

参见：[召唤与 Bootstrap](/summoning-bootstrap)

---

## Bootstrap

在每次 agent 运行开始时**加载到系统提示中的一组上下文文件**。Bootstrap 文件包括 SOUL.md（个性）、IDENTITY.md（能力）以及可选的 USER.md 或 USER_PREDEFINED.md（用户特定上下文）。

对于 open agent，bootstrap 文件按 agent 存储在 `agent_context_files` 中，按用户存储在 `user_context_files` 中。Gateway 加载并连接它们，应用字符限制（`bootstrapMaxChars`、`bootstrapTotalMaxChars`）后插入 LLM 的系统提示。

---

## Compaction（会话压缩）

当会话的 token 使用量超过阈值（默认：上下文窗口的 75%）时触发的**自动会话历史摘要**。压缩期间，gateway：

1. 可选地将最近对话刷新到记忆（记忆刷新）。
2. 使用 LLM 对现有历史进行摘要。
3. 用摘要替换完整历史，保留最后几条消息。

Compaction 使会话无限期存活而不触及上下文限制。通过 `sessions` 表上的 `compaction_count` 追踪。

通过 `config.json` 中的 `agents.defaults.compaction` 配置。

---

## Context Pruning（上下文修剪）

在需要 compaction 之前**修剪旧工具结果**以回收上下文空间的内存优化。两种模式：

- **软修剪** — 将过大的工具结果截断为 `headChars + tailChars`。
- **硬清除** — 用占位字符串替换非常旧的工具结果。

当上下文超过上下文窗口的 `softTrimRatio` 或 `hardClearRatio` 时激活修剪。配置 Anthropic 时自动启用（模式：`cache-ttl`）。

通过 `config.json` 中的 `agents.defaults.contextPruning` 配置。

---

## Delegation（委托）

一个 agent **将任务移交给另一个 agent** 并等待结果。调用（父）agent 调用 `delegate` 或 `spawn` 工具，创建子 agent 会话。子 agent 完成并回报后，父 agent 恢复。

委托需要两个 agent 之间有 **Agent Link**。`traces` 表通过 `parent_trace_id` 记录委托。活跃委托出现在 `delegations` 表中，并发出 `delegation.*` WebSocket 事件。

---

## Handoff（移交）

从一个 agent 到另一个 agent 的单向**对话所有权转移**，通常在对话中途触发，当用户的请求更适合由其他 agent 处理时。与委托（返回结果给调用者）不同，移交永久将会话路由到新 agent。

发出 `handoff` WebSocket 事件，payload 中包含 `from_agent`、`to_agent` 和 `reason`。

---

## Evaluate Loop（评估循环）

Agent 循环反复运行的**思考 → 行动 → 观察**周期：

1. **思考** — LLM 处理当前上下文并决定要做什么。
2. **行动** — 如果 LLM 发出工具调用，gateway 执行它。
3. **观察** — 工具结果添加到上下文，循环继续。

当 LLM 产生最终文本响应（无待处理的工具调用）或达到 `max_tool_iterations` 时，循环停止。

---

## Lane（调度通道）

调度器中的**命名执行队列**。GoClaw 使用三个内置通道：

| 通道 | 用途 |
|------|---------|
| `main` | 来自 channel 的用户发起的聊天消息 |
| `subagent` | 来自父 agent 的委托任务 |
| `cron` | 定时 cron 任务运行 |

通道提供**背压**和**自适应限流**——当会话接近摘要阈值时，降低每会话并发以防止并发运行和 compaction 之间的竞争。

---

## Pairing（配对）

channel 用户的**信任建立流程**。当 Telegram（或其他 channel）用户首次给 bot 发消息，且 `dm_policy` 设置为 `"pairing"` 时，bot 要求他们发送配对码。Gateway 生成一个 8 字符的配对码，操作员通过 `goclaw pairing approve` 或 Web 仪表盘审批。

配对后，用户的 `sender_id + channel` 存储在 `paired_devices` 中，可自由聊天。配对可随时撤销。

---

## Provider

注册到 gateway 的 **LLM 后端**。Provider 存储在 `llm_providers` 表中，API key 经过加密。运行时，gateway 解析每个 agent 的有效 provider 并发起认证 API 调用。

支持的 provider 类型：
- `openai_compat` — 任何 OpenAI 兼容 API（OpenAI、Groq、DeepSeek、Mistral、OpenRouter、xAI 等）
- `anthropic` — 支持流式 SSE 的 Anthropic 原生 API
- `claude-cli` — 本地 `claude` CLI 二进制（无需 API key）

Provider 也可以通过 Web 仪表盘或 `POST /v1/providers` 添加。

---

## Session（会话）

用户与 agent 之间的**持久对话线程**。会话 key 唯一标识线程，通常由 channel 和用户标识符组成（如 `telegram:123456789`）。

会话以 JSONB 格式存储完整消息历史、累计 token 计数、活跃模型和 provider，以及 compaction 元数据。持久化于 `sessions` 表中，gateway 重启后仍保留。

---

## Skill（技能）

**可复用的指令包**——通常是带有 `## SKILL` frontmatter 块的 Markdown 文件——agent 可以发现并应用。技能无需修改核心系统提示，就能教会 agent 新的工作流、人设或领域知识。

技能通过 `POST /v1/skills/upload` 以 `.zip` 文件上传，存储在 `skills` 表中，并为 BM25 全文和语义（embedding）搜索建立索引。访问通过 `skill_agent_grants` 和 `skill_user_grants` 控制。

运行时，agent 使用 `skill_search` 工具搜索相关技能，并用 `read_file` 读取其内容。

---

## Workspace（工作区）

agent 读写文件的**文件系统目录**。`read_file`、`write_file`、`list_files` 和 `exec` 等工具相对于工作区运行。当 `restrict_to_workspace` 为 `true`（默认）时，agent 无法逃出此目录。

每个 agent 在 `agents.defaults.workspace` 或每 agent 覆盖设置中配置工作区路径。路径支持 `~` 展开。

---

## Subagent（子 agent）

由另一个 agent **派生以处理并行或委托子任务**的 agent 会话。子 agent 通过 `spawn` 工具创建，在 `subagent` 通道中运行。通过 `AnnounceQueue` 向父 agent 报告结果，该队列批量并防抖通知。

子 agent 并发由 `agents.defaults.subagents`（`maxConcurrent`、`maxSpawnDepth`、`maxChildrenPerAgent`）控制。

---

## Agent Team（Agent 团队）

**在共享任务列表上协作的命名 agent 群组**。一个 agent 被指定为 `lead`，其他为 `members`。团队使用：

- **任务列表** — 共享的 `team_tasks` 表，agent 在其中认领、处理和完成任务。
- **点对点消息** — agent 间通信的 `team_messages` 邮箱。
- **Agent links** — 在团队成员间自动创建以启用委托。

团队发出 `team.*` WebSocket 事件，实时展示协作情况。

---

## Agent Link

授权一个 agent 向另一个 agent 委托任务的**权限记录**。Link 存储在 `agent_links` 中，包含 `source_agent_id` → `target_agent_id`。可通过 `POST /v1/agents/links` 手动创建，或在组建团队时自动创建。

没有 link，agent 之间无法相互委托——即使他们共享一个团队。

---

## MCP（Model Context Protocol）

用于**将外部工具服务器连接到 LLM agent** 的开放协议。GoClaw 可以通过 `stdio`（子进程）、`sse` 或 `streamable-http` 传输连接到 MCP 服务器。每个服务器暴露一组工具，与内置工具透明地注册在一起。

MCP 服务器通过 `mcp_servers` 表和 `POST /v1/mcp/servers` 管理。访问通过 `mcp_agent_grants` 和 `mcp_user_grants` 按 agent 或按用户授权。

---

## 下一步

- [配置参考](/config-reference) — 配置 agent、compaction、上下文修剪、沙盒
- [WebSocket 协议](/websocket-protocol) — 委托、移交和团队活动的事件名称
- [数据库 Schema](/database-schema) — sessions、traces、teams 等表定义

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
