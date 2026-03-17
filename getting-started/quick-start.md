# Quick Start

> Your first AI agent conversation in 5 minutes.

## Prerequisites

You've completed [Installation](#installation) and the gateway is running on `http://localhost:18790`.

## Step 1: Open the Dashboard & Complete Setup

Open `http://localhost:3000` (Docker) or `http://localhost:5173` (bare metal dev server) and log in:

- **User ID:** `system`
- **Gateway Token:** found in `.env.local` (or `.env` for Docker) — look for `GOCLAW_GATEWAY_TOKEN`

On first login, the dashboard automatically navigates to the **Setup Wizard**. The wizard walks you through:

1. **Add an LLM provider** — choose from OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, DashScope (Alibaba Cloud Model Studio — Qwen API), Bailian (Alibaba Cloud Model Studio — Coding Plan), GLM (Zhipu), and more. Enter your API key and select a model.
2. **Create your first agent** — give it a name, system prompt, and select the provider/model from above.
3. **Connect a channel** (optional) — link Telegram, Discord, WhatsApp, Zalo, Larksuite, or Slack.

> **Tip:** You can click **"Skip setup and go to dashboard"** at the top of the wizard to skip it entirely and configure everything manually later. The Channel step (step 3) also has a **Skip** button if you don't need Telegram/Discord/etc. yet — you can always add channels later.

After completing the wizard, you're ready to chat.

## Step 2: Add More Providers (Optional)

To add additional providers later:

1. Go to **Providers** (under **SYSTEM** in the sidebar)
2. Click **Add Provider**
3. Choose a provider, enter API key, and select a model

## Step 3: Chat

> **Note:** Before making API or WebSocket calls, make sure you've added at least one provider during the Setup Wizard (Step 1 above). Without a provider, requests will return `no provider API key found`.

> **Tip:** To verify GoClaw is running: `curl http://localhost:18790/health`

### Using the Dashboard

Go to **Chat** (under **CORE** in the sidebar) and select the agent you created during setup.

To create additional agents, go to **Agents** (also under **CORE**) and click **Create Agent**. See [Creating Agents](#creating-agents) for details.

### Using the HTTP API

The HTTP API is OpenAI-compatible. Use the `goclaw:<agent-key>` format in the `model` field to specify the target agent:

```bash
curl -X POST http://localhost:18790/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_TOKEN" \
  -H "X-GoClaw-User-Id: system" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "goclaw:your-agent-key",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

Replace `YOUR_GATEWAY_TOKEN` with the value from `.env.local` (bare metal) or `.env` (Docker) and `your-agent-key` with the agent key shown in the Agents page (e.g., `goclaw:my-assistant`).

> **Agent identifier tip:** The Dashboard shows two identifiers per agent — `agent_key` (a human-readable display name) and `id` (a UUID). For HTTP API calls use `agent_key` in the `model` field. For WebSocket `chat.send`, use the agent's `id` (UUID) as `agentId`. Both are visible on the Agents page.

### Using WebSocket

Connect with any WebSocket client:

```bash
# Using websocat (install: cargo install websocat)
websocat ws://localhost:18790/ws
```

**First**, send a `connect` frame to authenticate:

```json
{"type":"req","id":"1","method":"connect","params":{"token":"YOUR_GATEWAY_TOKEN","user_id":"system"}}
```

**Then**, send a chat message:

```json
{"type":"req","id":"2","method":"chat.send","params":{"agentId":"your-agent-key","message":"Hello! What can you do?"}}
```

> **Tip:** If you omit `agentId`, GoClaw uses the `default` agent.

**Response:**

```json
{
  "type": "res",
  "id": "2",
  "ok": true,
  "payload": {
    "runId": "uuid-string",
    "content": "Hello! How can I help you today?",
    "usage": { "input_tokens": 150, "output_tokens": 25 }
  }
}
```

The `media` field appears in the payload only when the agent returns generated media files.

## Common Issues

| Problem | Solution |
|---------|----------|
| `no provider API key found` | Add a provider & API key in the Dashboard |
| `unauthorized` on WebSocket | Check the `token` in your `connect` frame matches `GOCLAW_GATEWAY_TOKEN` |
| Dashboard shows blank page | Ensure the web UI service is running |

## What's Next

- [Configuration](#configuration) — Fine-tune your setup
- [Dashboard Tour](#dashboard-tour) — Explore the visual interface
- [Agents Explained](#agents-explained) — Understand agent types and context
