> Bản dịch từ [English version](/env-vars)

# Environment Variables

> Tất cả biến môi trường mà GoClaw nhận, phân nhóm theo danh mục.

## Tổng quan

GoClaw đọc biến môi trường khi khởi động và áp dụng chúng lên trên `config.json`. Biến môi trường luôn ưu tiên hơn giá trị trong file. Secrets (API key, token, DSN) không bao giờ đặt trong `config.json` — để trong `.env.local` hoặc inject dưới dạng biến môi trường trong deployment.

```bash
# Load secrets và khởi động
source .env.local && ./goclaw

# Hoặc truyền inline
GOCLAW_POSTGRES_DSN="postgres://..." GOCLAW_GATEWAY_TOKEN="..." ./goclaw
```

---

## Gateway

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `GOCLAW_GATEWAY_TOKEN` | Có | Bearer token để xác thực WebSocket và HTTP API |
| `GOCLAW_ENCRYPTION_KEY` | Có | AES-256-GCM key để mã hóa provider API key trong database. Tạo bằng `openssl rand -hex 32` |
| `GOCLAW_CONFIG` | Không | Đường dẫn `config.json`. Mặc định: `./config.json` |
| `GOCLAW_HOST` | Không | Gateway listen host. Mặc định: `0.0.0.0` |
| `GOCLAW_PORT` | Không | Gateway listen port. Mặc định: `18790` |
| `GOCLAW_OWNER_IDS` | Không | User ID có quyền admin/owner, phân cách bằng dấu phẩy (ví dụ `user1,user2`) |
| `GOCLAW_AUTO_UPGRADE` | Không | Đặt `true` để tự chạy DB migration khi gateway khởi động |
| `GOCLAW_DATA_DIR` | Không | Thư mục data cho gateway state. Mặc định: `~/.goclaw/data` |
| `GOCLAW_MIGRATIONS_DIR` | Không | Đường dẫn thư mục migrations. Mặc định: `./migrations` |
| `GOCLAW_GATEWAY_URL` | Không | Gateway URL đầy đủ cho lệnh CLI `auth` (ví dụ `http://localhost:18790`) |
| `GOCLAW_ALLOWED_ORIGINS` | Không | Danh sách CORS allowed origins phân cách bằng dấu phẩy (ghi đè config file). Ví dụ: `https://app.example.com,https://admin.example.com` |

---

## Database

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `GOCLAW_POSTGRES_DSN` | Có | Chuỗi kết nối PostgreSQL. Ví dụ: `postgres://user:pass@localhost:5432/goclaw?sslmode=disable` |

> DSN cố ý không đặt trong `config.json` — đây là secret. Chỉ đặt qua environment.

---

## LLM Providers

API key từ environment ghi đè mọi giá trị trong `config.json`. Đặt key ở đây cũng tự bật provider.

