# Customer Support

> A predefined agent that handles customer queries consistently across all users, with specialist escalation.

## Overview

This recipe sets up a customer support agent with a fixed personality (same for every user), per-user profiles, and a specialist escalation path. Unlike the personal assistant recipe, this agent is **predefined** — its SOUL.md and IDENTITY.md are shared across all users, ensuring consistent brand voice.

**What you need:**
- A working gateway (`./goclaw onboard`)
- Web dashboard access at `http://localhost:18790`
- At least one LLM provider configured

## Step 1: Create the support agent

Open the web dashboard and go to **Agents → Create Agent**:

- **Key:** `support`
- **Display name:** Support Assistant
- **Type:** Predefined
- **Provider / Model:** Choose your preferred provider and model
- **Description:** "Friendly customer support agent for Acme Corp. Patient, empathetic, solution-focused. Answers questions about our product, helps with account issues, and escalates complex technical problems to the engineering team. Always confirms resolution before closing. Responds in the user's language."

Click **Save**. The `description` field triggers **summoning** — the gateway uses the LLM to auto-generate SOUL.md and IDENTITY.md from your description.

Wait for the agent status to transition from `summoning` → `active`. You can watch this on the Agents list page.

<details>
<summary><strong>Via API</strong></summary>

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

Poll status:

```bash
curl http://localhost:18790/v1/agents/support \
  -H "Authorization: Bearer YOUR_TOKEN"
```

</details>

## Step 2: Write a manual SOUL.md (optional)

If you prefer to write the personality yourself instead of relying on summoning, go to **Dashboard → Agents → support → Files tab → SOUL.md** and edit inline:

```markdown
# Support Agent — SOUL.md

You are the support face of Acme Corp. Your core traits:

- **Patient**: Never rush a user. Repeat yourself if needed without frustration.
- **Empathetic**: Acknowledge problems before solving them. "That sounds frustrating — let me fix it."
- **Precise**: Give exact steps, not vague advice. If unsure, say so and escalate.
- **On-brand**: Friendly but professional. No slang. No emojis in formal replies.

You always confirm: "Does that solve the issue for you?" before ending.
```

Click **Save** when done.

<details>
<summary><strong>Via API</strong></summary>

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

</details>

## Step 3: Add a technical escalation specialist

Create a second predefined agent for complex issues. Go to **Agents → Create Agent**:

- **Key:** `tech-specialist`
- **Display name:** Technical Specialist
- **Type:** Predefined
- **Description:** "Senior technical support specialist. Handles complex API issues, integration problems, and bug reports. Methodical, detail-oriented, documents every issue with reproduction steps."

Click **Save** and wait for summoning to complete.

Then set up the escalation link: go to **Agents → support → Links tab → Add Link**:
- **Target agent:** `tech-specialist`
- **Direction:** Outbound
- **Description:** Escalate complex technical issues
- **Max concurrent:** 3

Click **Save**. The support agent can now delegate complex issues to the specialist.

<details>
<summary><strong>Via API</strong></summary>

```bash
# Create specialist
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

# Create delegation link
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

</details>

## Step 4: Configure per-user profiles

Because `support` is predefined, each user gets their own `USER.md` seeded on first chat. You can pre-populate profiles to give the agent context about who the user is.

Go to **Agents → support → Instances tab → select a user → Files → USER.md** and edit:

```markdown
# User Profile: Alice

- **Plan**: Enterprise (annual)
- **Company**: Acme Widgets Ltd
- **Joined**: 2023-08
- **Known issues**: Reported API rate limit problems in Nov 2024
- **Preferences**: Prefers technical explanations, not simplified answers
```

<details>
<summary><strong>Via API</strong></summary>

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

</details>

## Step 5: Restrict tools for support context

Support agents rarely need file system or shell access. Go to **Agents → support → Config tab** and configure tool permissions:

- **Allowed tools:** `web_fetch`, `web_search`, `memory_search`, `memory_save`, `delegate`
- Deny everything else

This limits the attack surface while keeping the agent functional for support tasks.

<details>
<summary><strong>Via config.json</strong></summary>

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

</details>

## Step 6: Connect a channel

Go to **Channels → Create Instance** in the dashboard:
- **Channel type:** Telegram (or Discord, Slack, Zalo OA, etc.)
- **Agent:** Select `support`
- **Credentials:** Paste your bot token
- **Config:** Set `dm_policy` to `open` so any customer can message the bot

Click **Save**. The channel is immediately active.

> **Tip:** For customer-facing bots, set `dm_policy: "open"` so users don't need to pair via browser first.

## File attachments

When the support agent uses `write_file` to generate a document (e.g., a troubleshooting report or account summary), the file is automatically delivered as a channel attachment to the user. No extra configuration needed — this works across all channel types.

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
| Agent personality differs between users | If the agent is `open`, each user shapes their own personality. Switch to `predefined` for shared SOUL.md. |
| USER.md not being seeded | First chat triggers seeding. If pre-populating via Instances tab, ensure you select the correct user. |
| Summoning failed, no SOUL.md | Check gateway logs for LLM errors during summoning. Manually write SOUL.md via the Files tab as shown in Step 2. |
| Support agent escalates too aggressively | Edit SOUL.md to add criteria: "Only delegate to tech-specialist when the user reports an API error code or integration failure." |
| Specialist not responding | Check the specialist's status is `active` and the delegation link exists (Agent → Links tab). |

## What's Next

- [Open vs. Predefined](#open-vs-predefined) — deep dive on context isolation
- [Summoning & Bootstrap](#summoning-bootstrap) — how personality is auto-generated
- [Team Chatbot](#recipe-team-chatbot) — coordinate multiple specialists via a team
- [Context Files](#context-files) — full reference for SOUL.md, USER.md, and friends

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
