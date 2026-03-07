# 00 - Tổng Quan Kiến Trúc

## 1. Tổng Quan

GoClaw là một AI agent gateway được viết bằng Go. Hệ thống cung cấp giao diện WebSocket RPC (v3) và HTTP API tương thích OpenAI để điều phối các agent được hỗ trợ bởi LLM. Hệ thống hỗ trợ hai chế độ hoạt động:

- **Standalone** -- lưu trữ dựa trên file với SQLite cho dữ liệu người dùng, không có phụ thuộc bên ngoài ngoài LLM API key.
- **Managed** -- chế độ đa tenant dựa trên PostgreSQL với HTTP CRUD API, file context theo người dùng, mã hóa thông tin xác thực, ủy quyền agent, nhóm agent, và tracing cuộc gọi LLM.

> **Phạm vi tài liệu**: Tài liệu này bao gồm cả hai chế độ. Chế độ Standalone hiện đã gần đạt parity với chế độ Managed cho các tính năng cốt lõi (file context theo người dùng, cô lập workspace, loại agent, onboarding bootstrap). Chế độ Managed bổ sung thêm ủy quyền agent, nhóm agent, quality gate, tracing, HTTP CRUD API, và secret được mã hóa.

## 2. Sơ Đồ Thành Phần

```mermaid
flowchart TD
    subgraph Clients
        WS[WebSocket Clients]
        HTTP[HTTP Clients]
        TG[Telegram]
        DC[Discord]
        FS[Feishu / Lark]
        ZL[Zalo]
        WA[WhatsApp]
    end

    subgraph Gateway["Gateway Server"]
        WSS[WebSocket Server]
        HTTPS[HTTP API Server]
        MR[Method Router]
        RL[Rate Limiter]
        RBAC[Permission Engine]
    end

    subgraph Channels["Channel Manager"]
        CM[Channel Manager]
        PA[Pairing Service]
    end

    subgraph Core["Core Engine"]
        BUS[Message Bus]
        SCHED[Scheduler -- 4 Lanes]
        AR[Agent Router]
        LOOP[Agent Loop -- Think / Act / Observe]
    end

    subgraph Providers["LLM Providers"]
        ANTH[Anthropic -- Native HTTP + SSE]
        OAI[OpenAI-Compatible -- HTTP + SSE]
    end

    subgraph Tools["Tool Registry"]
        FS_T[Filesystem]
        EXEC[Exec / Shell]
        WEB[Web Search / Fetch]
        MEM[Memory]
        SUB[Subagent]
        DEL[Delegation]
        TEAM_T[Teams]
        EVAL[Evaluate Loop]
        HO[Handoff]
        TTS_T[TTS]
        BROW[Browser]
        SK[Skills]
        MCP_T[MCP Bridge]
        CT[Custom Tools]
    end

    subgraph Hooks["Hook Engine"]
        HE[Engine]
        CMD_E[Command Evaluator]
        AGT_E[Agent Evaluator]
    end

    subgraph Store["Store Layer"]
        SESS[SessionStore]
        AGENT_S[AgentStore]
        PROV_S[ProviderStore]
        CRON_S[CronStore]
        MEM_S[MemoryStore]
        SKILL_S[SkillStore]
        TRACE_S[TracingStore]
        MCP_S[MCPServerStore]
        CT_S[CustomToolStore]
        AL_S[AgentLinkStore]
        TM_S[TeamStore]
    end

    WS --> WSS
    HTTP --> HTTPS
    TG & DC & FS & ZL & WA --> CM

    WSS --> MR
    HTTPS --> MR
    MR --> RL --> RBAC --> AR

    CM --> BUS
    BUS --> SCHED
    SCHED --> AR
    AR --> LOOP

    LOOP --> Providers
    LOOP --> Tools
    Tools --> Store
    Tools --> Hooks
    Hooks --> Tools
    LOOP --> Store
```

## 3. Bản Đồ Module