| Biến | Provider |
|------|----------|
| `GOCLAW_ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `GOCLAW_ANTHROPIC_BASE_URL` | Anthropic custom endpoint |
| `GOCLAW_OPENAI_API_KEY` | OpenAI (GPT) |
| `GOCLAW_OPENAI_BASE_URL` | OpenAI-compatible custom endpoint |
| `GOCLAW_OPENROUTER_API_KEY` | OpenRouter |
| `GOCLAW_GROQ_API_KEY` | Groq |
| `GOCLAW_DEEPSEEK_API_KEY` | DeepSeek |
| `GOCLAW_GEMINI_API_KEY` | Google Gemini |
| `GOCLAW_MISTRAL_API_KEY` | Mistral AI |
| `GOCLAW_XAI_API_KEY` | xAI (Grok) |
| `GOCLAW_MINIMAX_API_KEY` | MiniMax |
| `GOCLAW_COHERE_API_KEY` | Cohere |
| `GOCLAW_PERPLEXITY_API_KEY` | Perplexity |
| `GOCLAW_DASHSCOPE_API_KEY` | Alibaba DashScope |
| `GOCLAW_BAILIAN_API_KEY` | Alibaba Bailian |
| `GOCLAW_OLLAMA_HOST` | URL server Ollama (ví dụ `http://localhost:11434`) |
| `GOCLAW_OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key |
| `GOCLAW_OLLAMA_CLOUD_API_BASE` | URL base tùy chỉnh cho Ollama Cloud |

### Provider & Model Defaults

| Biến | Mô tả |
|------|-------|
| `GOCLAW_PROVIDER` | Tên LLM provider mặc định (ghi đè `agents.defaults.provider` trong config) |
| `GOCLAW_MODEL` | Model ID mặc định (ghi đè `agents.defaults.model` trong config) |

---

## Claude CLI Provider

| Biến | Mô tả |
|------|-------|
| `GOCLAW_CLAUDE_CLI_PATH` | Đường dẫn đến binary `claude`. Mặc định: `claude` (từ PATH) |
| `GOCLAW_CLAUDE_CLI_MODEL` | Model alias cho Claude CLI (ví dụ `sonnet`, `opus`, `haiku`) |
| `GOCLAW_CLAUDE_CLI_WORK_DIR` | Thư mục làm việc base cho Claude CLI session |

---

## Channels

Đặt token/credential qua environment sẽ tự bật channel đó.

| Biến | Channel | Mô tả |
|------|---------|-------|
| `GOCLAW_TELEGRAM_TOKEN` | Telegram | Bot token từ @BotFather |
| `GOCLAW_DISCORD_TOKEN` | Discord | Bot token |
| `GOCLAW_ZALO_TOKEN` | Zalo OA | Zalo OA access token |
| `GOCLAW_LARK_APP_ID` | Feishu/Lark | App ID |
| `GOCLAW_LARK_APP_SECRET` | Feishu/Lark | App secret |
| `GOCLAW_LARK_ENCRYPT_KEY` | Feishu/Lark | Encryption key cho event |
| `GOCLAW_LARK_VERIFICATION_TOKEN` | Feishu/Lark | Verification token cho event |
| `GOCLAW_WHATSAPP_ENABLED` | WhatsApp | Bật WhatsApp channel (`true`/`false`) |
| `GOCLAW_SLACK_BOT_TOKEN` | Slack | Bot User OAuth Token (`xoxb-...`) — tự bật Slack |
| `GOCLAW_SLACK_APP_TOKEN` | Slack | App-Level Token cho Socket Mode (`xapp-...`) |
| `GOCLAW_SLACK_USER_TOKEN` | Slack | User OAuth Token tùy chọn (`xoxp-...`) |

---

## Text-to-Speech (TTS)

| Biến | Mô tả |
|------|-------|
| `GOCLAW_TTS_OPENAI_API_KEY` | OpenAI TTS API key |
| `GOCLAW_TTS_ELEVENLABS_API_KEY` | ElevenLabs TTS API key |
| `GOCLAW_TTS_MINIMAX_API_KEY` | MiniMax TTS API key |
| `GOCLAW_TTS_MINIMAX_GROUP_ID` | MiniMax group ID |

---

## Workspace & Skills

| Biến | Mô tả |
|------|-------|
| `GOCLAW_WORKSPACE` | Thư mục workspace mặc định cho agent. Mặc định: `~/.goclaw/workspace` |
| `GOCLAW_SESSIONS_STORAGE` | Đường dẫn lưu session (legacy). Mặc định: `~/.goclaw/sessions` |
| `GOCLAW_SKILLS_DIR` | Thư mục skills global. Mặc định: `~/.goclaw/skills` |
| `GOCLAW_BUILTIN_SKILLS_DIR` | Đường dẫn đến định nghĩa built-in skill. Mặc định: `./builtin-skills` |
| `GOCLAW_BUNDLED_SKILLS_DIR` | Đường dẫn đến gói bundled skill. Mặc định: `./bundled-skills` |

## Runtime Packages (Docker v3)

Các biến này cấu hình nơi cài đặt các runtime package (pip/npm) theo yêu cầu bên trong container. Được tự động đặt bởi Docker entrypoint — chỉ ghi đè nếu bạn có layout cài đặt tùy chỉnh.

| Biến | Mặc định (Docker) | Mô tả |
|------|------------------|-------|
| `PIP_TARGET` | `/app/data/.runtime/pip` | Thư mục pip cài Python package vào lúc runtime |
| `PYTHONPATH` | `/app/data/.runtime/pip` | Đường dẫn tìm module Python — phải bao gồm `PIP_TARGET` để package đã cài có thể import được |
| `NPM_CONFIG_PREFIX` | `/app/data/.runtime/npm-global` | npm global prefix cho cài đặt Node.js package runtime |

> Các thư mục này được mount trên data volume để package tồn tại qua các lần tạo lại container. Binary `pkg-helper` (chạy với quyền root) quản lý package hệ thống (`apk`); pip/npm cài dưới quyền user `goclaw`.

---

## Sandbox (Docker)

| Biến | Mô tả |
|------|-------|
| `GOCLAW_SANDBOX_MODE` | `"off"`, `"non-main"`, hoặc `"all"` |
| `GOCLAW_SANDBOX_IMAGE` | Docker image cho sandbox container |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `"none"`, `"ro"`, hoặc `"rw"` |
| `GOCLAW_SANDBOX_SCOPE` | `"session"`, `"agent"`, hoặc `"shared"` |
| `GOCLAW_SANDBOX_MEMORY_MB` | Giới hạn memory (MB) |
| `GOCLAW_SANDBOX_CPUS` | Giới hạn CPU (float, ví dụ `"1.5"`) |
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | Timeout thực thi (giây) |
| `GOCLAW_SANDBOX_NETWORK` | `"true"` để bật truy cập mạng container |

---

## Concurrency / Scheduler

Giới hạn lane-based cho số lượng agent chạy đồng thời.

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `GOCLAW_LANE_MAIN` | `30` | Số lượng main agent chạy đồng thời tối đa |
| `GOCLAW_LANE_SUBAGENT` | `50` | Số lượng subagent chạy đồng thời tối đa |
| `GOCLAW_LANE_DELEGATE` | `100` | Số lượng delegated agent chạy đồng thời tối đa |
| `GOCLAW_LANE_CRON` | `30` | Số lượng cron job chạy đồng thời tối đa |

---

## Telemetry (OpenTelemetry)

Cần build tag `otel` (`go build -tags otel`).

| Biến | Mô tả |
|------|-------|
| `GOCLAW_TELEMETRY_ENABLED` | `"true"` để bật OTLP export |
| `GOCLAW_TELEMETRY_ENDPOINT` | OTLP endpoint (ví dụ `localhost:4317`) |
| `GOCLAW_TELEMETRY_PROTOCOL` | `"grpc"` (mặc định) hoặc `"http"` |
| `GOCLAW_TELEMETRY_INSECURE` | `"true"` để bỏ qua TLS verification |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | OTEL service name. Mặc định: `goclaw-gateway` |

---

## Tailscale

Cần build tag `tsnet` (`go build -tags tsnet`).

| Biến | Mô tả |
|------|-------|
| `GOCLAW_TSNET_HOSTNAME` | Tên máy Tailscale (ví dụ `goclaw-gateway`) |
| `GOCLAW_TSNET_AUTH_KEY` | Tailscale auth key — không bao giờ lưu trong config.json |
| `GOCLAW_TSNET_DIR` | Thư mục state lâu dài |

---

## Debugging & Tracing

| Biến | Mô tả |
|------|-------|
| `GOCLAW_TRACE_VERBOSE` | Đặt `1` để log toàn bộ LLM input trong trace span |
| `GOCLAW_BROWSER_REMOTE_URL` | Kết nối remote browser qua Chrome DevTools Protocol URL. Tự bật browser tool |
| `GOCLAW_REDIS_DSN` | Chuỗi kết nối Redis (ví dụ `redis://redis:6379/0`). Cần build với `-tags redis` |

---

## Ví dụ `.env.local` tối giản

Được tạo bởi `goclaw onboard`. Giữ file này ngoài version control.

```bash
# Bắt buộc
GOCLAW_GATEWAY_TOKEN=your-gateway-token
GOCLAW_ENCRYPTION_KEY=your-32-byte-hex-key
GOCLAW_POSTGRES_DSN=postgres://user:pass@localhost:5432/goclaw?sslmode=disable

# LLM provider (chọn một trong số này)
GOCLAW_OPENROUTER_API_KEY=sk-or-...
# GOCLAW_ANTHROPIC_API_KEY=sk-ant-...
# GOCLAW_OPENAI_API_KEY=sk-...

# Channels (tùy chọn)
# GOCLAW_TELEGRAM_TOKEN=123456789:ABC...

# Debug (tùy chọn)
# GOCLAW_TRACE_VERBOSE=1
```

---

## Tiếp theo

- [Config Reference](/config-reference) — các field `config.json` tương ứng mỗi danh mục
- [CLI Commands](/cli-commands) — `goclaw onboard` tự tạo `.env.local`
- [Database Schema](/database-schema) — secrets được lưu mã hóa trong PostgreSQL như thế nào

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
