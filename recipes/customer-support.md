# Customer Support

> A predefined agent that handles customer queries consistently across all users, with specialist escalation.

## Overview

This recipe sets up a customer support agent with a fixed personality (same for every user), per-user profiles, and a specialist escalation path. Unlike the personal assistant recipe, this agent is **predefined** — its SOUL.md and IDENTITY.md are shared across all users, ensuring consistent brand voice.

**Prerequisites:** A working gateway (`./goclaw onboard`), at least one channel.

## Step 1: Create the support agent

Use the `description` field to trigger automatic summoning. The gateway will generate SOUL.md and IDENTITY.md from your description using the configured LLM.

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "support",
    "display_name": "Support Assistant",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user'\''s language."
    }
  }'
```

Wait for the agent to transition from `summoning` → `active`:

```bash
curl http://localhost:18790/v1/agents/support \
  -H "Authorization: Bearer YOUR_TOKEN"
# Check "status" field in response
```

## Step 2: Write a manual SOUL.md (optional)

If you prefer to write the personality yourself instead of summoning, update the agent-level SOUL.md directly:

```bash
curl -X PUT http://localhost:18790/v1/agents/support/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
EOF
```

## Step 3: Add a technical escalation specialist

Create a predefined specialist for complex issues:

```bash
curl -X POST http://localhost:18790/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "tech-specialist",
    "display_name": "Technical Specialist",
    "agent_type": "predefined",
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4-5-20250929",
    "other_config": {
      "description": "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."
    }
  }'
```

Then link `support` → `tech-specialist` so the support agent can escalate:

```bash
curl -X POST http://localhost:18790/v1/agents/support/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: admin" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAgent": "support",
    "targetAgent": "tech-specialist",
    "direction": "outbound",
    "description": "Escalate complex technical issues",
    "maxConcurrent": 3
  }'
```

## Step 4: Configure per-user profiles

Because `support` is predefined, each user gets their own `USER.md` seeded on first chat. You can pre-populate it via the API to give the agent context about who the user is:

```bash
curl -X PUT http://localhost:18790/v1/agents/support/users/alice123/files/USER.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
EOF
```

## Step 5: Restrict tools for support context

Support agents rarely need file system or shell access. Lock down tools in `config.json`:

```json
{
  "agents": {
    "list": {
      "support": {
        "tools": {
          "allow": ["web_fetch", "web_search", "memory_search", "memory_save", "delegate"]
        }
      }
    }
  }
}
```

Restart the gateway after config changes.

## How context isolation works

```
support (predefined)
├── SOUL.md         ← shared: same personality for all users
├── IDENTITY.md     ← shared: same "who I am" for all users
├── AGENTS.md       ← shared: operating instructions
│
├── User: alice123
│   ├── USER.md     ← per-user: Alice's profile, tier, history
│   └── BOOTSTRAP.md ← first-run onboarding (clears itself)
│
└── User: bob456
    ├── USER.md     ← per-user: Bob's profile
    └── BOOTSTRAP.md
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Agent personality differs between users | If agents are `open`, each user shapes their own personality. Switch to `predefined` for shared SOUL.md. |
| USER.md not being seeded | First chat triggers seeding. If pre-populating, ensure the path includes the correct user ID. |
| Summoning failed, no SOUL.md | Check gateway logs for LLM errors during summoning. Manually write SOUL.md as shown in Step 2. |
| Support agent escalates too aggressively | Edit SOUL.md to add criteria: "Only delegate to tech-specialist when the user reports an API error code or integration failure." |

## What's Next

- [Open vs. Predefined](../agents/open-vs-predefined.md) — deep dive on context isolation
- [Summoning & Bootstrap](../agents/summoning-bootstrap.md) — how personality is auto-generated
- [Team Chatbot](./team-chatbot.md) — coordinate multiple specialists via a team
- [Context Files](../agents/context-files.md) — full reference for SOUL.md, USER.md, and friends