| Module | Mô tả |
|--------|-------------|
| `internal/gateway/` | Server WebSocket + HTTP, xử lý client, method router |
| `internal/gateway/methods/` | Các handler RPC method: chat, agents, agent_links, teams, delegations, sessions, config, skills, cron, pairing, exec approval, usage, send |
| `internal/agent/` | Vòng lặp agent (think, act, observe), router, resolver, system prompt builder, sanitization, pruning, tracing, memory flush, DELEGATION.md + TEAM.md injection |
| `internal/providers/` | Các provider LLM: Anthropic (native HTTP + SSE streaming), tương thích OpenAI (HTTP + SSE), retry logic |
| `internal/tools/` | Tool registry, filesystem ops, exec/shell, policy engine, subagent, delegation manager, team tools, evaluate loop, handoff, context file + memory interceptors, credential scrubbing, rate limiting, PathDenyable |
| `internal/tools/dynamic_loader.go` | Custom tool loader: LoadGlobal (khởi động), LoadForAgent (clone theo agent), ReloadGlobal (cache invalidation) |
| `internal/tools/dynamic_tool.go` | Custom tool executor: render command template, shell escaping, biến môi trường mã hóa |
| `internal/hooks/` | Hook engine: quality gate, command evaluator, agent evaluator, ngăn chặn đệ quy (`WithSkipHooks`) |
| `internal/store/` | Các interface Store: SessionStore, AgentStore, ProviderStore, SkillStore, MemoryStore, CronStore, PairingStore, TracingStore, MCPServerStore, AgentLinkStore, TeamStore, ChannelInstanceStore, ConfigSecretsStore |
| `internal/store/pg/` | Các triển khai PostgreSQL (`database/sql` + `pgx/v5`) |
| `internal/store/file/` | Các triển khai dựa trên file: sessions, memory (SQLite), cron, pairing, skills, agents (filesystem + SQLite) |
| `internal/bootstrap/` | Các file system prompt (AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md) + seeding + truncation |
| `internal/config/` | Tải cấu hình (JSON5) + phủ chồng biến môi trường |
| `internal/skills/` | Loader SKILL.md (phân cấp 5 tầng) + tìm kiếm BM25 + hot-reload qua fsnotify |
| `internal/channels/` | Channel manager + adapter: Telegram, Feishu/Lark, Zalo, Discord, WhatsApp |
| `internal/mcp/` | MCP server bridge (transport stdio, SSE, streamable-HTTP) |
| `internal/scheduler/` | Kiểm soát concurrency theo luồng (luồng main, subagent, cron, delegate) với serialization theo session |
| `internal/memory/` | Hệ thống bộ nhớ (SQLite FTS5 + embeddings cho chế độ standalone) |
| `internal/permissions/` | Policy engine RBAC (vai trò admin, operator, viewer) |
| `internal/pairing/` | Dịch vụ DM/device pairing (mã 8 ký tự) |
| `internal/sessions/` | Session manager dựa trên file (chế độ standalone) |
| `internal/bus/` | Event pub/sub (Message Bus) |
| `internal/sandbox/` | Sandbox thực thi code dựa trên Docker |
| `internal/tts/` | Các provider Text-to-Speech: OpenAI, ElevenLabs, Edge, MiniMax |
| `internal/http/` | Các handler HTTP API: /v1/chat/completions, /v1/agents, /v1/skills, /v1/traces, /v1/mcp, /v1/delegations, summoner |
| `internal/crypto/` | Mã hóa AES-256-GCM cho API key |
| `internal/tracing/` | Tracing cuộc gọi LLM (traces + spans), bộ đệm in-memory với flush định kỳ vào store |
| `internal/tracing/otelexport/` | Exporter OpenTelemetry OTLP tùy chọn (opt-in qua build tags; thêm gRPC + protobuf) |
| `internal/heartbeat/` | Dịch vụ đánh thức agent định kỳ |

---

## 4. Hai Chế Độ Hoạt Động

