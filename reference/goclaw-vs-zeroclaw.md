# GoClaw vs ZeroClaw — Comprehensive Comparison

Both GoClaw and ZeroClaw are part of the ClawFamily ecosystem, but serve different use cases. This page provides a side-by-side comparison across all major aspects.

## Overview

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Purpose** | Multi-tenant AI agent gateway | Minimal trait-driven agent runtime |
| **Language** | Go 1.26 | Rust (edition 2021) |
| **Binary size** | Standard Go binary | ~8.8MB (stripped) |
| **RAM at runtime** | Go GC overhead (typical) | <5MB |
| **Startup time** | Standard Go startup | <10ms on 0.8GHz core |
| **Database** | PostgreSQL (required) | SQLite (default), PostgreSQL/Qdrant optional |
| **Config format** | JSON5 (hot-reload) | TOML |

---

## Architecture

| Aspect | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Model** | Layered gateway: Client → Gateway → Scheduler → Agent Loop → Provider/Tools → Store | Trait-driven modular: each subsystem has traits file + factory/registry |
| **Extension** | Go interface-based | Trait-based + WASM plugin system (hot-reload) |
| **Concurrency** | 4 named semaphore lanes (main/subagent/delegate/cron) | Tokio async runtime (feature-minimized) |
| **Design philosophy** | Monolith gateway serving many tenants | Single binary running anywhere, including edge devices |

---

## Agent Loop & AI Integration

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **LLM providers** | 13+ (Anthropic native, OpenAI-compat adapter) | 40+ (dedicated implementation per provider) |
| **Default model** | Configured via config.json | `anthropic/claude-sonnet-4.6` via OpenRouter |
| **Research phase** | No (direct agent loop) | Yes — agent gathers info via tools before responding |
| **Loop detection** | Warn + break on repeated identical tool calls | `LoopDetector` with dedicated config |
| **Context management** | Mid-loop compaction at 75% context window, post-run summarization | Memory loader injection |
| **Extended thinking** | Supported (Anthropic thinking blocks) | Not documented |
| **Fallback strategy** | RetryDo wrapper with backoff | Reliable wrapper — automatic fallback chains |
| **Per-sender routing** | Per-user provider/model overrides | Per-sender model routing, hint-based routing |
| **Query classification** | No | Yes — routes queries to specialized sub-models |

---

## Tool Ecosystem

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Tool count** | ~50 modules | 70+ modules |
| **Filesystem** | read, write, list, edit | read, write, edit |
| **Shell** | Yes, with security approval modes | Yes |
| **Web** | fetch + search (Brave, DDG, Perplexity, Tavily) | fetch + search |
| **Browser** | go-rod (Chrome CDP) | fantoccini/WebDriver (optional) |
| **Memory tools** | pgvector + BM25 full-text | Markdown/SQLite/Postgres/Qdrant backends |
| **MCP** | stdio, SSE, streamable-HTTP | MCP client (stdio) |
| **Media** | Image, audio, video, document creation & reading | Image, DOCX/PDF/XLSX/PPTX reading |
| **Hardware** | No | STM32, Arduino, RPi GPIO, serial, USB |
| **WASM plugins** | No | Yes — hot-reloadable via wasmtime |
| **Team/subagent** | Shared task boards, sync/async delegation | Delegate/subagent orchestration |
| **Composio** | No | Yes |

---

## Messaging Channels

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Channel count** | 7 | 25+ |
| **Core channels** | Telegram, Discord, Slack, WhatsApp, Zalo, Zalo Personal, Feishu/Lark | Telegram, Discord, Slack, Matrix (E2EE), WhatsApp Web, DingTalk, Lark/Feishu, IRC, MQTT, Nostr, Mattermost, Nextcloud Talk, Signal, iMessage, Email, QQ, WATI, GitHub, LinQ, ACP... |
| **Matrix E2EE** | No | Yes (matrix-sdk) |
| **WhatsApp** | Via bridge URL | Native client (wa-rs) |
| **Email** | No | SMTP + IMAP |
| **IoT (MQTT)** | No | Yes |

---

