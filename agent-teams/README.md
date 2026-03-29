# Agent Teams Documentation

Agent teams enable multi-agent collaboration with a shared task board, mailbox, and coordinated delegation system.

## Quick Navigation

1. **[What Are Agent Teams?](/teams-what-are-teams)** (82 lines)
   - Team model overview
   - Key design principles
   - Real-world example
   - Comparison with other delegation models

2. **[Creating & Managing Teams](/teams-creating)** (169 lines)
   - Create teams via API/CLI/Dashboard
   - Auto-delegation link creation
   - Manage membership
   - Team settings and access control
   - TEAM.md injection

3. **[Task Board](/teams-task-board)** (218 lines)
   - Task lifecycle and states
   - Core `team_tasks` tool actions
   - Create, claim, complete, cancel
   - Task dependencies and auto-unblock
   - Pagination and user scoping

4. **[Team Messaging](/teams-messaging)** (156 lines)
   - `team_message` tool actions
   - Direct messages and broadcasts
   - Message routing via bus
   - Event broadcasting
   - Best practices

5. **[Delegation & Handoff](/teams-delegation)** (297 lines)
   - Mandatory task linking
   - Sync vs async delegation
   - Parallel batching
   - Delegation search (hybrid FTS + semantic)
   - Handoff for conversation transfer
   - Evaluate loop pattern
   - Access control and concurrency limits

## Key Concepts

**Lead Agent**: Orchestrates work, creates tasks, delegates to members, synthesizes results. Receives `TEAM.md` with full instructions.

**Member Agents**: Execute delegated work, claim tasks, report results. Access context via tools.

**Task Board**: Shared work tracker with priorities, dependencies, and lifecycle tracking.

**Mailbox**: Direct messages, broadcasts, real-time delivery via message bus.

**Delegation**: Parent spawns work on child agents with mandatory task linking.

**Handoff**: Transfer conversation control without interrupting user session.

## Tool Reference

| Tool | Actions | Users |
|------|---------|-------|
| `team_tasks` | list, get, create, claim, complete, cancel, search | All team members |
| `team_message` | send, broadcast, read | All team members |
| `spawn` | (action implicit) | Lead only |
| `handoff` | transfer, clear | Any agent |
| `delegate_search` | (action implicit) | Agents with many targets |

## Implementation Files

GoClaw source files (read-only reference):

- `internal/tools/team_tool_manager.go` - Shared backend
- `internal/tools/team_tasks_tool.go` - Task board tool
- `internal/tools/team_message_tool.go` - Mailbox tool
- `internal/tools/delegate*.go` - Delegation system
- `internal/tools/handoff_tool.go` - Handoff tool
- `internal/store/pg/teams.go` - PostgreSQL implementation

## Getting Started

1. Start with [What Are Agent Teams?](/teams-what-are-teams) for conceptual overview
2. Read [Creating & Managing Teams](/teams-creating) to set up your first team
3. Learn [Task Board](/teams-task-board) to create and manage work
4. Read [Team Messaging](/teams-messaging) for communication patterns
5. Master [Delegation & Handoff](/teams-delegation) for work distribution

## Common Workflows

### Parallel Research (3 agents)
1. Lead creates 3 tasks
2. Delegates to analyst, researcher, writer in parallel
3. Results auto-announced together
4. Lead synthesizes and responds

### Iterative Review (2 agents)
1. Lead creates task for generator
2. Waits for result
3. Creates second task for reviewer with generator's output
4. Reviews feedback
5. Loops back if needed

### Conversation Handoff
1. User asks specialist question
2. Current agent recognizes expertise gap
3. Uses `handoff` to transfer to specialist
4. Specialist continues naturally
5. User doesn't notice the switch

## Design Philosophy

- **Lead-centric**: Only lead gets full TEAM.md; members are kept lean
- **Mandatory tracking**: Every delegation links to a task
- **Auto-completion**: No manual state management
- **Parallel batching**: Efficient result aggregation
- **Fail-open**: Access control defaults to open if malformed