| Khía cạnh | Standalone | Managed |
|--------|-----------|---------|
| Nguồn cấu hình | `config.json` + biến môi trường | `config.json` + `GOCLAW_POSTGRES_DSN` |
| Lưu trữ | File JSON + SQLite (`~/.goclaw/data/agents.db`) | PostgreSQL |
| Agent | Định nghĩa trong `config.json` `agents.list`, tạo sẵn khi khởi động | Bảng `agents`, resolve lazily qua `ManagedResolver` |
| Agent store | `FileAgentStore` (filesystem + SQLite) | `PGAgentStore` |
| File context | Cấp agent trên filesystem, theo người dùng trong SQLite | Bảng `agent_context_files` + `user_context_files` |
| Loại agent | `open` / `predefined` (qua config) | `open` (7 file theo người dùng) / `predefined` (cấp agent + USER.md theo người dùng) |
| Cô lập theo người dùng | Thư mục workspace con (`user_alice/`, `user_bob/`) | Như trên + file context theo DB |
| Bootstrap onboarding | Seeding BOOTSTRAP.md theo người dùng (SQLite) | Như trên (PostgreSQL) |
| Ủy quyền agent | Không có | Ủy quyền đồng bộ/bất đồng bộ, agent links, quality gate |
| Nhóm agent | Không có | Bảng nhiệm vụ chung, hộp thư, handoff |
| Skills | Chỉ filesystem (workspace + thư mục global) | PostgreSQL + filesystem + tìm kiếm embedding |
| Memory | SQLite FTS5 + embeddings | pgvector hybrid (full-text search + vector similarity) |
| Tracing | Không có | Bảng `traces` + `spans` + xuất OTel OTLP tùy chọn |
| MCP server | `tools.mcp_servers` trong `config.json` | Bảng `mcp_servers` + grants |
| Lưu trữ API key | Chỉ `.env.local` / biến môi trường | PostgreSQL (mã hóa AES-256-GCM) |
| HTTP CRUD API | Không có | `/v1/agents`, `/v1/skills`, `/v1/traces`, `/v1/mcp`, `/v1/delegations` |
| Virtual FS | `ContextFileInterceptor` route đến SQLite | `ContextFileInterceptor` route đến PostgreSQL |
| Công cụ tùy chỉnh | Không có | Bảng `custom_tools` + `DynamicToolLoader` |
| Store chỉ dùng trong managed (nil trong standalone) | -- | ProviderStore, TracingStore, MCPServerStore, CustomToolStore, AgentLinkStore, TeamStore |

---

## 5. Mô Hình Identity Đa Tenant

GoClaw sử dụng mẫu **Identity Propagation** (còn được gọi là **Trusted Subsystem**). Hệ thống không triển khai xác thực hay phân quyền — thay vào đó, nó tin tưởng dịch vụ upstream đã xác thực bằng gateway token để cung cấp identity người dùng chính xác.

```mermaid
flowchart LR
    subgraph "Upstream Service (trusted)"
        AUTH["Authenticate end-user"]
        HDR["Set X-GoClaw-User-Id header<br/>or user_id in WS connect"]
    end

    subgraph "GoClaw Gateway"
        EXTRACT["Extract user_id<br/>(opaque, VARCHAR 255)"]
        CTX["store.WithUserID(ctx)"]
        SCOPE["Per-user scoping:<br/>sessions, context files,<br/>memory, traces, agent shares"]
    end

    AUTH --> HDR
    HDR --> EXTRACT
    EXTRACT --> CTX
    CTX --> SCOPE
```

### Luồng Identity

| Điểm vào | Cách cung cấp user_id | Bắt buộc |
|-------------|------------------------|-------------|
| HTTP API | Header `X-GoClaw-User-Id` | Bắt buộc trong chế độ managed |
| WebSocket | Trường `user_id` trong handshake `connect` | Bắt buộc trong chế độ managed |
| Kênh giao tiếp | Lấy từ ID người gửi trên nền tảng (ví dụ: Telegram user ID) | Tự động |

