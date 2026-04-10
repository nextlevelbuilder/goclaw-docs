> 翻译自 [English version](/provider-claude-cli)

# Claude CLI

将 Claude Code（`claude` CLI 二进制文件）作为 GoClaw provider 运行——通过 Anthropic 的 Claude 订阅为 agent 提供完整的 agentic 工具调用能力。

## 概述

Claude CLI provider 与 GoClaw 中的其他 provider 截然不同。它不发送 HTTP 请求到 API，而是调用安装在本机的 `claude` 二进制文件。GoClaw 将用户消息转发给 CLI，CLI 负责管理其余一切：会话历史、工具执行（Bash、文件编辑、网络搜索等）、MCP 集成和上下文。

这意味着 agent 可以运行真实的终端命令、编辑文件、浏览网页、使用任何 MCP server——全部通过现有的 Claude 订阅，无需 API key。

**架构概述：**

```
用户消息 → GoClaw → claude CLI（子进程）
                          ↓
               CLI 管理：会话、工具、MCP、上下文
                          ↓
               流式输出回传 → GoClaw → 用户
```

## 前提条件

1. 安装 Claude CLI：参考 [Anthropic 安装指南](https://docs.anthropic.com/en/docs/claude-code/getting-started)
2. 登录 Claude 订阅：运行 `claude` 一次并完成授权流程
3. 验证可用：`claude -p "Hello" --output-format json`

## 配置

在 `config.json` 中配置 CLI provider：

```json
{
  "providers": {
    "claude_cli": {
      "cli_path": "claude",
      "model": "sonnet",
      "base_work_dir": "~/.goclaw/cli-workspaces",
      "perm_mode": "bypassPermissions"
    }
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "sonnet"
    }
  }
}
```

所有字段均可选——默认值适用于大多数场景：

| 字段 | 默认值 | 说明 |
|---|---|---|
| `cli_path` | `"claude"` | `claude` 二进制文件路径（若不在 `$PATH` 中，使用完整路径） |
| `model` | `"sonnet"` | 模型别名：`sonnet`、`opus` 或 `haiku` |
| `base_work_dir` | `~/.goclaw/cli-workspaces` | 每个会话工作区的基础目录 |
| `perm_mode` | `"bypassPermissions"` | CLI 权限模式（见下文） |

## 模型

Claude CLI 使用模型别名而非完整模型 ID：

| 别名 | 对应 |
|---|---|
| `sonnet` | 最新 Claude Sonnet |
| `opus` | 最新 Claude Opus |
| `haiku` | 最新 Claude Haiku |

此 provider 不能使用完整模型 ID（如 `claude-sonnet-4-5`）。GoClaw 会验证别名，若无法识别则返回错误。

## 会话隔离

每个 GoClaw 会话在 `base_work_dir` 下获得独立的工作区目录。GoClaw 从会话 key 派生确定性 UUID，以便 CLI 使用 `--resume` 跨重启恢复同一对话。

会话文件由 CLI 存储于 `~/.claude/projects/<encoded-workdir>/<session-id>.jsonl`。GoClaw 在每次请求开始时检查该文件：若存在则传入 `--resume`；否则传入 `--session-id` 以开始新会话。

同一会话的并发请求通过每会话 mutex 串行化——CLI 每次只能处理一个会话请求。

## 系统提示

GoClaw 将 agent 的系统提示写入会话工作区中的 `CLAUDE.md` 文件。CLI 在每次运行时自动读取该文件，包括恢复的会话。若内容未变更，GoClaw 跳过写入以避免不必要的磁盘 I/O。

## 权限模式

默认权限模式为 `bypassPermissions`，允许 CLI 无需确认地运行工具，适合服务端 agent 使用。可以修改：

```json
{
  "providers": {
    "claude_cli": {
      "perm_mode": "default"
    }
  }
}
```

可用模式：`bypassPermissions`（默认）、`default`、`acceptEdits`。

## 安全钩子

GoClaw 可向 CLI 注入安全钩子，以强制执行 shell 拒绝模式和工作区路径限制。在 agent 配置（而非 provider 配置）中启用。钩子写入临时配置文件，并通过 `--settings` 传递给 CLI。

## MCP 配置透传

若在 GoClaw 中配置了 MCP server，provider 会构建 MCP 配置文件并通过 `--mcp-config` 传递给 CLI。当 MCP 配置存在时，GoClaw 禁用 CLI 的内置工具（Bash、Edit、Read、Write 等），所有工具执行均通过 GoClaw 受控的 MCP 桥接路由。

## 禁用内置工具

在选项中设置 `disable_tools: true` 以禁用所有 CLI 工具。适用于纯文本生成任务，不希望 CLI 运行任何命令：

```json
{
  "options": {
    "disable_tools": true
  }
}
```

## 调试

启用调试日志以捕获原始 CLI 流输出：

```bash
GOCLAW_DEBUG=1 ./goclaw
```

这会在每个会话的工作区目录中写入 `cli-debug.log` 文件，包含完整的 CLI 命令、所有 stream-json 输出和 stderr。

## 示例

**最简配置——使用 PATH 中的 `claude` 二进制：**

```json
{
  "providers": {
    "claude_cli": {}
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "sonnet"
    }
  }
}
```

**指定完整路径，使用 Opus：**

```json
{
  "providers": {
    "claude_cli": {
      "cli_path": "/usr/local/bin/claude",
      "model": "opus",
      "base_work_dir": "/var/goclaw/workspaces"
    }
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "opus"
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `claude-cli: exec: "claude": executable file not found` | `claude` 不在 `$PATH` 中 | 将 `cli_path` 设为二进制文件的完整路径 |
| `unsupported model "claude-sonnet-4-5"` | 使用了完整模型 ID 而非别名 | 使用 `sonnet`、`opus` 或 `haiku` |
| 会话未恢复 | 会话文件缺失或工作目录已变更 | 检查 `~/.claude/projects/` 中的会话文件；确保 `base_work_dir` 稳定 |
| CLI 交互式询问确认 | `perm_mode` 未设置为 `bypassPermissions` | 在配置中设置 `perm_mode: "bypassPermissions"` |
| 首次响应慢 | CLI 冷启动 + 授权检查 | 首次运行时预期行为；同一会话的后续调用更快 |
| `CLAUDE_*` 环境变量引起冲突 | 嵌套 CLI 会话检测 | GoClaw 在启动子进程前过滤所有 `CLAUDE_*` 环境变量 |

## 下一步

- [Codex / ChatGPT](/provider-codex) — 使用 ChatGPT 订阅的 OAuth provider
- [自定义 Provider](/provider-custom) — 连接任意 OpenAI 兼容 API

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
