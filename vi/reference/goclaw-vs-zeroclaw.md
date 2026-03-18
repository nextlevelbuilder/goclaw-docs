# GoClaw vs ZeroClaw — So sánh toàn diện

GoClaw và ZeroClaw đều thuộc hệ sinh thái ClawFamily, nhưng phục vụ các mục đích khác nhau. Trang này so sánh chi tiết hai dự án trên mọi khía cạnh.

## Tổng quan

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Mục đích** | Gateway AI agent đa người dùng | Runtime agent tối giản, trait-driven |
| **Ngôn ngữ** | Go 1.26 | Rust (edition 2021) |
| **Kích thước binary** | Binary Go tiêu chuẩn | ~8.8MB (stripped) |
| **RAM runtime** | Go GC overhead (thông thường) | <5MB |
| **Thời gian khởi động** | Khởi động Go tiêu chuẩn | <10ms trên core 0.8GHz |
| **Database** | PostgreSQL (bắt buộc) | SQLite (mặc định), PostgreSQL/Qdrant tùy chọn |
| **Định dạng config** | JSON5 (hot-reload) | TOML |

---

## Kiến trúc

| Khía cạnh | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Mô hình** | Gateway phân lớp: Client → Gateway → Scheduler → Agent Loop → Provider/Tools → Store | Module trait-driven: mỗi subsystem có traits file + factory/registry |
| **Mở rộng** | Go interface-based | Trait-based + WASM plugin system (hot-reload) |
| **Đồng thời** | 4 lane semaphore (main/subagent/delegate/cron) | Tokio async runtime (tối ưu features) |
| **Triết lý** | Monolith gateway phục vụ nhiều tenant | Binary đơn chạy mọi nơi, kể cả thiết bị nhúng |

---

## Agent Loop & Tích hợp AI

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **LLM providers** | 13+ (Anthropic native, OpenAI-compat adapter) | 40+ (implementation riêng mỗi provider) |
| **Model mặc định** | Cấu hình qua config.json | `anthropic/claude-sonnet-4.6` qua OpenRouter |
| **Pha nghiên cứu** | Không (agent loop trực tiếp) | Có — agent thu thập thông tin qua tools trước khi trả lời |
| **Phát hiện lặp** | Cảnh báo + break khi tool calls lặp | `LoopDetector` với config riêng |
| **Quản lý context** | Mid-loop compaction tại 75% context window, post-run summarization | Memory loader injection |
| **Extended thinking** | Hỗ trợ (Anthropic thinking blocks) | Chưa ghi nhận |
| **Chiến lược fallback** | RetryDo wrapper với backoff | Reliable wrapper — fallback chains tự động |
| **Định tuyến per-sender** | Override provider/model per-user | Định tuyến model per-sender, hint-based |
| **Phân loại query** | Không | Có — route queries tới sub-models chuyên biệt |

---

## Hệ sinh thái Tools

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Số lượng** | ~50 modules | 70+ modules |
| **Filesystem** | read, write, list, edit | read, write, edit |
| **Shell** | Có, với security approval modes | Có |
| **Web** | fetch + search (Brave, DDG, Perplexity, Tavily) | fetch + search |
| **Browser** | go-rod (Chrome CDP) | fantoccini/WebDriver (tùy chọn) |
| **Memory tools** | pgvector + BM25 full-text | Markdown/SQLite/Postgres/Qdrant backends |
| **MCP** | stdio, SSE, streamable-HTTP | MCP client (stdio) |
| **Media** | Tạo & đọc image, audio, video, document | Image, đọc DOCX/PDF/XLSX/PPTX |
| **Phần cứng** | Không | STM32, Arduino, RPi GPIO, serial, USB |
| **WASM plugins** | Không | Có — hot-reloadable qua wasmtime |
| **Team/subagent** | Shared task boards, delegation sync/async | Delegate/subagent orchestration |
| **Composio** | Không | Có |

---

## Kênh nhắn tin (Channels)

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Số kênh** | 7 | 25+ |
| **Kênh chính** | Telegram, Discord, Slack, WhatsApp, Zalo, Zalo Personal, Feishu/Lark | Telegram, Discord, Slack, Matrix (E2EE), WhatsApp Web, DingTalk, Lark/Feishu, IRC, MQTT, Nostr, Mattermost, Nextcloud Talk, Signal, iMessage, Email, QQ, WATI, GitHub, LinQ, ACP... |
| **Matrix E2EE** | Không | Có (matrix-sdk) |
| **WhatsApp** | Qua bridge URL | Native client (wa-rs) |
| **Email** | Không | SMTP + IMAP |
| **IoT (MQTT)** | Không | Có |

---

## Bảo mật

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Mã hóa** | AES-256-GCM (API keys) | ChaCha20-Poly1305 (AEAD) |
| **Xác thực** | Token/password + RBAC 5 lớp | Pairing code → bearer token |
| **RBAC** | admin/operator/viewer với 5 scopes | AutonomyConfig + deny-by-default tool policy |
| **Chống prompt injection** | Regex-based input guard | Prompt guard + semantic guard + canary guard |
| **Sandboxing** | Docker sandbox | Landlock + Bubblewrap + Firejail + Docker + WASM |
| **Phát hiện rò rỉ** | Chưa ghi nhận | Leak detector chuyên dụng |
| **Bảo vệ symlink** | Chưa ghi nhận | File link guard |
| **Dừng khẩn cấp** | Không | E-stop mechanism |
| **An toàn bộ nhớ** | Go (memory safe mặc định) | `#![forbid(unsafe_code)]` |
| **Giám sát syscall** | Không | Phát hiện bất thường syscall |
| **Audit logging** | slog.Warn("security.*") | Structured audit events với schema |