### Quy Ước User ID Dạng Kết Hợp

Trường `user_id` là **opaque** đối với GoClaw — hệ thống không phân tích hay kiểm tra định dạng. Đối với triển khai đa tenant, quy ước được khuyến nghị là:

```
tenant.{tenantId}.user.{userId}
```

Định dạng phân cấp này đảm bảo cô lập tự nhiên giữa các tenant. Vì `user_id` được dùng làm khóa phân vùng trên tất cả bảng theo người dùng (`user_context_files`, `user_agent_profiles`, `user_agent_overrides`, `agent_shares`, `sessions`, `traces`), định dạng kết hợp đảm bảo người dùng từ các tenant khác nhau không thể truy cập dữ liệu của nhau.

### Nơi Sử Dụng user_id

| Thành phần | Cách sử dụng |
|-----------|-------|
| Khóa session | `agent:{agentId}:{channel}:direct:{peerId}` — peerId lấy từ user_id |
| File context | Bảng `user_context_files` phân vùng theo `(agent_id, user_id)` |
| Profile người dùng | Bảng `user_agent_profiles` — thời gian truy cập đầu/cuối, workspace |
| Override người dùng | `user_agent_overrides` — tùy chọn provider/model theo người dùng |
| Chia sẻ agent | Bảng `agent_shares` — kiểm soát truy cập cấp người dùng |
| Memory | Mục memory theo người dùng qua context propagation |
| Traces | Bảng `traces` bao gồm `user_id` để lọc |
| MCP grants | `mcp_user_grants` — quyền truy cập MCP server theo người dùng |
| Skill grants | `skill_user_grants` — quyền truy cập skill theo người dùng |

---

## 6. Trình Tự Khởi Động Gateway

```mermaid
sequenceDiagram
    participant CLI as CLI (cmd/root.go)
    participant GW as runGateway()
    participant PG as PostgreSQL
    participant Engine as Core Engine

    CLI->>GW: 1. Parse CLI flags + load config
    GW->>GW: 2. Resolve workspace + data dirs
    GW->>GW: 3. Create Message Bus

    alt Chế độ Managed
        GW->>PG: 4. Connect to Postgres (pg.NewPGStores)
        PG-->>GW: PG stores created
        GW->>GW: 5. Start tracing collector
        GW->>PG: 6. Register providers from DB
        GW->>PG: 7. Wire embedding provider to PGMemoryStore
        GW->>PG: 8. Backfill memory embeddings (background)
    else Chế độ Standalone
        GW->>GW: 4. Create file-based stores
    end

    GW->>GW: 9. Register config-based providers
    GW->>GW: 10. Create tool registry (filesystem, exec, web, memory, browser, TTS, subagent, MCP)
    GW->>GW: 11. Load bootstrap files (DB or filesystem)
    GW->>GW: 12. Create skills loader + register skill_search tool
    GW->>GW: 13. Wire skill embeddings (chỉ managed)

    alt Chế độ Managed
        GW->>GW: 14. Create agents lazily (set ManagedResolver)
        GW->>GW: 15. wireManagedExtras (interceptors, cache subscribers)
        GW->>GW: 16. Wire managed HTTP handlers (agents, skills, traces, MCP)
    else Chế độ Standalone
        GW->>GW: 14. Create agents eagerly from config
        GW->>GW: 15. wireStandaloneExtras (FileAgentStore, interceptors, callbacks)
    end

    GW->>Engine: 17. Create gateway server (WS + HTTP)
    GW->>Engine: 18. Register RPC methods
    GW->>Engine: 19. Register + start channels (Telegram, Discord, Feishu, Zalo, WhatsApp)
    GW->>Engine: 20. Start cron, heartbeat, scheduler (4 lanes)
    GW->>Engine: 21. Start skills watcher + inbound consumer
    GW->>Engine: 22. Listen on host:port
```

---

## 7. Kết Nối Chế Độ Managed

