# Tools Overview

> The 36 built-in tools agents can use, organized by category.

## Overview

Tools are how agents interact with the world beyond generating text. An agent can search the web, read files, run code, query memory, delegate to other agents, and more. GoClaw includes 36 tools across 13 categories, plus support for custom tools and MCP servers.

## Tool Categories

| Category | Tools | What They Do |
|----------|-------|-------------|
| **Filesystem** | read_file, write_file, list_files, edit | Read, write, list, and edit files |
| **Runtime** | exec | Execute shell commands |
| **Web** | web_search, web_fetch | Search and fetch web content |
| **Memory** | memory_search, memory_get, knowledge_graph_search | Search and retrieve from memory/KG |
| **Media** | read_image, read_document, read_audio, read_video, create_image, create_audio, create_video, tts | Analyze and generate media |
| **Browser** | browser | Browser automation |
| **Sessions** | sessions_list, session_status, sessions_history, sessions_send | Manage chat sessions |
| **Messaging** | message | Send proactive messages |
| **Scheduling** | cron | Schedule recurring tasks |
| **Subagents** | spawn | Spawn subagents or delegate |
| **Skills** | skill_search, use_skill, publish_skill | Discover and use skills |
| **Delegation** | delegate_search, evaluate_loop, handoff | Delegate to linked agents |
| **Teams** | team_tasks, team_message, workspace_write, workspace_read | Team collaboration |

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
