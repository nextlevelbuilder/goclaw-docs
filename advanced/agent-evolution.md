# Agent Evolution

> Let predefined agents refine their communication style and build reusable skills over time — automatically, with your consent.

## Overview

GoClaw includes three subsystems that allow predefined agents to evolve their behavior across conversations. All three are **opt-in** and **restricted to predefined agents** — open agents are not eligible.

| Subsystem | What it does | Config key |
|---|---|---|
| Self-Evolution | Agent refines its own tone and voice via SOUL.md | `self_evolve` |
| Skill Learning Loop | Agent captures reusable workflows as skills | `skill_evolve` |
| Skill Management | Create, patch, delete, and grant skills | `skill_manage` tool |

Both `self_evolve` and `skill_evolve` are disabled by default. Enable them per-agent in **Agent Settings → Config tab**.

---

## Self-Evolution (SOUL.md)

### What it does

When `self_evolve` is enabled, an agent can update its own `SOUL.md` file during conversation to refine how it communicates. There is no dedicated tool for this — the agent uses the standard `write_file` tool. A context file interceptor ensures only `SOUL.md` is writable; `IDENTITY.md` and `AGENTS.md` remain locked regardless.

Changes happen incrementally. The agent is guided to update only when it notices clear patterns in user feedback — not on every turn.

### Enabling it

| Setting | Location | Default |
|---|---|---|
| `self_evolve` | Agent Settings → General tab → Self-Evolution toggle | `false` |

Only shown for predefined agents. The setting is stored as `self_evolve` in `agents.other_config`.

### What the agent can and cannot change

When `self_evolve=true`, GoClaw injects this guidance into the system prompt (~95 tokens per request):

```
## Self-Evolution

You have self-evolution enabled. You may update your SOUL.md file to
refine your communication style over time.

What you CAN evolve in SOUL.md:
- Tone, voice, and manner of speaking
- Response style and formatting preferences
- Vocabulary and phrasing patterns
- Interaction patterns based on user feedback

What you MUST NOT change:
- Your name, identity, or contact information
- Your core purpose or role
- Any content in IDENTITY.md or AGENTS.md (these remain locked)

Make changes incrementally. Only update SOUL.md when you notice clear
patterns in user feedback or interaction style preferences.
```

### Security

| Layer | What it enforces |
|---|---|
| System prompt guidance | CAN/MUST NOT rules limit scope |
| Context file interceptor | Validates that only SOUL.md is written |
| File locking | IDENTITY.md and AGENTS.md are always read-only |

---

## Skill Learning Loop

### What it does

When `skill_evolve` is enabled, GoClaw encourages agents to capture complex multi-step processes as reusable skills. The loop has three touch points:

1. **System prompt guidance** — injected at the start of every request with SHOULD/SHOULD NOT criteria
2. **Budget nudges** — ephemeral reminders injected mid-loop at 70% and 90% of the iteration budget
3. **Postscript suggestion** — appended to the agent's final response when enough tool calls happened; requires explicit user consent

No skill is ever created without the user replying "save as skill". Replying "skip" does nothing.

### Enabling it

| Setting | Location | Default |
|---|---|---|
| `skill_evolve` | Agent Settings → Config tab → Skill Learning toggle | `false` |
| `skill_nudge_interval` | Config tab → interval input | `15` |

`skill_nudge_interval` is the minimum number of tool calls in a run before the postscript fires. Set to `0` to disable postscripts entirely while keeping budget nudges.

Open agents always get `skill_evolve=false` regardless of the database setting — enforcement happens at the resolver level.

### How the loop flows

```
Admin enables skill_evolve
        ↓
System prompt includes Skill Creation guidance (every request)
        ↓
Agent processes request (think → act → observe)
        ↓
  ≥70% iteration budget? → ephemeral nudge (soft suggestion)
  ≥90% iteration budget? → ephemeral nudge (moderate urgency)
        ↓
Agent completes task
        ↓
  totalToolCalls ≥ skill_nudge_interval?
    No  → Normal response
    Yes → Postscript appended: "Save as skill? or skip?"
              ↓
        User replies "skip"        → No action
        User replies "save as skill" → Agent calls skill_manage(create)
                                          ↓
                                      Skill created + auto-granted
                                          ↓
                                      Available on next turn
```

### System prompt guidance