## Security

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Encryption** | AES-256-GCM (API keys) | ChaCha20-Poly1305 (AEAD) |
| **Auth** | Token/password + 5-layer RBAC | Pairing code → bearer token |
| **RBAC** | admin/operator/viewer with 5 scopes | AutonomyConfig + deny-by-default tool policy |
| **Prompt injection** | Regex-based input guard | Prompt guard + semantic guard + canary guard |
| **Sandboxing** | Docker sandbox | Landlock + Bubblewrap + Firejail + Docker + WASM |
| **Leak detection** | Not documented | Dedicated leak detector |
| **Symlink protection** | Not documented | File link guard |
| **Emergency stop** | No | E-stop mechanism |
| **Memory safety** | Go (memory safe by default) | `#![forbid(unsafe_code)]` |
| **Syscall monitoring** | No | Syscall anomaly detection |
| **Audit logging** | slog.Warn("security.*") | Structured audit events with schema |

---

## Memory System

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Vector search** | pgvector (HNSW, cosine similarity) | Qdrant (optional) + SQLite embeddings |
| **Full-text search** | tsvector BM25 (GIN index) | Hybrid retrieval |
| **Backends** | PostgreSQL only | Markdown files, SQLite, PostgreSQL, Qdrant |
| **Embedding cache** | Hash-based (PostgreSQL) | Not documented |
| **Memory hygiene** | Not documented | Decay/hygiene + snapshot |
| **Response cache** | Not documented | Yes |

---

## Configuration & Deployment

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Config format** | JSON5 (hot-reload via fsnotify) | TOML |
| **Setup** | `goclaw onboard` (interactive TUI) | CLI setup |
| **Docker** | 10+ compose files for various modes | Dockerfile + docker-compose.yml |
| **Target platforms** | Linux, macOS (server-grade) | Linux (ARM, x86, RISC-V), macOS, Windows, Android/Termux |
| **Package managers** | Not available | Homebrew tap, cargo install, Nix flake |
| **Web UI** | Separate React 19 SPA (ui/web/) | Embedded dashboard (rust-embed, compiled into binary) |
| **Daemon mode** | No (runs foreground) | Yes |
| **Self-update** | Not documented | Built-in update mechanism |

---

## Observability

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Tracing** | Built-in PostgreSQL traces + optional OTLP (build-tag gated) | tracing + tracing-subscriber |
| **OpenTelemetry** | OTLP/gRPC or OTLP/HTTP | OTLP (optional feature flag) |
| **Metrics** | No dedicated system | Prometheus 0.14 |
| **LLM call tracing** | Dedicated traces + spans tables | Not documented |

---

## Distinctive Strengths

### GoClaw Excels At

- **Multi-tenancy** — real user isolation, workspace separation, agent sharing across users
- **WebSocket v3 RPC** — complete protocol with 24 methods and server push events
- **Context management** — mid-loop compaction, adaptive token estimation, post-run summarization
- **Lane-based scheduling** — per-session serialization prevents race conditions
- **Token/cost tracking** — monthly budget enforcement per agent
- **I18n** — built-in localization (en/vi/zh)
- **Browser pairing** — device-to-channel authentication system

### ZeroClaw Excels At

- **Performance** — <5MB RAM, <10ms startup
- **Edge deployment** — runs on STM32, Arduino, RPi, Android/Termux
- **WASM plugins** — hot-reloadable, in-process sandboxed tools
- **Channel diversity** — 25+ channels (3.5x GoClaw)
- **Provider diversity** — 40+ LLM providers (3x GoClaw)
- **Security depth** — 7+ guard layers, OS-level sandboxing, E-stop
- **Research phase** — reduces hallucinations via pre-response fact-checking
- **Cross-platform** — ARM, RISC-V, Android/Termux support
- **Docs localization** — 10 languages

---

## When to Choose Which

| Use Case | Recommendation |
|---|---|
| Enterprise multi-tenant deployment | **GoClaw** |
| Edge/IoT/embedded devices | **ZeroClaw** |
| Resource-constrained environments | **ZeroClaw** |
| Rich real-time WebSocket API | **GoClaw** |
| Maximum channel coverage | **ZeroClaw** |
| Maximum provider coverage | **ZeroClaw** |
| Deep security requirements | **ZeroClaw** |
| Advanced context/token management | **GoClaw** |
| Plugin extensibility (WASM) | **ZeroClaw** |
| Full-featured Web UI | **GoClaw** |
| Hardware integration | **ZeroClaw** |
| Multi-user RBAC | **GoClaw** |

**In short:** GoClaw is a server-grade multi-tenant gateway optimized for organizations managing many users/agents on centralized infrastructure. ZeroClaw is an ultra-lightweight runtime optimized for every platform from cloud to edge, with the broadest integration ecosystem.

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
