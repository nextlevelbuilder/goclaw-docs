> 翻译自 [English version](#cli-commands)

# CLI 命令

> `goclaw` 每个命令、子命令和标志的完整参考。

## 概览

`goclaw` 二进制是一个单可执行文件，用于启动 gateway 并提供管理子命令。全局标志适用于所有命令。

```bash
goclaw [global flags] <command> [subcommand] [flags] [args]
```

**全局标志**

| 标志 | 默认值 | 描述 |
|------|---------|-------------|
| `--config <path>` | `config.json` | 配置文件路径。也可通过 `$GOCLAW_CONFIG` 读取 |
| `-v`, `--verbose` | false | 启用调试日志 |

---

## Gateway（默认）

不带子命令运行 `goclaw` 会启动 gateway。

```bash
./goclaw
source .env.local && ./goclaw          # 加载密钥后运行
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

首次运行（无配置文件）会自动启动设置向导。

---

## `version`

打印版本和协议号。

```bash
goclaw version
# goclaw v1.2.0 (protocol 3)
```

---

## `onboard`

交互式设置向导——配置 provider、模型、gateway 端口、channel、功能和数据库。

```bash
goclaw onboard
```

步骤：
1. AI provider + API key（OpenRouter、Anthropic、OpenAI、Groq、DeepSeek、Gemini、Mistral、xAI、MiniMax、Cohere、Perplexity、Claude CLI、Custom）
2. Gateway 端口（默认：18790）
3. Channel（Telegram、Zalo OA、Feishu/Lark）
4. 功能（记忆、浏览器自动化）
5. TTS provider
6. PostgreSQL DSN

保存 `config.json`（无密钥）和 `.env.local`（仅密钥）。

**基于环境变量的自动 onboard** — 如果所需环境变量已设置，向导被跳过，以非交互方式运行（适用于 Docker/CI）。

---

## `agent`

管理 agent——添加、列出、删除和聊天。

### `agent list`

列出所有已配置的 agent。

```bash
goclaw agent list
goclaw agent list --json
```

| 标志 | 描述 |
|------|-------------|
| `--json` | 以 JSON 格式输出 |

### `agent add`

交互式向导添加新 agent。

```bash
goclaw agent add
```

提示：agent 名称、显示名称、provider（或继承）、模型（或继承）、工作区目录。保存到 `config.json`。重启 gateway 以激活。

### `agent delete`

从配置中删除 agent。

```bash
goclaw agent delete <agent-id>
goclaw agent delete researcher --force
```

| 标志 | 描述 |
|------|-------------|
| `--force` | 跳过确认提示 |

同时删除引用已删除 agent 的绑定。

### `agent chat`

通过运行中的 gateway 向 agent 发送单次消息。

```bash
goclaw agent chat "What files are in the workspace?"
goclaw agent chat --agent researcher "Summarize today's news"
goclaw agent chat --session my-session "Continue where we left off"
```

| 标志 | 默认值 | 描述 |
|------|---------|-------------|
| `--agent <id>` | `default` | 目标 agent ID |
| `--session <key>` | 自动 | 要恢复的会话 key |
| `--json` | false | 以 JSON 格式输出响应 |

---

## `migrate`

数据库迁移管理。所有子命令需要 `GOCLAW_POSTGRES_DSN`。

```bash
goclaw migrate [--migrations-dir <path>] <subcommand>
```

| 标志 | 描述 |
|------|-------------|
| `--migrations-dir <path>` | 迁移目录路径（默认：`./migrations`）|

### `migrate up`

应用所有待执行的迁移。

```bash
goclaw migrate up
```

SQL 迁移后运行待执行的 Go 数据钩子。

### `migrate down`

回滚迁移。

```bash
goclaw migrate down           # 回滚 1 步
goclaw migrate down -n 3      # 回滚 3 步
```

| 标志 | 默认值 | 描述 |
|------|---------|-------------|
| `-n`, `--steps <n>` | 1 | 回滚步数 |

### `migrate version`

显示当前迁移版本。

```bash
goclaw migrate version
# version: 10, dirty: false
```

### `migrate force <version>`

强制设置迁移版本而不执行 SQL（手动修复后使用）。

```bash
goclaw migrate force 9
```

### `migrate goto <version>`

迁移到指定版本（向上或向下）。

```bash
goclaw migrate goto 5
```

### `migrate drop`

**危险。** 删除所有表。

```bash
goclaw migrate drop
```

---

## `upgrade`

升级数据库 schema 并运行数据迁移。幂等——可安全多次运行。

```bash
goclaw upgrade
goclaw upgrade --dry-run    # 预览而不应用
goclaw upgrade --status     # 显示当前升级状态
```

| 标志 | 描述 |
|------|-------------|
| `--dry-run` | 显示将要执行的操作而不应用 |
| `--status` | 显示当前 schema 版本和待执行的钩子 |

Gateway 启动时也会检查 schema 兼容性。设置 `GOCLAW_AUTO_UPGRADE=true` 可在启动时自动升级。

---

## `pairing`

管理设备配对——审批、列出和撤销已配对的设备。

### `pairing list`

列出待处理的配对请求和已配对的设备。

```bash
goclaw pairing list
```

### `pairing approve [code]`

审批配对码。未提供配对码时进行交互式选择。

```bash
goclaw pairing approve              # 交互式选择
goclaw pairing approve ABCD1234    # 审批指定配对码
```

### `pairing revoke <channel> <senderId>`

撤销已配对的设备。

```bash
goclaw pairing revoke telegram 123456789
```

---

## `sessions`

查看和管理聊天会话。需要 gateway 运行中。

### `sessions list`

列出所有会话。

```bash
goclaw sessions list
goclaw sessions list --agent researcher
goclaw sessions list --json
```

| 标志 | 描述 |
|------|-------------|
| `--agent <id>` | 按 agent ID 过滤 |
| `--json` | 以 JSON 格式输出 |

### `sessions delete <key>`

删除会话。

```bash
goclaw sessions delete "telegram:123456789"
```

### `sessions reset <key>`

清除会话历史，保留会话记录。

```bash
goclaw sessions reset "telegram:123456789"
```

---

## `cron`

管理定时 cron 任务。需要 gateway 运行中。

### `cron list`

列出 cron 任务。

```bash
goclaw cron list
goclaw cron list --all      # 包括禁用的任务
goclaw cron list --json
```

| 标志 | 描述 |
|------|-------------|
| `--all` | 包括禁用的任务 |
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

显示当前配置（密钥已脱敏）。

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

验证配置文件的语法和结构。

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

| 标志 | 描述 |
|------|-------------|
| `--json` | 以 JSON 格式输出 |

输出列：`CHANNEL`、`ENABLED`、`CREDENTIALS`（ok/missing）。

---

## `skills`

列出和检查技能。

**存储目录**（按顺序搜索）：

1. `{workspace}/skills/` — agent 特定技能（工作区为每 agent 文件存储）
2. `~/.goclaw/skills/` — 所有 agent 共享的全局技能（文件存储）
3. `~/.goclaw/skills-store/` — 通过 API/仪表盘上传的托管技能（文件内容存储在此，元数据存于 PostgreSQL）

### `skills list`

列出所有可用技能。

```bash
goclaw skills list
goclaw skills list --json
```

| 标志 | 描述 |
|------|-------------|
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

| 标志 | 描述 |
|------|-------------|
| `--json` | 以 JSON 格式输出 |

显示默认模型、每 agent 覆盖设置，以及哪些 provider 已配置 API key。

---

## `doctor`

检查系统环境和配置健康状况。

```bash
goclaw doctor
```

检查内容：二进制版本、配置文件、数据库连接、schema 版本、provider、channel、外部二进制（docker、curl、git）、工作区目录。

---

## `auth`

管理 LLM provider 的 OAuth 认证。需要 gateway 运行中。

### `auth status`

显示 OAuth 认证状态（目前：OpenAI OAuth）。

```bash
goclaw auth status
```

使用 `GOCLAW_GATEWAY_URL`、`GOCLAW_HOST`、`GOCLAW_PORT` 和 `GOCLAW_TOKEN` 环境变量连接。

### `auth logout [provider]`

删除已存储的 OAuth token。

```bash
goclaw auth logout          # 删除 openai OAuth token
goclaw auth logout openai
```

---

## 下一步

- [WebSocket 协议](#websocket-protocol) — gateway 的线协议参考
- [REST API](#rest-api) — HTTP API 端点列表
- [配置参考](#config-reference) — 完整 `config.json` schema

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
