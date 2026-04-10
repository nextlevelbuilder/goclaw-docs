> 翻译自 [English version](/migrating-from-openclaw)

# 从 OpenClaw 迁移

> GoClaw 的变化以及如何迁移你的配置。

## 概述

GoClaw 是 OpenClaw 的多租户演进版本。如果你一直在使用 OpenClaw 作为个人助手，GoClaw 为你提供了团队协作、委托、加密凭证、tracing 和每用户隔离——同时保留了你已熟悉的 agent 概念。

## 为什么迁移？

| 功能 | OpenClaw | GoClaw |
|------|----------|--------|
| 多租户 | 否（单用户） | 是（每用户隔离） |
| Agent 团队 | 子 agent 委托 | 完整团队协作（共享任务板、委托） |
| 凭证存储 | 配置文件明文 | 数据库 AES-256-GCM 加密 |
| 记忆 | SQLite + QMD 语义搜索 | PostgreSQL + SQLite（FTS5 混合搜索） |
| Tracing | 无 | 完整 LLM 调用 trace 含成本追踪 |
| MCP 支持 | 有（通过 mcporter bridge） | 有（stdio、SSE、streamable-http） |
| 自定义工具 | 有（52+ 内置 skills） | 有（通过 dashboard 或 API 定义） |
| 代码沙箱 | 有（基于 Docker） | 有（基于 Docker，支持每 agent 配置） |
| 数据库 | SQLite | PostgreSQL |
| Channel | 6 个核心（Telegram、Discord、Slack、Signal、iMessage、Web）+ 35+ 扩展 channel | 7 个（Telegram、Discord、Slack、WhatsApp、Zalo OA、Zalo Personal、Feishu） |
| Dashboard | 基础 Web UI | 完整管理 dashboard |

## 配置映射

### Agent 配置

| OpenClaw | GoClaw | 说明 |
|----------|--------|------|
| `ai.provider` | `agents.defaults.provider` | provider 名称相同 |
| `ai.model` | `agents.defaults.model` | 模型标识符相同 |
| `ai.maxTokens` | `agents.defaults.max_tokens` | GoClaw 使用 snake_case |
| `ai.temperature` | `agents.defaults.temperature` | 范围相同（0-2） |
| `commands.*` | `tools.*` | tools 取代 commands |

### Channel 设置

Channel 概念相同，但配置格式不同：

**OpenClaw：**
```json
{
  "telegram": {
    "botToken": "123:ABC"
  }
}
```

**GoClaw：**
```jsonc
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "env:TELEGRAM_BOT_TOKEN"
    }
  }
}
```

注意：GoClaw 将 token 存储在环境变量中，而非配置文件。

### 上下文文件

GoClaw 使用上下文文件（与 OpenClaw 概念类似）。每次 session 加载的 6 个核心文件：

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 操作指令和安全规则 |
| `SOUL.md` | Agent 个性和行为 |
| `IDENTITY.md` | 名称、头像、问候语 |
| `USER.md` | 用户档案和偏好 |
| `BOOTSTRAP.md` | 首次运行引导仪式（完成后自动删除） |

> **注意：** `TOOLS.md` 在 GoClaw 中不使用——工具配置通过 Dashboard 管理。请勿迁移此文件。

高级功能的额外上下文文件：

| 文件 | 用途 |
|------|------|
| `MEMORY.md` | 长期精选记忆 |
| `DELEGATION.md` | 子 agent 的委托指令 |
| `TEAM.md` | 团队协调规则 |

GoClaw 支持 agent 级别（共享）和每用户上下文文件覆盖。以上文件名是约定，非强制要求。

**关键区别：** OpenClaw 将这些文件存储在文件系统中。GoClaw 将它们存储在 PostgreSQL 中，并支持每用户范围——同一 agent 的同一上下文文件，每个用户可以有自己的版本。

## 什么可以迁移（什么不能）

| 可迁移 | 不可迁移 |
|--------|----------|
| Agent 配置（provider、模型、工具） | 消息历史（全新开始） |
| 上下文文件（手动上传） | Session 状态 |
| Channel token（通过环境变量） | 用户档案（首次登录时重新创建） |

## 迁移步骤

1. **设置 GoClaw** — 按照[安装](/installation)和[快速开始](/quick-start)指南操作
2. **映射配置** — 使用上面的映射表翻译你的 OpenClaw 配置
3. **迁移上下文文件** — 复制你的 `.md` 上下文文件（排除 `TOOLS.md`——GoClaw 不使用）；通过 dashboard 或 API 上传
4. **更新 channel token** — 将 token 从配置文件移到环境变量
5. **测试** — 验证你的 agent 通过每个 channel 正确响应

> **安全说明：** GoClaw 使用 AES-256-GCM 在数据库中加密所有凭证，比 OpenClaw 的明文配置方式更安全。将 API key 和 token 迁移到 GoClaw 后，它们会被加密存储。

## GoClaw 的新特性

迁移后你获得的新功能：

- **Agent 团队** — 多个 agent 在共享任务板上协作
- **委托** — Agent A 将专项子任务委托给 Agent B
- **多租户** — 每个用户拥有独立的 session、记忆和上下文
- **Trace** — 查看每次 LLM 调用、工具使用和 token 成本
- **自定义工具** — 无需修改 Go 代码即可定义自己的工具
- **MCP 集成** — 连接外部工具服务器
- **Cron 任务** — 调度定期 agent 任务
- **加密凭证** — API key 使用 AES-256-GCM 加密存储

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 上下文文件未加载 | 通过 dashboard 或 API 上传；文件系统路径与 OpenClaw 不同 |
| 响应行为不同 | 检查 `max_tool_iterations`——GoClaw 默认值（20）可能与你的 OpenClaw 设置不同 |
| Channel 缺失 | GoClaw 专注于 7 个核心 channel；部分 OpenClaw channel（IRC、Signal、iMessage、LINE 等）尚未移植 |

## 下一步

- [GoClaw 工作原理](/how-goclaw-works) — 了解新架构
- [多租户](/multi-tenancy) — 了解每用户隔离
- [配置](/configuration) — 完整配置参考

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
