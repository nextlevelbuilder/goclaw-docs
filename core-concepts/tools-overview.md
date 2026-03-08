# Tools Overview

> The 60+ built-in tools agents can use, organized by category.

## Overview

Tools are how agents interact with the world beyond generating text. An agent can search the web, read files, run code, query memory, delegate to other agents, and more. GoClaw includes 60+ tools across 11 categories, plus support for custom tools and MCP servers.

## Tool Categories

| Category | Tools | What They Do |
|----------|-------|-------------|
| **Filesystem** | read_file, write_file, edit_file, list_files, search, glob | Read, write, and search files in the agent workspace |
| **Runtime** | exec, process | Run shell commands and manage processes |
| **Web** | web_search, web_fetch | Search the web (Brave/DuckDuckGo) and fetch pages |
| **Memory** | memory_search, memory_get | Query long-term memory (hybrid vector + FTS search) |
| **Sessions** | sessions_list, sessions_history, sessions_send, spawn, session_status | Manage conversation sessions and spawn subtasks |
| **Delegation** | delegate, delegate_search, evaluate_loop, handoff | Delegate tasks to other agents |
| **Teams** | team_tasks, team_message | Collaborate with agent teams via task boards |
| **UI** | browser, canvas | Browse websites and create visual content |
| **Automation** | cron, gateway | Schedule jobs and manage gateway settings |
| **Messaging** | message, create_forum_topic | Send messages and create forum topics |
| **Other** | skill_search, image, read_image, create_image, tts, nodes, eval | Skills, images, text-to-speech, and more |

## Tool Execution Flow

When an agent calls a tool:

```mermaid
graph LR
    A[Agent calls tool] --> C[Inject context<br/>channel, user, session]
    C --> R[Rate limit check]
    R --> E[Execute tool]
    E --> S[Scrub credentials]
    S --> L[Return to LLM]
```

1. **Context injection** — Channel, chat ID, user ID, and sandbox key are injected
2. **Rate limit** — Per-session rate limiter prevents abuse
3. **Execute** — The tool runs and produces output
4. **Scrub** — Credentials and sensitive data are removed from output
5. **Return** — Clean result goes back to the LLM for the next iteration

## Tool Profiles

Profiles control which tools an agent can access:

| Profile | Available Tools |
|---------|----------------|
| `full` | All tools |
| `coding` | Filesystem, runtime, sessions, memory, web, images, skills |
| `messaging` | Messaging, web, sessions, images, skills |
| `minimal` | session_status only |

Set the profile in agent config:

```jsonc
{
  "agents": {
    "defaults": {
      "tools_profile": "full"
    },
    "list": {
      "readonly-bot": {
        "tools_profile": "messaging"
      }
    }
  }
}
```

## Policy Engine

Beyond profiles, a 7-step policy engine gives fine-grained control:

1. Global profile (base set)
2. Provider-specific profile override
3. Global allow list (intersection)
4. Provider-specific allow override
5. Per-agent allow list
6. Per-agent per-provider allow
7. Group-level allow

After allow lists, **deny lists** remove tools, then **alsoAllow** adds them back (union).

### Example: Restrict an Agent

```jsonc
{
  "agents": {
    "list": {
      "safe-bot": {
        "tools_profile": "full",
        "tools_deny": ["exec", "process", "write_file"],
        "tools_also_allow": ["read_file"]
      }
    }
  }
}
```

## Filesystem Interceptors

Two special interceptors route file operations to the database:

### Context File Interceptor

When an agent reads/writes context files (SOUL.md, IDENTITY.md, TOOLS.md, etc.), the operation is routed to the `user_context_files` table instead of the filesystem. This enables per-user customization and multi-tenant isolation.

### Memory Interceptor

Writes to `MEMORY.md` or `memory/*` are routed to the `memory_documents` table, automatically chunked and embedded for search.

## Shell Safety

The `exec` tool has built-in deny patterns to prevent dangerous commands:

| Category | Blocked Patterns |
|----------|-----------------|
| Destructive | `rm -rf /`, `del /f`, `rmdir /s` |
| Disk | `mkfs`, `dd if=`, `> /dev/sd*` |
| System | `shutdown`, `reboot`, `poweroff` |
| Fork bombs | `:(){ ... };:` |
| RCE | `curl \| sh`, `wget -O - \| sh` |
| Reverse shells | `/dev/tcp/`, `nc -e` |
| Eval | `eval $()`, `base64 -d \| sh` |

The `tools.exec_approval` setting adds an additional approval layer (`full`, `light`, or `none`).

## Custom Tools & MCP

Beyond built-in tools, you can extend agents with:

- **Custom Tools** — Define tools via the dashboard or API with input schemas and handlers
- **MCP Servers** — Connect Model Context Protocol servers for dynamic tool registration

See [Custom Tools](../advanced/custom-tools.md) and [MCP Integration](../advanced/mcp-integration.md) for details.

## Common Issues

| Problem | Solution |
|---------|----------|
| Agent can't use a tool | Check tools_profile and deny lists; verify tool exists for the profile |
| Shell command blocked | Review deny patterns; adjust `exec_approval` level |
| Tool results too large | GoClaw auto-trims results >4,000 chars; consider more specific queries |

## What's Next

- [Memory System](memory-system.md) — How long-term memory and search work
- [Multi-Tenancy](multi-tenancy.md) — Per-user tool access and isolation
- [Custom Tools](../advanced/custom-tools.md) — Build your own tools
