> 翻译自 [English version](/cli-commands)

# CLI 命令

> `goclaw` 每个命令、子命令和标志的完整参考。

## 概述

`goclaw` 二进制文件是单一可执行文件，既可启动网关，也提供管理子命令。全局标志适用于所有命令。

```bash
goclaw [global flags] <command> [subcommand] [flags] [args]
```

**全局标志**

| 标志 | 默认值 | 说明 |
|------|--------|------|
| `--config <path>` | `config.json` | 配置文件路径，也可从 `$GOCLAW_CONFIG` 读取 |
| `-v`, `--verbose` | false | 启用调试日志 |
| `--server <url>` | — | HTTP 类命令（traces、skills 等）的网关服务器 URL 覆盖。回退到 `$GOCLAW_SERVER`，再回退到 `$GOCLAW_GATEWAY_URL` |
| `--token <token>` | — | 网关 bearer token 覆盖。回退到 `$GOCLAW_GATEWAY_TOKEN` |

---

## Gateway（默认）

不带子命令运行 `goclaw` 即启动网关。

```bash
./goclaw
source .env.local && ./goclaw          # 加载密钥后运行
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

首次运行（无配置文件）时，设置向导自动启动。

`gateway` 命令被拆分为多个专注文件以便于维护：

| 文件 | 职责 |
|------|------|
| `gateway_deps.go` | 依赖注入与初始化 |
| `gateway_http_wiring.go` | HTTP 服务器设置与路由注册 |
| `gateway_events.go` | 事件总线连接 |
| `gateway_lifecycle.go` | 启动、关闭与信号处理 |
| `gateway_tools_wiring.go` | 工具注册与执行工作区设置 |
| `gateway_providers.go` | 从配置和数据库注册 provider |
| `gateway_vault_wiring.go` | Vault 和内存存储连接 |
| `gateway_evolution_cron.go` | 定时 evolution 和后台 cron 任务 |

---

## `version`

打印版本和协议号。

```bash
goclaw version
# goclaw v1.2.0 (protocol 3)
```

---

## `onboard`

交互式设置向导——配置 provider、模型、网关端口、channel、功能和数据库。

```bash
goclaw onboard
```

步骤：
1. AI provider + API key（OpenRouter、Anthropic、OpenAI、Groq、DeepSeek、Gemini、Mistral、xAI、MiniMax、Cohere、Perplexity、Claude CLI、Custom）
2. 网关端口（默认：18790）
3. Channels（Telegram、Zalo OA、Feishu/Lark）
4. 功能（memory、浏览器自动化）
5. TTS provider
6. PostgreSQL DSN

保存 `config.json`（不含密钥）和 `.env.local`（仅含密钥）。

**基于环境变量的自动 onboard**——若已设置必要的环境变量，向导将被跳过，设置以非交互方式运行（适用于 Docker/CI）。

终端支持时可使用 TUI 版本的 onboard（`tui_onboard.go`），不支持时自动回退到普通交互模式。

---

## `agent`

管理 agent——添加、列出、删除和聊天。

### `agent list`

列出所有已配置的 agent。

```bash
goclaw agent list
goclaw agent list --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

### `agent add`

交互式向导添加新 agent。

```bash
goclaw agent add
```

提示输入：agent 名称、显示名称、provider（或继承）、模型（或继承）、工作区目录。保存到 `config.json`。重启网关后生效。

### `agent delete`

从配置中删除 agent。

```bash
goclaw agent delete <agent-id>
goclaw agent delete researcher --force
```

| 标志 | 说明 |
|------|------|
| `--force` | 跳过确认提示 |

同时删除引用该已删除 agent 的绑定关系。

### `agent chat`

通过运行中的网关向 agent 发送单次消息。

```bash
goclaw agent chat "What files are in the workspace?"
goclaw agent chat --agent researcher "Summarize today's news"
goclaw agent chat --session my-session "Continue where we left off"
```

| 标志 | 默认值 | 说明 |
|------|--------|------|
| `--agent <id>` | `default` | 目标 agent ID |
| `--session <key>` | 自动 | 要恢复的 session key |
| `--json` | false | 以 JSON 格式输出响应 |

---

## `migrate`

数据库迁移管理。所有子命令需要 `GOCLAW_POSTGRES_DSN`。

```bash
goclaw migrate [--migrations-dir <path>] <subcommand>
```