When `skill_evolve=true` and the `skill_manage` tool is registered, GoClaw injects this block (~135 tokens per request):

```
### Skill Creation (recommended after complex tasks)

After completing a complex task (5+ tool calls), consider:
"Would this process be useful again in the future?"

SHOULD create skill when:
- Process is repeatable with different inputs
- Multiple steps that are easy to forget
- Domain-specific workflow others could benefit from

SHOULD NOT create skill when:
- One-time task specific to this user/context
- Debugging or troubleshooting (too context-dependent)
- Simple tasks (< 5 tool calls)
- User explicitly said "skip" or declined

Creating: skill_manage(action="create", content="---\nname: ...\n...")
Improving: skill_manage(action="patch", slug="...", find="...", replace="...")
Removing: skill_manage(action="delete", slug="...")

Constraints:
- You can only manage skills you created (not system or other users' skills)
- Quality over quantity — one excellent skill beats five mediocre ones
- Ask user before creating if unsure
```

### Budget nudges

These are ephemeral user messages injected into the agent loop. They are **not** persisted to session history and fire at most once per run each.

**At 70% of iteration budget (~31 tokens):**
```
[System] You are at 70% of your iteration budget. Consider whether any
patterns from this session would make a good skill.
```

**At 90% of iteration budget (~48 tokens):**
```
[System] You are at 90% of your iteration budget. If this session involved
reusable patterns, consider saving them as a skill before completing.
```

### Postscript suggestion

When `totalToolCalls >= skill_nudge_interval`, this text is appended to the agent's final response (~35 tokens, persisted in session):

```
---
_This task involved several steps. Want me to save the process as a
reusable skill? Reply "save as skill" or "skip"._
```

The postscript fires at most once per run. Subsequent runs reset the flag.

### Tool gating

When `skill_evolve=false`, the `skill_manage` tool is completely hidden from the LLM — filtered from tool definitions before they are sent to the provider, and excluded from tool names in system prompt construction. The agent has zero awareness of it.

---

## Skill Management

### skill_manage tool

The `skill_manage` tool is available to agents when `skill_evolve=true`. It supports three actions:

| Action | Required params | What it does |
|---|---|---|
| `create` | `content` | Creates a new skill from a SKILL.md content string |
| `patch` | `slug`, `find`, `replace` | Applies a find-and-replace patch to an existing skill |
| `delete` | `slug` | Soft-deletes a skill (moved to `.trash/`) |

**Full parameter reference:**

| Parameter | Type | Required for | Description |
|---|---|---|---|
| `action` | string | all | `create`, `patch`, or `delete` |
| `slug` | string | patch, delete | Unique skill identifier |
| `content` | string | create | Full SKILL.md including YAML frontmatter |
| `find` | string | patch | Exact text to find in current SKILL.md |
| `replace` | string | patch | Replacement text |

**Example — creating a skill from conversation:**

```
skill_manage(
  action="create",
  content="---\nname: Deploy Checklist\ndescription: Steps to deploy the app safely.\n---\n\n## Steps\n1. Run tests\n2. Build image\n3. Push to registry\n4. Apply manifests\n5. Verify rollout"
)
```

**Example — patching an existing skill:**

```
skill_manage(
  action="patch",
  slug="deploy-checklist",
  find="5. Verify rollout",
  replace="5. Verify rollout\n6. Notify team in Slack"
)
```

**Example — deleting a skill:**

```
skill_manage(action="delete", slug="deploy-checklist")
```

### publish_skill tool

`publish_skill` is an alternative path that registers an entire local directory as a skill. It is always available as a built-in tool toggle (not gated by `skill_evolve`).

```
publish_skill(path="./skills/my-skill")
```

The directory must contain a `SKILL.md` with a `name` in frontmatter. The skill starts with `private` visibility and is auto-granted to the calling agent. Use the Dashboard or API to grant it to other agents.

**Comparison:**

| | `skill_manage` | `publish_skill` |
|---|---|---|
| Input | Content string | Directory path |
| Files | SKILL.md only (companions copied on patch) | Entire directory (scripts, assets, etc.) |
| Gated by | `skill_evolve` config | Built-in tool toggle (always available) |
| Guidance | Injected via skill_evolve prompt | Uses `skill-creator` core skill |
| Auto-grant | Yes | Yes |

---

## Security

Every skill mutation passes through four layers before anything is written to disk.

### Layer 1 — Content Guard