Hàm `wireManagedExtras()` trong `cmd/gateway_managed.go` kết nối các thành phần đa tenant:

```mermaid
flowchart TD
    W1["1. ContextFileInterceptor<br/>Routes read_file / write_file to DB"] --> W2
    W2["2. User Seeding Callback<br/>Seeds per-user context files on first chat"] --> W3
    W3["3. Context File Loader<br/>Loads per-user vs agent-level files by agent_type"] --> W4
    W4["4. ManagedResolver<br/>Lazy-creates agent Loops from DB on cache miss"] --> W5
    W5["5. Virtual FS Interceptors<br/>Wire interceptors on read_file + write_file + memory tools"] --> W6
    W6["6. Memory Store Wiring<br/>Wire PGMemoryStore on memory_search + memory_get tools"] --> W7
    W7["7. Cache Invalidation Subscribers<br/>Subscribe to MessageBus events"] --> W8
    W8["8. Delegation Tools<br/>DelegateManager + delegate_search + agent links"] --> W9
    W9["9. Team Tools<br/>team_tasks + team_message + team auto-linking"] --> W10
    W10["10. Hook Engine<br/>Quality gates with command + agent evaluators"] --> W11
    W11["11. Evaluate Loop + Handoff<br/>evaluate_loop tool + handoff tool"]
```

Một hàm `wireStandaloneExtras()` riêng biệt trong `cmd/gateway_standalone.go` kết nối các callback cốt lõi tương tự (user seeding, context file loading) sử dụng `FileAgentStore` thay vì PostgreSQL.

### Sự Kiện Cache Invalidation

| Sự kiện | Subscriber | Hành động |
|-------|-----------|--------|
| `cache:bootstrap` | ContextFileInterceptor | `InvalidateAgent()` hoặc `InvalidateAll()` |
| `cache:agent` | AgentRouter | `InvalidateAgent()` -- buộc resolve lại từ DB |
| `cache:skills` | SkillStore | `BumpVersion()` |
| `cache:cron` | CronStore | `InvalidateCache()` |
| `cache:custom_tools` | DynamicToolLoader | `ReloadGlobal()` + `AgentRouter.InvalidateAll()` |

---

## 8. Luồng Scheduler

Scheduler sử dụng mô hình concurrency theo luồng. Mỗi luồng là một worker pool được đặt tên với semaphore có giới hạn. Hàng đợi theo session kiểm soát concurrency trong mỗi session.

```mermaid
flowchart TD
    subgraph Main["Lane: main (concurrency 30)"]
        M1[Channel messages]
        M2[WebSocket requests]
    end

    subgraph Sub["Lane: subagent (concurrency 50)"]
        S1[Subagent executions]
    end

    subgraph Del["Lane: delegate (concurrency 100)"]
        D1[Delegation executions]
    end

    subgraph Cron["Lane: cron (concurrency 30)"]
        C1[Cron job executions]
    end

    Main --> SEM1[Semaphore]
    Sub --> SEM2[Semaphore]
    Del --> SEM3[Semaphore]
    Cron --> SEM4[Semaphore]

    SEM1 --> Q[Per-Session Queue]
    SEM2 --> Q
    SEM3 --> Q
    SEM4 --> Q

    Q --> AGENT[Agent Loop]
```

### Mặc Định Của Luồng

| Luồng | Concurrency | Biến môi trường | Mục đích |
|------|:-----------:|-------------|---------|
| `main` | 30 | `GOCLAW_LANE_MAIN` | Session chat người dùng chính |
| `subagent` | 50 | `GOCLAW_LANE_SUBAGENT` | Subagent được spawn |
| `delegate` | 100 | `GOCLAW_LANE_DELEGATE` | Thực thi ủy quyền agent |
| `cron` | 30 | `GOCLAW_LANE_CRON` | Công việc cron định kỳ |

### Concurrency Hàng Đợi Session