| 标志 | 说明 |
|------|------|
| `--migrations-dir <path>` | 迁移目录路径（默认：`./migrations`） |

### `migrate up`

应用所有待处理的迁移。

```bash
goclaw migrate up
```

SQL 迁移后，运行待处理的 Go 数据钩子。

### `migrate down`

回滚迁移。

```bash
goclaw migrate down           # 回滚 1 步
goclaw migrate down -n 3      # 回滚 3 步
```

| 标志 | 默认值 | 说明 |
|------|--------|------|
| `-n`, `--steps <n>` | 1 | 回滚步数 |

### `migrate version`

显示当前迁移版本。

```bash
goclaw migrate version
# version: 10, dirty: false
```

### `migrate force <version>`

强制设置迁移版本而不应用 SQL（手动修复后使用）。

```bash
goclaw migrate force 9
```

### `migrate goto <version>`

迁移到特定版本（向上或向下）。

```bash
goclaw migrate goto 5
```

### `migrate drop`

**危险操作。** 删除所有表。

```bash
goclaw migrate drop
```

---

## `upgrade`

升级数据库 schema 并运行数据迁移。幂等操作——可安全多次运行。

```bash
goclaw upgrade
goclaw upgrade --dry-run    # 预览而不应用
goclaw upgrade --status     # 显示当前升级状态
```

| 标志 | 说明 |
|------|------|
| `--dry-run` | 显示将要做的操作但不应用 |
| `--status` | 显示当前 schema 版本和待处理钩子 |

网关启动也会检查 schema 兼容性。设置 `GOCLAW_AUTO_UPGRADE=true` 可在启动时自动升级。

---

## `backup`

将 GoClaw 数据库和配置备份到归档文件。

```bash
goclaw backup
goclaw backup --output /path/to/backup.tar.gz
```

| 标志 | 说明 |
|------|------|
| `--output <path>` | 输出归档路径（默认：当前目录下带时间戳的文件） |

---

## `restore`

从备份归档中恢复。

```bash
goclaw restore /path/to/backup.tar.gz
```

---

## `tenant_backup`

备份单个租户的数据。

```bash
goclaw tenant_backup --tenant <tenant-id>
goclaw tenant_backup --tenant <tenant-id> --output /path/to/backup.tar.gz
```

---

## `tenant_restore`

从备份归档中恢复单个租户。

```bash
goclaw tenant_restore --tenant <tenant-id> /path/to/backup.tar.gz
```

---

## `doctor`

检查系统环境和配置健康状态。

```bash
goclaw doctor
```

检查项：二进制版本、配置文件、数据库连接、schema 版本、provider、channel、外部二进制文件（docker、curl、git）、工作区目录。打印每项检查的通过/失败摘要。

`display_name` 为空的 provider 行现在显示规范的 `name`，不再渲染空行。

---

## `pairing`

管理设备配对——审批、列出和撤销已配对设备。

### `pairing list`

列出待处理的配对请求和已配对设备。

```bash
goclaw pairing list
```

### `pairing approve [code]`

审批配对码，未提供时交互式选择。

```bash
goclaw pairing approve              # 交互式选择
goclaw pairing approve ABCD1234    # 审批特定码
```

### `pairing revoke <channel> <senderId>`

撤销已配对设备。

```bash
goclaw pairing revoke telegram 123456789
```

---

## `sessions`

查看和管理聊天 session。需要网关运行中。

### `sessions list`

列出所有 session。

```bash
goclaw sessions list
goclaw sessions list --agent researcher
goclaw sessions list --json
```

| 标志 | 说明 |
|------|------|
| `--agent <id>` | 按 agent ID 过滤 |
| `--json` | 以 JSON 格式输出 |

### `sessions delete <key>`

删除 session。

```bash
goclaw sessions delete "telegram:123456789"
```

### `sessions reset <key>`

清除 session 历史记录同时保留 session 记录。

```bash
goclaw sessions reset "telegram:123456789"
```

---

## `traces`

通过运行中的网关检查 agent 执行 trace 和运行时间线。所有 `traces` 子命令均为 HTTP 类——它们连接由 `--server` / `$GOCLAW_SERVER` / `$GOCLAW_GATEWAY_URL` 解析出的网关，并用 `--token` / `$GOCLAW_GATEWAY_TOKEN` 进行认证。

