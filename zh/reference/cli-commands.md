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

---

## 下一步

- [WebSocket 协议](/websocket-protocol) — 网关 wire 协议参考
- [REST API](/rest-api) — HTTP API 端点列表
- [配置参考](/config-reference) — 完整 `config.json` schema

<!-- goclaw-source: 364d2d34 | 更新: 2026-04-29 -->
