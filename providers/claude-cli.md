# Claude CLI

Run Claude Code (the `claude` CLI binary) as a GoClaw provider — giving your agents full agentic tool use powered by Anthropic's Claude subscription.

## Overview

The Claude CLI provider is unlike any other provider in GoClaw. Instead of making HTTP requests to an API, it shells out to the `claude` binary installed on your machine. GoClaw forwards the user's message to the CLI, and the CLI manages everything else: session history, tool execution (Bash, file edits, web search, etc.), MCP integrations, and context.

This means your agent can run real terminal commands, edit files, browse the web, and use any MCP server — all through your existing Claude subscription, with no API key required.

**Architecture summary:**

```
User message → GoClaw → claude CLI (subprocess)
                              ↓
                   CLI manages: session, tools, MCP, context
                              ↓
                   Stream output back → GoClaw → user
```

## Prerequisites

1. Install the Claude CLI: follow [Anthropic's installation guide](https://docs.anthropic.com/en/docs/claude-code/getting-started)
2. Log in to your Claude subscription: run `claude` once and complete the auth flow
3. Verify it works: `claude -p "Hello" --output-format json`

## Setup

Configure the CLI provider in `config.json`:

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

All fields are optional — defaults work for most setups:

| Field | Default | Description |
|---|---|---|
| `cli_path` | `"claude"` | Path to the `claude` binary (use full path if not on `$PATH`) |
| `model` | `"sonnet"` | Model alias: `sonnet`, `opus`, or `haiku` |
| `base_work_dir` | `~/.goclaw/cli-workspaces` | Base directory for per-session workspaces |
| `perm_mode` | `"bypassPermissions"` | CLI permission mode (see below) |

## Models

The Claude CLI uses model aliases, not full model IDs:

| Alias | Maps to |
|---|---|
| `sonnet` | Latest Claude Sonnet |
| `opus` | Latest Claude Opus |
| `haiku` | Latest Claude Haiku |

You cannot use full model IDs (like `claude-sonnet-4-5`) with this provider. GoClaw validates the alias and returns an error if it's unrecognized.

## Session Isolation

Each GoClaw session gets its own isolated workspace directory under `base_work_dir`. GoClaw derives a deterministic UUID from the session key, so the CLI can resume the same conversation across restarts using `--resume`.

Session files are stored by the CLI at `~/.claude/projects/<encoded-workdir>/<session-id>.jsonl`. GoClaw checks for this file at the start of each request: if it exists, it passes `--resume`; otherwise it passes `--session-id` to start fresh.

Concurrent requests to the same session are serialized with a per-session mutex — the CLI can only handle one request per session at a time.

## System Prompt

GoClaw writes the agent's system prompt to a `CLAUDE.md` file in the session workspace. The CLI reads this file automatically on every run, including resumed sessions. GoClaw skips the write if the content hasn't changed to avoid unnecessary disk I/O.

## Permission Mode

The default permission mode is `bypassPermissions`, which lets the CLI run tools without asking for confirmation. This is appropriate for server-side agent use. You can change it:

```json
{
  "providers": {
    "claude_cli": {
      "perm_mode": "default"
    }
  }
}
```

Available modes: `bypassPermissions` (default), `default`, `acceptEdits`.

## Security Hooks

GoClaw can inject security hooks into the CLI to enforce shell deny patterns and workspace path restrictions. Enable this in your agent config (done at the agent level, not the provider config). Hooks are written to a temporary settings file and passed to the CLI via `--settings`.

## MCP Config Passthrough

If you configure MCP servers in GoClaw, the provider builds an MCP config file and passes it to the CLI via `--mcp-config`. When an MCP config is present, GoClaw disables the CLI's built-in tools (Bash, Edit, Read, Write, etc.) so all tool execution routes through GoClaw's controlled MCP bridge.

## Disabling Built-in Tools

Set `disable_tools: true` in the options to disable all CLI tools. This is useful for pure text generation tasks where you don't want the CLI to run any commands:

```json
{
  "options": {
    "disable_tools": true
  }
}
```

## Debugging

Enable debug logging to capture the raw CLI stream output:

```bash
GOCLAW_DEBUG=1 ./goclaw
```

This writes a `cli-debug.log` file in each session's workspace directory with the full CLI command, all stream-json output, and stderr.

## Examples

**Minimal config — use your PATH `claude` binary:**

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

**Full path to binary, using Opus:**

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

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `claude-cli: exec: "claude": executable file not found` | `claude` not on `$PATH` | Set `cli_path` to the full path of the binary |
| `unsupported model "claude-sonnet-4-5"` | Full model ID used instead of alias | Use `sonnet`, `opus`, or `haiku` |
| Session doesn't resume | Session file missing or workdir changed | Check `~/.claude/projects/` for session files; ensure `base_work_dir` is stable |
| CLI asks for confirmation interactively | `perm_mode` not set to `bypassPermissions` | Set `perm_mode: "bypassPermissions"` in config |
| Slow first response | CLI cold start + auth check | Expected on first run; subsequent calls in same session are faster |
| `CLAUDE_*` env vars causing conflicts | Nested CLI session detection | GoClaw filters out all `CLAUDE_*` env vars before spawning the subprocess |

## What's Next

- [Codex / ChatGPT](./codex-chatgpt.md) — OAuth-based provider using your ChatGPT subscription
- [Custom Provider](./custom-provider.md) — connect any OpenAI-compatible API