| 持久标志 | 默认值 | 说明 |
|------|--------|------|
| `-o`, `--output <table\|json>` | `table` | 输出格式 |

```bash
goclaw traces list --status error --limit 20
goclaw traces get <trace-id> -o json
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces timeline <trace-id>
# 远程网关：
goclaw --server https://goclaw.example.com --token "$GOCLAW_GATEWAY_TOKEN" traces get <trace-id> -o json
```

### `traces list`

带过滤和全文搜索列出 trace。

```bash
goclaw traces list
goclaw traces list -q "payment" --has-tool-calls true --limit 50
```

| 标志 | 说明 |
|------|------|
| `-q`, `--query <text>` | 搜索 trace 文本、ID、标签和 span 预览 |
| `--agent-id <uuid>` | 按 agent UUID 过滤 |
| `--user <id>` | 按用户 ID 过滤（管理员调用方） |
| `--session <key>` | 按 session key 过滤 |
| `--status <status>` | 按 trace 状态过滤（`running`、`completed`、`error`、`cancelled`） |
| `--channel <channel>` | 按原始 channel 过滤 |
| `--agent <text>` | 搜索 agent 显示名称或 key |
| `--channel-query <text>` | 搜索 channel 实例标签 |
| `--tool <name>` | 搜索 span 工具名称 |
| `--from <rfc3339>` | 开始时间下界（含） |
| `--to <rfc3339>` | 开始时间上界（不含） |
| `--since <rfc3339>` | `--from` 的别名 |
| `--until <rfc3339>` | `--to` 的别名 |
| `--has-tool-calls <true\|false>` | 仅显示有/无工具调用的 trace |
| `--min-input-tokens <n>` | 最小输入 token 数 |
| `--max-input-tokens <n>` | 最大输入 token 数 |
| `--min-output-tokens <n>` | 最小输出 token 数 |
| `--max-output-tokens <n>` | 最大输出 token 数 |
| `--min-tool-calls <n>` | 最小工具调用次数 |
| `--max-tool-calls <n>` | 最大工具调用次数 |
| `--limit <n>` | 每页大小（最大 200） |
| `--offset <n>` | 分页偏移量 |

### `traces get <trace-id>`

获取带 span 的 trace 详情。只接受一个 trace ID。

```bash
goclaw traces get <trace-id>
goclaw traces get <trace-id> -o json
```

### `traces export <trace-id>`

导出 gzip 压缩的 trace 树。只接受一个 trace ID。

```bash
goclaw traces export <trace-id>                 # 写入 trace-<short>-<YYYYMMDD>.json.gz
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces export <trace-id> --file -        # gzip 输出到 stdout
goclaw traces export <trace-id> -o json         # 解压后的 JSON 输出到 stdout
```

| 标志 | 说明 |
|------|------|
| `--file <path>` | 将 gzip 导出写入文件（使用 `-` 表示 stdout）。默认写入 `trace-<short>-<YYYYMMDD>.json.gz` |

### `traces follow`

轮询单个 session 或 agent 的 trace 变更。**需要 `--session` 或 `--agent-id`。**

```bash
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces follow --agent-id <uuid> --include-spans
```

| 标志 | 说明 |
|------|------|
| `--session <key>` | 按 session key 过滤 |
| `--agent-id <uuid>` | 按 agent UUID 过滤 |
| `--user <id>` | 按用户 ID 过滤（管理员调用方） |
| `--status <status>` | 按 trace 状态过滤 |
| `--channel <channel>` | 按原始 channel 过滤 |
| `--since <rfc3339>` | 变更 trace 的 RFC3339 下界 |
| `--limit <n>` | 每页大小（最大 200） |
| `--include-spans` | 包含按 trace ID 分组的 span |

### `traces timeline <trace-id>`

显示与 trace 关联的已持久化运行时间线。解析 trace 的 `run_id`，然后查询运行归档。只接受一个 trace ID。

```bash
goclaw traces timeline <trace-id>
goclaw traces timeline <trace-id> --limit 100 --offset 0
```

| 标志 | 说明 |
|------|------|
| `--limit <n>` | 每页大小（最大 500） |
| `--offset <n>` | 分页偏移量 |

---

## `cron`

管理定时 cron 任务。需要网关运行中。

### `cron list`

列出 cron 任务。