Hàng đợi theo session hiện hỗ trợ `maxConcurrent` có thể cấu hình:
- **DM**: `maxConcurrent = 1` (đơn luồng theo người dùng)
- **Nhóm**: `maxConcurrent = 3` (nhiều phản hồi đồng thời)
- **Điều tiết thích ứng**: Khi lịch sử session vượt 60% context window, concurrency giảm xuống 1

### Chế Độ Hàng Đợi

| Chế độ | Hành vi |
|------|----------|
| `queue` | FIFO -- tin nhắn mới chờ cho đến khi lần chạy hiện tại hoàn thành |
| `followup` | Gộp tin nhắn đến vào hàng đợi đang chờ như một follow-up |
| `interrupt` | Hủy lần chạy đang hoạt động và thay thế bằng tin nhắn mới |

Cấu hình hàng đợi mặc định: dung lượng 10, chính sách drop `old` (bỏ cũ nhất khi tràn), debounce 800ms.

### /stop và /stopall

- `/stop` -- Hủy tác vụ đang chạy cũ nhất (các tác vụ khác vẫn tiếp tục)
- `/stopall` -- Hủy tất cả tác vụ đang chạy + làm trống hàng đợi

Cả hai đều được xử lý trước debouncer để tránh bị gộp với tin nhắn thông thường.

---

## 9. Tắt Hệ Thống Nhẹ Nhàng

Khi tiến trình nhận SIGINT hoặc SIGTERM:

1. Phát tín hiệu `shutdown` đến tất cả WebSocket client đang kết nối.
2. `channelMgr.StopAll()` -- dừng tất cả channel adapter.
3. `cronStore.Stop()` -- dừng cron scheduler.
4. `heartbeatSvc.Stop()` -- dừng dịch vụ heartbeat.
5. `sandboxMgr.Stop()` + `ReleaseAll()` -- giải phóng Docker container.
6. `cancel()` -- hủy root context, lan truyền đến consumer + scheduler.
7. Dọn dẹp deferred: flush tracing collector, đóng memory store, đóng browser manager, dừng các luồng scheduler.
8. Tắt HTTP server với **timeout 5 giây** (`context.WithTimeout`).

---

## 10. Hệ Thống Cấu Hình

Cấu hình được tải từ file JSON5 với phủ chồng biến môi trường. Bí mật không bao giờ được lưu vào file cấu hình.

```mermaid
flowchart TD
    A{Đường dẫn cấu hình?} -->|--config flag| B[Đường dẫn từ CLI flag]
    A -->|GOCLAW_CONFIG env| C[Đường dẫn từ biến môi trường]
    A -->|mặc định| D["config.json"]

    B & C & D --> LOAD["config.Load()"]
    LOAD --> S1["1. Set defaults"]
    S1 --> S2["2. Parse JSON5"]
    S2 --> S3["3. Env var overlay<br/>(GOCLAW_*_API_KEY)"]
    S3 --> S4["4. Apply computed defaults<br/>(context pruning, etc.)"]
    S4 --> READY[Config ready]
```

### Các Phần Cấu Hình Quan Trọng

| Phần | Mục đích |
|---------|---------|
| `gateway` | host, port, token, allowed_origins, rate_limit_rpm, max_message_chars |
| `agents` | defaults (provider, model, context_window) + list (ghi đè theo agent) |
| `tools` | profile, allow/deny lists, exec_approval, web, browser, mcp_servers, rate_limit_per_hour |
| `channels` | Theo từng kênh: enabled, token, dm_policy, group_policy, allow_from |
| `database` | mode (standalone/managed); postgres_dsn chỉ đọc từ biến môi trường |

### Xử Lý Bí Mật

- Bí mật chỉ tồn tại trong biến môi trường hoặc `.env.local` -- không bao giờ trong `config.json`.
- `GOCLAW_POSTGRES_DSN` được đánh dấu `json:"-"` và không thể đọc từ file cấu hình.
- `MaskedCopy()` thay thế API key bằng `"***"` khi trả về cấu hình qua WebSocket.
- `StripSecrets()` xóa bí mật trước khi ghi cấu hình ra đĩa.
- Hot-reload cấu hình qua watcher `fsnotify` với debounce 300ms.