---

## Hệ thống Memory

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Vector search** | pgvector (HNSW, cosine similarity) | Qdrant (tùy chọn) + SQLite embeddings |
| **Full-text search** | tsvector BM25 (GIN index) | Hybrid retrieval |
| **Backends** | Chỉ PostgreSQL | Markdown files, SQLite, PostgreSQL, Qdrant |
| **Embedding cache** | Hash-based (PostgreSQL) | Chưa ghi nhận |
| **Memory hygiene** | Chưa ghi nhận | Decay/hygiene + snapshot |
| **Response cache** | Chưa ghi nhận | Có |

---

## Cấu hình & Triển khai

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Định dạng config** | JSON5 (hot-reload qua fsnotify) | TOML |
| **Thiết lập** | `goclaw onboard` (TUI tương tác) | CLI setup |
| **Docker** | 10+ compose files cho các chế độ khác nhau | Dockerfile + docker-compose.yml |
| **Nền tảng** | Linux, macOS (server-grade) | Linux (ARM, x86, RISC-V), macOS, Windows, Android/Termux |
| **Package managers** | Chưa có | Homebrew tap, cargo install, Nix flake |
| **Web UI** | React 19 SPA riêng biệt (ui/web/) | Dashboard nhúng (rust-embed, biên dịch vào binary) |
| **Chế độ daemon** | Không (chạy foreground) | Có |
| **Tự cập nhật** | Chưa ghi nhận | Cơ chế update tích hợp |

---

## Khả năng quan sát (Observability)

| | **GoClaw** | **ZeroClaw** |
|---|---|---|
| **Tracing** | PostgreSQL traces tích hợp + OTLP tùy chọn (build-tag gated) | tracing + tracing-subscriber |
| **OpenTelemetry** | OTLP/gRPC hoặc OTLP/HTTP | OTLP (feature flag tùy chọn) |
| **Metrics** | Không có hệ thống riêng | Prometheus 0.14 |
| **LLM call tracing** | Bảng traces + spans riêng | Chưa ghi nhận |

---

## Thế mạnh nổi bật

### GoClaw vượt trội ở

- **Multi-tenancy** — cô lập user thực sự, tách workspace, chia sẻ agent giữa users
- **WebSocket v3 RPC** — protocol hoàn chỉnh với 24 methods và server push events
- **Quản lý context** — mid-loop compaction, ước lượng token thích ứng, summarization sau run
- **Scheduling theo lane** — serialization per-session ngăn race conditions
- **Theo dõi token/chi phí** — budget enforcement hàng tháng per agent
- **I18n** — hỗ trợ đa ngôn ngữ tích hợp (en/vi/zh)
- **Browser pairing** — hệ thống xác thực device-to-channel

### ZeroClaw vượt trội ở

- **Hiệu năng** — <5MB RAM, <10ms khởi động
- **Triển khai edge** — chạy trên STM32, Arduino, RPi, Android/Termux
- **WASM plugins** — hot-reloadable, sandbox in-process
- **Đa dạng channels** — 25+ kênh (gấp 3.5x GoClaw)
- **Đa dạng providers** — 40+ LLM providers (gấp 3x GoClaw)
- **Bảo mật sâu** — 7+ lớp guard, sandboxing cấp OS, E-stop
- **Pha nghiên cứu** — giảm hallucinations bằng fact-checking trước khi trả lời
- **Đa nền tảng** — ARM, RISC-V, Android/Termux
- **Docs đa ngôn ngữ** — 10 ngôn ngữ

---

## Khi nào nên chọn cái nào

| Trường hợp sử dụng | Khuyến nghị |
|---|---|
| Triển khai enterprise đa người dùng | **GoClaw** |
| Thiết bị edge/IoT/nhúng | **ZeroClaw** |
| Môi trường hạn chế tài nguyên | **ZeroClaw** |
| API WebSocket real-time đầy đủ | **GoClaw** |
| Phủ sóng tối đa channels | **ZeroClaw** |
| Phủ sóng tối đa providers | **ZeroClaw** |
| Yêu cầu bảo mật cao | **ZeroClaw** |
| Quản lý context/token nâng cao | **GoClaw** |
| Mở rộng qua plugin (WASM) | **ZeroClaw** |
| Web UI đầy đủ tính năng | **GoClaw** |
| Tích hợp phần cứng | **ZeroClaw** |
| RBAC đa người dùng | **GoClaw** |

**Tóm lại:** GoClaw là gateway đa người dùng server-grade, tối ưu cho tổ chức quản lý nhiều user/agent trên hạ tầng tập trung. ZeroClaw là runtime siêu nhẹ, tối ưu cho mọi nền tảng từ cloud đến edge, với hệ sinh thái tích hợp rộng nhất.

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