```bash
goclaw cron list
goclaw cron list --all      # 包含已禁用的任务
goclaw cron list --json
```

| 标志 | 说明 |
|------|------|
| `--all` | 包含已禁用的任务 |
| `--json` | 以 JSON 格式输出 |

### `cron delete <jobId>`

删除 cron 任务。

```bash
goclaw cron delete 3f5a8c2b
```

### `cron toggle <jobId> <true|false>`

启用或禁用 cron 任务。

```bash
goclaw cron toggle 3f5a8c2b true
goclaw cron toggle 3f5a8c2b false
```

---

## `config`

查看和管理配置。

### `config show`

显示当前配置，密钥已脱敏。

```bash
goclaw config show
```

### `config path`

打印正在使用的配置文件路径。

```bash
goclaw config path
# /home/user/goclaw/config.json
```

### `config validate`

验证配置文件语法和结构。

```bash
goclaw config validate
# Config at config.json is valid.
```

---

## `channels`

列出和管理消息 channel。

### `channels list`

列出已配置的 channel 及其状态。

```bash
goclaw channels list
goclaw channels list --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

输出列：`CHANNEL`、`ENABLED`、`CREDENTIALS`（ok/missing）。

---

## `providers`

管理 LLM provider（需要 gateway 正在运行）。

### `providers list`

列出已配置的 provider。

```bash
goclaw providers list
goclaw providers list --json
goclaw providers list --models
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |
| `--models` | 同时显示每个 provider 的可用模型 |

显示 provider 名称、类型、启用状态以及 API key 是否已配置。

### `providers add`

添加新 provider（交互式）。

```bash
goclaw providers add
```

交互式提示：provider 类型、名称、API key、base URL。创建后询问是否验证连通性。

### `providers update <id>`

更新 provider 名称或 API key。

```bash
goclaw providers update <id>
```

### `providers delete <id>`

删除 provider。

```bash
goclaw providers delete <id>
goclaw providers delete <id> --force
```

| 标志 | 说明 |
|------|------|
| `--force` | 跳过确认提示 |

### `providers verify <id>`

验证 provider 连通性或指定模型。

```bash
goclaw providers verify <id>
goclaw providers verify <id> --model anthropic/claude-sonnet-4
```

| 标志 | 说明 |
|------|------|
| `--model <alias>` | 要验证的 model alias（省略则执行连通性 ping） |

不带 `--model`：ping provider（检查已注册且可达）——不发起 LLM 调用。
带 `--model`：发送小型 chat request 以验证 model alias。

---

## `skills`

列出和检查技能。

**存储目录**（按顺序搜索）：

1. `{workspace}/skills/` — agent 专属技能（per-agent 工作区，基于文件）
2. `~/.goclaw/skills/` — 所有 agent 共享的全局技能（基于文件）
3. `~/.goclaw/skills-store/` — 通过 API/控制台上传的托管技能（文件内容存储于此，元数据在 PostgreSQL 中）

### `skills list`

列出所有可用技能。

```bash
goclaw skills list
goclaw skills list --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

### `skills show <name>`

显示特定技能的内容和元数据。

```bash
goclaw skills show sequential-thinking
```

> 以下子命令为 HTTP 类（需要网关运行中）。`<skill>` 参数接受技能 ID、slug 或名称——由网关进行解析。

### `skills evolve`

管理每个技能的自演化设置。

```bash
goclaw skills evolve status <skill>
goclaw skills evolve enable <skill>
goclaw skills evolve disable <skill>
goclaw skills evolve mode <skill> suggest_only
goclaw skills evolve mode <skill> auto_analyze
```

| 命令 | 参数 | 效果 |
|------|------|------|
| `skills evolve status <skill>` | 1 | 显示自演化设置 |
| `skills evolve enable <skill>` | 1 | 启用自演化 |
| `skills evolve disable <skill>` | 1 | 禁用自演化 |
| `skills evolve mode <skill> <suggest_only\|auto_analyze>` | 2 | 设置演化模式 |

### `skills metrics <skill>`

显示技能记录的使用指标（Total、Started、Succeeded、Failed、Abandoned、Success rate）。

```bash
goclaw skills metrics <skill>
goclaw skills metrics <skill> --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

### `skills activity <skill>`

显示技能近期的自演化活动（管理员限定的详情）。

