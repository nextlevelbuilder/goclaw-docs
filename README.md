# GoClaw Documentation

> User-friendly docs for [GoClaw](https://goclaw.sh) — Enterprise AI Agent Platform.
> Trilingual: English + Vietnamese (Tiếng Việt) + Chinese (中文)

## Getting Started

- [What is GoClaw?](getting-started/what-is-goclaw.md)
- [Installation](getting-started/installation.md)
- [Quick Start](getting-started/quick-start.md)
- [Configuration](getting-started/configuration.md)
- [Web Dashboard Tour](getting-started/web-dashboard-tour.md)
- [Migrating from OpenClaw](getting-started/migrating-from-openclaw.md)

## Core Concepts

- [How GoClaw Works](core-concepts/how-goclaw-works.md)
- [Agents Explained](core-concepts/agents-explained.md)
- [Sessions & History](core-concepts/sessions-and-history.md)
- [Tools Overview](core-concepts/tools-overview.md)
- [Memory System](core-concepts/memory-system.md)
- [Multi-Tenancy](core-concepts/multi-tenancy.md)

## Agents

- [Creating Agents](agents/creating-agents.md)
- [Open vs Predefined Agents](agents/open-vs-predefined.md)
- [Context Files](agents/context-files.md)
- [Summoning & Bootstrap](agents/summoning-bootstrap.md)
- [Editing Personality](agents/editing-personality.md)
- [Sharing & Access Control](agents/sharing-and-access.md)
- [User Overrides](agents/user-overrides.md)
- [System Prompt Anatomy](agents/system-prompt-anatomy.md)

## Providers

- [Provider Overview](providers/overview.md)
- [Anthropic (Claude)](providers/anthropic.md)
- [OpenAI / Azure OpenAI](providers/openai.md)
- [OpenRouter](providers/openrouter.md)
- [Google Gemini](providers/gemini.md)
- [DeepSeek](providers/deepseek.md)
- [Groq](providers/groq.md)
- [Mistral](providers/mistral.md)
- [xAI (Grok)](providers/xai.md)
- [MiniMax](providers/minimax.md)
- [Cohere](providers/cohere.md)
- [Ollama](providers/ollama.md)
- [Ollama Cloud](providers/ollama-cloud.md)
- [Perplexity](providers/perplexity.md)
- [DashScope (Qwen)](providers/dashscope.md)
- [Bailian](providers/bailian.md)
- [Suno](providers/suno.md)
- [Zai](providers/zai.md)
- [YesScale](providers/yescale.md)
- [Novita AI](providers/novita.md)
- [Claude CLI](providers/claude-cli.md)
- [Codex / ChatGPT](providers/codex-chatgpt.md)
- [ACP (Agent Client Protocol)](providers/acp.md)
- [Custom / OpenAI-Compatible](providers/custom-provider.md)

## Channels

- [Channel Overview](channels/overview.md)
- [Telegram](channels/telegram.md)
- [Discord](channels/discord.md)
- [Feishu / Lark](channels/feishu.md)
- [Larksuite](channels/larksuite.md)
- [Zalo OA](channels/zalo-oa.md)
- [Zalo Personal](channels/zalo-personal.md)
- [Slack](channels/slack.md)
- [WhatsApp](channels/whatsapp.md)
- [WebSocket](channels/websocket.md)
- [Browser Pairing](channels/browser-pairing.md)

## Agent Teams

- [What Are Teams?](agent-teams/what-are-teams.md)
- [Creating & Managing Teams](agent-teams/creating-managing-teams.md)
- [Task Board](agent-teams/task-board.md)
- [Team Messaging](agent-teams/team-messaging.md)
- [Delegation & Handoff](agent-teams/delegation-and-handoff.md)

## Advanced

- [Custom Tools](advanced/custom-tools.md)
- [MCP Integration](advanced/mcp-integration.md)
- [Skills](advanced/skills.md)
- [Scheduling & Cron](advanced/scheduling-cron.md)
- [Heartbeat](advanced/heartbeat.md)
- [Sandbox](advanced/sandbox.md)
- [Media Generation](advanced/media-generation.md)
- [TTS & Voice](advanced/tts-voice.md)
- [Knowledge Graph](advanced/knowledge-graph.md)
- [Caching](advanced/caching.md)
- [Browser Automation](advanced/browser-automation.md)
- [Extended Thinking](advanced/extended-thinking.md)
- [Hooks & Quality Gates](advanced/hooks-quality-gates.md)
- [Authentication & OAuth](advanced/authentication.md)
- [API Keys & RBAC](advanced/api-keys-rbac.md)
- [CLI Credentials](advanced/cli-credentials.md)
- [Exec Approval](advanced/exec-approval.md)
- [Context Pruning](advanced/context-pruning.md)
- [Channel Instances](advanced/channel-instances.md)
- [Usage & Quota](advanced/usage-quota.md)
- [Cost Tracking](advanced/cost-tracking.md)
- [Model Steering](advanced/model-steering.md)
- [Agent Evolution](advanced/agent-evolution.md)

## Deployment

- [Docker Compose](deployment/docker-compose.md)
- [Database Setup](deployment/database-setup.md)
- [Security Hardening](deployment/security-hardening.md)
- [Observability](deployment/observability.md)
- [Tailscale](deployment/tailscale.md)
- [Production Checklist](deployment/production-checklist.md)
- [Upgrading](deployment/upgrading.md)

## Recipes

- [Personal Assistant](recipes/personal-assistant.md)
- [Team Chatbot](recipes/team-chatbot.md)
- [Customer Support](recipes/customer-support.md)
- [Code Review Agent](recipes/code-review-agent.md)
- [Multi-Channel Setup](recipes/multi-channel-setup.md)

## Showcases

- [Gallery](showcases/gallery.md)

## Reference

- [CLI Commands](reference/cli-commands.md)
- [WebSocket Protocol](reference/websocket-protocol.md)
- [REST API](reference/rest-api.md)
- [Configuration Reference](reference/config-reference.md)
- [Environment Variables](reference/environment-variables.md)
- [Database Schema](reference/database-schema.md)
- [Glossary](reference/glossary.md)
- Templates
  - [AGENTS.md](reference/templates/agents.md)
  - [SOUL.md](reference/templates/soul.md)
  - [IDENTITY.md](reference/templates/identity.md)
  - [TOOLS.md](reference/templates/tools.md)
  - [USER.md](reference/templates/user.md)
  - [USER_PREDEFINED.md](reference/templates/user-predefined.md)
  - [BOOTSTRAP.md](reference/templates/bootstrap.md)
  - [TEAM.md](reference/templates/team.md)

## Troubleshooting

- [Common Issues](troubleshooting/common-issues.md)
- [WebSocket Issues](troubleshooting/websocket.md)
- [Channels](troubleshooting/channels.md)
- [Providers](troubleshooting/providers.md)
- [MCP](troubleshooting/mcp.md)
- [Database](troubleshooting/database.md)
- [Agent Teams](troubleshooting/agent-teams.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for writing guidelines and bilingual process.

## Structure

```
├── index.html              # SPA entry
├── js/docs-app.js          # App logic, routing, i18n
├── css/styles.css          # Dark theme styles
├── getting-started/        # Onboarding (6 pages)
├── core-concepts/          # Architecture & concepts (6 pages)
├── agents/                 # Agent configuration (8 pages)
├── providers/              # LLM provider guides (23 pages)
├── channels/               # Messaging channel setup (11 pages)
├── agent-teams/            # Team collaboration (5 pages)
├── advanced/               # Power-user features (21 pages)
├── deployment/             # Deploy & operate (7 pages)
├── recipes/                # Step-by-step tutorials (5 pages)
├── showcases/              # Gallery & examples (1 page)
├── reference/              # API, CLI & config reference (15 pages)
├── troubleshooting/        # Debug & FAQ (7 pages)
├── vi/                     # Vietnamese mirror (~96 pages)
├── archive/                # Old technical docs (DO NOT reference)
└── images/dashboard/       # Dashboard screenshots
```