Line-by-line regex scan of the SKILL.md content. Hard-reject on any match. 25 rules across 6 categories:

| Category | Examples |
|---|---|
| Destructive shell | `rm -rf /`, fork bomb, `dd of=/dev/`, `mkfs`, `shred` |
| Code injection | `base64 -d \| sh`, `eval $(...)`, `curl \| bash`, `python -c exec()` |
| Credential exfil | `/etc/passwd`, `.ssh/id_rsa`, `AWS_SECRET_ACCESS_KEY`, `GOCLAW_DB_URL` |
| Path traversal | `../../../` deep traversal |
| SQL injection | `DROP TABLE`, `TRUNCATE TABLE`, `DROP DATABASE` |
| Privilege escalation | `sudo`, world-writable `chmod`, `chown root` |

This is a defense-in-depth layer — not exhaustive. GoClaw's `exec` tool has its own runtime deny-list for shell commands.

### Layer 2 — Ownership Enforcement

Three-layer ownership check across all mutation paths:

| Layer | Check |
|---|---|
| `skill_manage` tool | `GetSkillOwnerIDBySlug(slug)` before patch/delete |
| HTTP API | `GetSkillOwnerID(uuid)` + admin role bypass |
| WebSocket gateway | `skillOwnerGetter` interface + admin role bypass |

Agents can only modify skills they created. Admins can bypass ownership checks. System skills (`is_system=true`) cannot be modified through any path.

### Layer 3 — System Skill Guard

System skills are always read-only. Any attempt to patch or delete a skill with `is_system=true` is rejected before reaching the filesystem.

### Layer 4 — Filesystem Safety

| Protection | Detail |
|---|---|
| Symlink detection | `filepath.WalkDir` checks for symlinks — rejects any |
| Path traversal | Rejects paths containing `..` segments |
| SKILL.md size limit | 100 KB max |
| Companion files size limit | 20 MB max total (scripts, assets) |
| Soft-delete | Files moved to `.trash/`, never hard-deleted |

---

## Versioning and Storage

Each create or patch produces a new immutable version directory. GoClaw always serves the highest-numbered version.

```
skills-store/
├── deploy-checklist/
│   ├── 1/
│   │   └── SKILL.md
│   └── 2/              ← patch created this version
│       └── SKILL.md
├── .trash/
│   └── old-skill.1710000000   ← soft-deleted
```

Concurrent version creation for the same skill is serialized via `pg_advisory_xact_lock` keyed on FNV-64a hash of the slug. Version numbers are computed inside the transaction using `COALESCE(MAX(version), 0) + 1`.

---

## Token Cost

| Component | When active | Approx tokens | Persisted? |
|---|---|---|---|
| Self-evolve section | `self_evolve=true` | ~95 | Every request |
| Skill creation guidance | `skill_evolve=true` | ~135 | Every request |
| `skill_manage` tool definition | `skill_evolve=true` | ~290 | Every request |
| Budget nudge 70% | iter ≥ 70% of max | ~31 | No (ephemeral) |
| Budget nudge 90% | iter ≥ 90% of max | ~48 | No (ephemeral) |
| Postscript | toolCalls ≥ interval | ~35 | Yes |

Maximum overhead per run with both features enabled: ~305 tokens for skill learning (~1.5% of a 128K context). When both are disabled (the default), zero token overhead.

---

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| Self-Evolution toggle not visible | Agent is not predefined type | Self-evolution is only for predefined agents |
| Skill not saved after postscript | User did not reply "save as skill" | Postscript requires explicit consent — reply with exact phrase |
| `skill_manage` not available to agent | `skill_evolve=false` or agent is open type | Enable `skill_evolve` in Config tab; verify agent is predefined |
| Patch fails with "not owner" | Agent trying to patch another agent's skill | Each agent can only modify skills it created |
| Patch fails with "system skill" | Attempting to modify a built-in system skill | System skills are always read-only |
| Skill content rejected | Content matched a security rule in guard.go | Remove the flagged pattern; see Layer 1 categories above |

---

## What's Next

- [Skills](./skills.md) — skill format, hierarchy, and hot reload
- [Predefined Agents](../core-concepts/predefined-agents.md) — how predefined agents differ from open agents
- [publish_skill](./skill-publishing.md) — directory-based skill publishing

<!-- goclaw-source: b9d8754 | updated: 2026-03-23 -->