```bash
goclaw skills activity <skill>
goclaw skills activity <skill> --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

### `skills suggestions`

管理技能改进建议。

```bash
goclaw skills suggestions list <skill>
goclaw skills suggestions approve <skill> <suggestion-id>
goclaw skills suggestions reject <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id> --approve
```

| 命令 | 参数 / 标志 | 效果 |
|------|------|------|
| `skills suggestions list <skill>` | 1 | 列出技能的建议 |
| `skills suggestions approve <skill> <suggestion-id>` | 2 | 批准建议 |
| `skills suggestions reject <skill> <suggestion-id>` | 2 | 拒绝建议 |
| `skills suggestions apply <skill> <suggestion-id>` | 2, `--approve` | 应用已批准的建议（`--approve` 会先批准待处理的建议） |

### `skills deps`

扫描、检查和安装技能依赖。参数接受本地技能路径或网关技能 ID。

```bash
goclaw skills deps status <skill-id-or-path>
goclaw skills deps scan <skill-id-or-path>
goclaw skills deps check <skill-id-or-path>
goclaw skills deps install <skill-id>
```

| 命令 | 参数 / 标志 | 效果 |
|------|------|------|
| `skills deps status <skill-id-or-path>` | 1, `--json` | 显示依赖状态 |
| `skills deps scan <skill-id-or-path>` | 1, `--json` | 扫描依赖声明 |
| `skills deps check <skill-id-or-path>` | 1, `--json` | 检查可用性 |
| `skills deps install <skill-id>` | 1, `--json` | 安装缺失的依赖（master 租户） |

### `skills access`

管理技能访问模式和有效访问权限。

```bash
goclaw skills access get <skill-id>
goclaw skills access set <skill-id> --mode internal
goclaw skills access effective <skill-id> --agent <agent-id> --user <user-id>
goclaw skills access effective --agent <agent-id> --user <user-id>
```

| 命令 | 参数 / 标志 | 效果 |
|------|------|------|
| `skills access get <skill-id>` | 1, `--json` | 显示访问模式和授权 |
| `skills access set <skill-id> --mode <private\|internal\|public>` | 1, `--mode`（必填）, `--json` | 设置访问模式 |
| `skills access effective [skill-id] --agent <id> --user <id>` | 0–1, `--agent`+`--user`（必填）, `--json` | 检查有效访问权限（提供 ID 时为单个技能，否则跨技能） |

### `skills grant`

向 agent 或用户授予技能访问权限。

```bash
goclaw skills grant agent <skill-id> <agent-id>
goclaw skills grant agent <skill-id> <agent-id> --can-manage --pinned-version 3
goclaw skills grant user <skill-id> <user-id>
```

| 命令 | 参数 / 标志 | 效果 |
|------|------|------|
| `skills grant agent <skill-id> <agent-id>` | 2, `--can-manage`, `--pinned-version <n>`, `--json` | 向 agent 授予技能 |
| `skills grant user <skill-id> <user-id>` | 2, `--json` | 向用户授予技能 |

### `skills revoke`

从 agent 或用户撤销技能访问权限。

```bash
goclaw skills revoke agent <skill-id> <agent-id>
goclaw skills revoke user <skill-id> <user-id>
```

| 命令 | 参数 | 效果 |
|------|------|------|
| `skills revoke agent <skill-id> <agent-id>` | 2 | 撤销 agent 授权 |
| `skills revoke user <skill-id> <user-id>` | 2 | 撤销用户授权 |

---

## `models`

列出已配置的 AI 模型和 provider。

### `models list`

```bash
goclaw models list
goclaw models list --json
```

| 标志 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |

显示默认模型、per-agent 覆盖以及哪些 provider 已配置 API key。

---

## `auth`

管理 LLM provider 的 OAuth 认证。需要网关运行中。

### `auth status`

显示 OAuth 认证状态（当前：OpenAI OAuth）。

```bash
goclaw auth status
```

使用 `GOCLAW_GATEWAY_URL`、`GOCLAW_HOST`、`GOCLAW_PORT` 和 `GOCLAW_TOKEN` 环境变量连接。

### `auth logout [provider]`

删除已存储的 OAuth token。

```bash
goclaw auth logout          # 删除 OpenAI OAuth token
goclaw auth logout openai
```

---

## `setup` 命令

各组件的引导式设置向导。每个命令交互运行并写入 `config.json`。

### `setup agent`

交互式添加或重新配置 agent。

```bash
goclaw setup agent
```

### `setup channel`

配置消息 channel（Telegram、Zalo OA、Feishu/Lark 等）。

```bash
goclaw setup channel
```

### `setup provider`

添加或重新配置 LLM provider。

```bash
goclaw setup provider
```

### `setup`（通用）

运行完整设置流程（相当于已有安装的 `onboard`）。

```bash
goclaw setup
```

---

## TUI 命令

设置和 onboard 流程的终端 UI 版本。终端支持交互式 TUI 渲染时可用，不支持的终端自动回退到普通 CLI。

```bash
goclaw tui           # 启动 TUI 应用
goclaw tui onboard   # TUI 版 onboard 向导
goclaw tui setup     # TUI 版设置向导
```

## `bitrix-portal`

直接在数据库中管理 Bitrix24 portal 行（仅 PostgreSQL）。GoClaw 要求在 operator 运行 `/bitrix24/install` 的 OAuth 安装流程之前，`bitrix_portals` 行必须已存在；此命令无需原始 SQL 访问即可创建和维护该行。

> Credential 使用 `GOCLAW_ENCRYPTION_KEY` 加密存储。若未设置该密钥，命令会发出警告并以未加密形式存储 credential。

### `bitrix-portal create`

创建带 OAuth credential 的 `bitrix_portals` 行。

```bash
goclaw bitrix-portal create \
  --tenant-id <uuid> \
  --name <portal> \
  --domain tamgiac.bitrix24.com \
  --client-id <client_id> \
  --client-secret <client_secret>