---

## 11. Tham Chiếu File

| File | Mục đích |
|------|---------|
| `cmd/root.go` | Điểm vào Cobra CLI, parse flag |
| `cmd/gateway.go` | Điều phối khởi động gateway (`runGateway()`) |
| `cmd/gateway_managed.go` | Kết nối chế độ managed (`wireManagedExtras()`, `wireManagedHTTP()`) |
| `cmd/gateway_standalone.go` | Kết nối chế độ standalone (`wireStandaloneExtras()`) |
| `cmd/gateway_callbacks.go` | Callback dùng chung cho managed + standalone (user seeding, context file loading) |
| `cmd/gateway_consumer.go` | Consumer tin nhắn đến (subagent, delegate, teammate, handoff routing) |
| `cmd/gateway_providers.go` | Đăng ký provider (từ config + DB) |
| `cmd/gateway_methods.go` | Đăng ký RPC method |
| `internal/config/config.go` | Định nghĩa cấu trúc Config |
| `internal/config/config_load.go` | Tải JSON5 + phủ chồng biến môi trường |
| `internal/config/config_channels.go` | Cấu trúc config kênh giao tiếp |
| `internal/gateway/server.go` | Server WS + HTTP, CORS, thiết lập rate limiter |
| `internal/gateway/client.go` | Xử lý WebSocket client, giới hạn đọc (512KB) |
| `internal/gateway/router.go` | Route RPC method |
| `internal/scheduler/lanes.go` | Định nghĩa luồng, concurrency dựa trên semaphore |
| `internal/scheduler/queue.go` | Hàng đợi theo session, chế độ hàng đợi, debounce |
| `internal/hooks/engine.go` | Hook engine: đăng ký evaluator, `EvaluateHooks` |
| `internal/hooks/command_evaluator.go` | Shell command evaluator (exit 0 = pass) |
| `internal/hooks/agent_evaluator.go` | Agent delegation evaluator (APPROVED/REJECTED) |
| `internal/hooks/context.go` | `WithSkipHooks` / `SkipHooksFromContext` (ngăn đệ quy) |
| `internal/store/stores.go` | Container struct `Stores` (tất cả 14 interface store) |
| `internal/store/types.go` | `StoreConfig`, `BaseModel` |

---

## Tham Chiếu Chéo

| Tài liệu | Nội dung |
|----------|---------|
| [01-agent-loop.md](./01-agent-loop.md) | Chi tiết vòng lặp agent, pipeline sanitization, quản lý lịch sử |
| [02-providers.md](./02-providers.md) | Provider LLM, retry logic, schema cleaning |
| [03-tools-system.md](./03-tools-system.md) | Tool registry, policy engine, interceptors, công cụ tùy chỉnh, MCP grants |
| [04-gateway-protocol.md](./04-gateway-protocol.md) | WebSocket protocol v3, HTTP API, RBAC, identity propagation |
| [05-channels-messaging.md](./05-channels-messaging.md) | Channel adapter, định dạng Telegram, pairing, user scoping chế độ managed |
| [06-store-data-model.md](./06-store-data-model.md) | Interface store, schema PostgreSQL, session caching, custom tool store |
| [07-bootstrap-skills-memory.md](./07-bootstrap-skills-memory.md) | File bootstrap, hệ thống skills, memory, skill grants |
| [08-scheduling-cron-heartbeat.md](./08-scheduling-cron-heartbeat.md) | Luồng scheduler, vòng đời cron, heartbeat |
| [09-security.md](./09-security.md) | Các lớp bảo vệ, mã hóa, rate limiting, RBAC, sandbox |
| [10-tracing-observability.md](./10-tracing-observability.md) | Tracing collector, phân cấp span, xuất OTel, trace API |