```

| Flag | 描述 |
|------|------|
| `--tenant-id` | 此 portal 所属的 tenant UUID（必填） |
| `--name` | 简短的 portal 名称，被 `channel_instance.config.portal` 引用（必填） |
| `--domain` | Bitrix24 portal 主机，如 `tamgiac.bitrix24.com`（必填） |
| `--client-id` | Bitrix24 应用的 `client_id` / `application_id`（必填） |
| `--client-secret` | Bitrix24 应用的 `client_secret` / application key（必填） |

### `bitrix-portal list`

列出 `bitrix_portals` 行，可选地限定到单个 tenant。

```bash
goclaw bitrix-portal list
goclaw bitrix-portal list --tenant-id <uuid>
```

| Flag | 描述 |
|------|------|
| `--tenant-id` | 过滤到单个 tenant UUID（可选） |

### `bitrix-portal update-credentials`

替换现有 portal 行上的 `client_id`/`client_secret`。在轮换 client secret 或从本地应用迁移到 marketplace 应用时使用。OAuth state token 默认被清除，因为用旧 credential 生成的 state 无法在新 credential 下刷新。

```bash
goclaw bitrix-portal update-credentials \
  --tenant-id <uuid> --name <portal> \
  --client-id <client_id> --client-secret <client_secret>
```

| Flag | 描述 |
|------|------|
| `--tenant-id` | 此 portal 所属的 tenant UUID（必填） |
| `--name` | 要更新的 portal 名称（必填） |
| `--client-id` | Bitrix24 应用的新 `client_id`（必填） |
| `--client-secret` | Bitrix24 应用的新 `client_secret`（必填） |
| `--keep-state` | 保留现有 OAuth state token（仅在轮换同一应用的 secret 时安全） |

### `bitrix-portal set-public-url`

回填用于注册 Bitrix24 imbot event handler 的网关公共 URL。一次性操作，适用于在自动公共 URL 捕获机制出现之前安装的 portal。

```bash
goclaw bitrix-portal set-public-url \
  --tenant-id <uuid> --name <portal> \
  --url https://goclaw.example.com
```

| Flag | 描述 |
|------|------|
| `--tenant-id` | 此 portal 所属的 tenant UUID（必填） |
| `--name` | portal 名称（必填） |
| `--url` | 网关公共 URL，如 `https://goclaw.example.com`（必填） |

---

## 下一步

- [WebSocket 协议](/websocket-protocol) — 网关 wire 协议参考
- [REST API](/rest-api) — HTTP API 端点列表
- [配置参考](/config-reference) — 完整 `config.json` schema

<!-- goclaw-source: fabe86b3 | 更新: 2026-06-28 -->
