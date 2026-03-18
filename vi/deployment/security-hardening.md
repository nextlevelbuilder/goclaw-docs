> Bản dịch từ [English version](#deploy-security)

# Security Hardening

> GoClaw dùng năm lớp bảo vệ độc lập — transport, input, tools, output, và isolation — để bypass một lớp không ảnh hưởng đến các lớp còn lại.

## Tổng quan

Mỗi lớp hoạt động độc lập. Cùng nhau chúng tạo thành kiến trúc defense-in-depth bao phủ toàn bộ request lifecycle từ WebSocket connection đến tool execution output của agent.

```mermaid
flowchart TD
    REQ["Incoming Request"] --> L1["Lớp 1: Transport\nCORS · size limits · timing-safe auth · rate limiting"]
    L1 --> L2["Lớp 2: Input\nInjection detection · message truncation · ILIKE escape"]
    L2 --> L3["Lớp 3: Tools\nShell deny patterns · path traversal · SSRF · exec approval · file serving protection"]
    L3 --> L4["Lớp 4: Output\nCredential scrubbing · web content tagging · MCP content tagging"]
    L4 --> L5["Lớp 5: Isolation\nPer-user workspace · Docker sandbox"]
```

---

## Lớp 1: Transport Security

Kiểm soát những gì đến được gateway ở cấp network và HTTP.

| Cơ chế | Chi tiết |
|--------|---------|
| CORS | `checkOrigin()` kiểm tra với `gateway.allowed_origins`; danh sách trống cho phép tất cả (tương thích ngược) |
| Giới hạn WebSocket message | 512 KB — gorilla/websocket tự đóng khi vượt quá |
| Giới hạn HTTP body | 1 MB — áp dụng trước khi decode JSON |
| Token auth | `crypto/subtle.ConstantTimeCompare` — kiểm tra bearer token an toàn về thời gian |
| Rate limiting | Token bucket mỗi user/IP; cấu hình qua `gateway.rate_limit_rpm` (0 = tắt) |

**Hành động hardening:**

```json
{
  "gateway": {
    "allowed_origins": ["https://your-dashboard.example.com"],
    "rate_limit_rpm": 20
  }
}
```

Đặt `allowed_origins` theo domain dashboard trong production. Để trống chỉ khi bạn kiểm soát tất cả WebSocket client.

---

## Lớp 2: Input — Injection Detection

Input guard quét mọi tin nhắn user để tìm 6 pattern prompt injection trước khi đến LLM.

| Pattern ID | Phát hiện |
|-----------|---------|
| `ignore_instructions` | "ignore all previous instructions" |
| `role_override` | "you are now…", "pretend you are…" |
| `system_tags` | `<system>`, `[SYSTEM]`, `[INST]`, `<<SYS>>` |
| `instruction_injection` | "new instructions:", "override:", "system prompt:" |
| `null_bytes` | Ký tự null `\x00` (cố ý obfuscate) |
| `delimiter_escape` | "end of system", `</instructions>`, `</prompt>` |

**Hành động có thể cấu hình** qua `gateway.injection_action`:

| Giá trị | Hành vi |
|---------|---------|
| `"off"` | Tắt hoàn toàn |
| `"log"` | Log ở info level, tiếp tục |
| `"warn"` (mặc định) | Log ở warning level, tiếp tục |
| `"block"` | Log warning, trả lỗi, dừng xử lý |

Với deployment public-facing hoặc multi-user agent chia sẻ, dùng `"block"`.

**Message truncation:** Tin nhắn vượt `gateway.max_message_chars` (mặc định 32,000) bị cắt bớt — không bị reject — và LLM được thông báo về việc cắt bớt.

**ILIKE ESCAPE:** Tất cả database ILIKE query (search/filter) đều escape ký tự `%`, `_`, và `\` trước khi thực thi, ngăn chặn tấn công SQL wildcard injection.

---

## Lớp 3: Tool Security

Bảo vệ khỏi command execution nguy hiểm, truy cập file trái phép, và server-side request forgery.

### Shell deny patterns

7 danh mục lệnh luôn bị chặn dù exec approval config là gì:

| Danh mục | Ví dụ |
|----------|-------|
| Xóa file destructive | `rm -rf`, `del /f`, `rmdir /s` |
| Thao tác disk destructive | `mkfs`, `dd if=`, `> /dev/sd*` |
| System commands | `shutdown`, `reboot`, `poweroff` |
| Fork bombs | `:(){ ... };:` |
| Remote code execution | `curl \| sh`, `wget -O - \| sh` |
| Reverse shells | `/dev/tcp/`, `nc -e` |
| Eval injection | `eval $()`, `base64 -d \| sh` |

### Path traversal prevention

`resolvePath()` áp dụng `filepath.Clean()` rồi `HasPrefix()` để đảm bảo tất cả file path nằm trong workspace của agent. Với `restrict_to_workspace: true` (mặc định trên agents), bất kỳ path nào ngoài workspace đều bị chặn.

Bốn filesystem tool (`read_file`, `write_file`, `list_files`, `edit`) đều implement interface `PathDenyable`. Agent loop gọi `DenyPaths(".goclaw")` khi khởi động — agent không thể đọc thư mục internal của GoClaw. Tool `list_files` lọc bỏ hoàn toàn các path bị deny khỏi directory listing.

### Bảo vệ path traversal khi serve file

Endpoint serve file (`/v1/files/...`) kiểm tra tất cả path được yêu cầu để ngăn chặn tấn công directory traversal. Bất kỳ path nào chứa chuỗi `../` hoặc resolve ra ngoài thư mục cho phép đều bị từ chối với lỗi 400.

### SSRF protection (3 bước kiểm tra)

Áp dụng cho tất cả URL fetch outbound của tool `web_fetch`:

```mermaid
flowchart TD
    U["URL cần fetch"] --> S1["Bước 1: Hostname bị chặn\nlocalhost · *.local · *.internal\nmetadata.google.internal"]
    S1 --> S2["Bước 2: IP range private\n10.0.0.0/8 · 172.16.0.0/12\n192.168.0.0/16 · 127.0.0.0/8\n169.254.0.0/16 · IPv6 loopback"]
    S2 --> S3["Bước 3: DNS pinning\nResolve domain · kiểm tra từng IP đã resolve\nÁp dụng cho cả redirect target"]
    S3 --> A["Cho phép request"]
```

### Credentialed exec (Direct Exec Mode)

Với các tool cần credentials (ví dụ: `gh`, `aws`), GoClaw dùng direct process execution thay vì shell — loại bỏ hoàn toàn khả năng shell injection.

4 lớp bảo vệ:
1. **Không dùng shell** — `exec.CommandContext(binary, args...)`, không bao giờ `sh -c`
2. **Kiểm tra path** — binary được resolve thành absolute path qua `exec.LookPath()`, khớp với config
3. **Deny patterns** — danh sách regex deny theo từng binary cho arguments (`deny_args`) và verbose flags (`deny_verbose`)
4. **Output scrubbing** — credentials đăng ký lúc runtime được scrub khỏi stdout/stderr

Shell metacharacter (`;`, `|`, `&`, `$()`, backtick) được phát hiện và từ chối trước khi thực thi.

### Exec approval

Xem [Exec Approval](#exec-approval) để biết flow phê duyệt đầy đủ. Tối thiểu, bật `ask: "on-miss"` để hỏi trước khi chạy các network và infrastructure tool:

```json
{
  "tools": {
    "execApproval": {
      "security": "full",
      "ask": "on-miss"
    }
  }
}
```

---

## Lớp 4: Output Security

Ngăn secrets rò rỉ qua tool output hoặc LLM response.

### Credential scrubbing (tự động)

Tất cả tool output đi qua regex scrubber để redact các secret format đã biết. Thay thế bằng `[REDACTED]`:

| Pattern | Ví dụ |
|---------|-------|
| OpenAI keys | `sk-...` |
| Anthropic keys | `sk-ant-...` |
| GitHub tokens | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` |
| AWS access keys | `AKIA...` |
| Connection strings | `postgres://...`, `mysql://...` |
| Env var patterns | `KEY=...`, `SECRET=...`, `DSN=...` |
| Chuỗi hex dài | Chuỗi hex 64+ ký tự |
| DSN / database URLs | `DSN=...`, `DATABASE_URL=...`, `REDIS_URL=...`, `MONGO_URI=...` |
| Generic key-value | `api_key=...`, `token=...`, `secret=...`, `bearer=...` (không phân biệt hoa thường) |
| Runtime env vars | Các pattern `VIRTUAL_*=...` |

13 regex pattern tổng cộng bao phủ tất cả các secret format phổ biến.

Scrubbing bật mặc định. Để tắt (không khuyến nghị):

```json
{ "tools": { "scrub_credentials": false } }
```

Bạn cũng có thể đăng ký runtime values để scrub động (ví dụ server IP phát hiện lúc runtime) qua `AddDynamicScrubValues()` trong custom tool integrations.

### MCP content tagging

Kết quả từ MCP tool call được bọc trong cùng untrusted-content marker như web fetch:

```
<<<EXTERNAL_UNTRUSTED_CONTENT>>>
[kết quả MCP tool ở đây]
<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>
```

Điều này ngăn chặn prompt injection từ MCP server độc hại — LLM được hướng dẫn không coi nội dung được tag là instructions.

### Web content tagging

Nội dung fetch từ URL bên ngoài được bọc:

```
<<<EXTERNAL_UNTRUSTED_CONTENT>>>
[nội dung fetch ở đây]
<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>
```

Điều này báo hiệu cho LLM rằng nội dung không đáng tin và không được coi là instructions.

Các content marker được bảo vệ chống Unicode homoglyph spoofing — GoClaw sanitize các ký tự trông giống nhau (ví dụ: chữ `а` Cyrillic vs chữ `a` Latin) để ngăn nội dung bên ngoài giả mạo boundary marker.

---

## Lớp 5: Isolation

### Per-user workspace isolation

Mỗi user có một thư mục sandbox riêng. Hai cấp độ:

| Cấp độ | Pattern thư mục |
|--------|----------------|
| Per-agent | `~/.goclaw/{agent-key}-workspace/` |
| Per-user | `{agent-workspace}/user_{sanitized_user_id}/` |

User ID được sanitize — ký tự ngoài `[a-zA-Z0-9_-]` trở thành gạch dưới. Ví dụ: `group:telegram:-1001234` → `group_telegram_-1001234`.

### Docker sandbox

Để agent thực thi shell trong môi trường cô lập, bật Docker sandbox:

```bash
# Build sandbox image
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .
```

```json
{
  "sandbox": {
    "mode": "all",
    "image": "goclaw-sandbox:bookworm-slim",
    "workspace_access": "rw",
    "scope": "session"
  }
}
```

Container hardening áp dụng tự động:

| Cài đặt | Giá trị |
|---------|---------|
| Root filesystem | Read-only (`--read-only`) |
| Capabilities | Tất cả bị drop (`--cap-drop ALL`) |
| Quyền mới | Vô hiệu hóa (`--security-opt no-new-privileges`) |
| Giới hạn memory | 512 MB |
| Giới hạn CPU | 1.0 |
| Network | Tắt (`--network none`) |
| Max output | 1 MB |
| Timeout | 300 giây |

Sandbox modes: `off` (exec trực tiếp trên host), `non-main` (sandbox tất cả trừ main agent), `all` (sandbox mọi agent).

---

## Encryption

Secrets lưu trong PostgreSQL được mã hóa AES-256-GCM:

| Gì | Bảng | Cột |
|----|-------|-----|
| LLM provider API keys | `llm_providers` | `api_key` |
| MCP server API keys | `mcp_servers` | `api_key` |
| Custom tool env vars | `custom_tools` | `env` |
| Channel credentials | `channel_instances` | `credentials` |

Đặt encryption key trước lần chạy đầu:

```bash
# Tạo key mạnh
openssl rand -hex 32

# Thêm vào .env
GOCLAW_ENCRYPTION_KEY=your-64-char-hex-key
```

Format lưu: `"aes-gcm:" + base64(12-byte nonce + ciphertext + GCM tag)`. Giá trị không có prefix được trả về plaintext để tương thích migration.

---

## RBAC — 3 Role

WebSocket RPC method và HTTP endpoint được kiểm soát theo role. Role có thứ bậc.

| Role | Quyền chính |
|------|-------------|
| **Viewer** | `agents.list`, `config.get`, `sessions.list`, `health`, `status`, `skills.list` |
| **Operator** | + `chat.send`, `chat.abort`, `sessions.delete/reset`, `cron.*`, `skills.update` |
| **Admin** | + `config.apply/patch`, `agents.create/update/delete`, `channels.toggle`, `device.pair.approve/revoke` |

### API Keys

Để kiểm soát truy cập chi tiết hơn, hãy tạo API key có scope thay vì chia sẻ gateway token. Key được hash bằng SHA-256 trước khi lưu và cache trong 5 phút.

Thứ tự ưu tiên xác thực:
1. **Gateway token** → Admin role (toàn quyền)
2. **API key** → Role được suy ra từ scopes
3. **Không có token** → Operator (tương thích ngược)

Các scope có sẵn:

| Scope | Cấp độ truy cập |
|-------|----------------|
| `operator.admin` | Toàn quyền admin |
| `operator.read` | Chỉ đọc (tương đương viewer) |
| `operator.write` | Đọc + ghi |
| `operator.approvals` | Quản lý exec approval |
| `operator.pairing` | Quản lý device pairing |

API key được truyền qua header `Authorization: Bearer {key}`, giống như gateway token.

---

## Hardening Checklist

Dùng trước khi expose GoClaw ra internet hoặc cho người dùng chia sẻ:

- [ ] Đặt `GOCLAW_GATEWAY_TOKEN` bằng token ngẫu nhiên mạnh
- [ ] Đặt `GOCLAW_ENCRYPTION_KEY` bằng key ngẫu nhiên 32 byte (64 ký tự hex)
- [ ] Đặt `gateway.allowed_origins` theo domain dashboard
- [ ] Đặt `gateway.rate_limit_rpm` (ví dụ `20`) để giới hạn request rate mỗi user
- [ ] Đặt `gateway.injection_action` thành `"block"` cho các deployment public-facing
- [ ] Bật exec approval với `tools.execApproval.ask: "on-miss"` (hoặc `"always"`)
- [ ] Bật Docker sandbox với `sandbox.mode: "all"` cho workload agent không tin cậy
- [ ] Đặt `POSTGRES_PASSWORD` bằng mật khẩu mạnh (không dùng mặc định `"goclaw"`)
- [ ] Bật TLS trên PostgreSQL (`sslmode=require` trong DSN)
- [ ] Review `gateway.owner_ids` — chỉ user ID tin cậy mới có quyền owner
- [ ] Đặt `agents.restrict_to_workspace: true` (đây là mặc định — không tắt)
- [ ] Tạo scoped API key cho các integration thay vì chia sẻ gateway token
- [ ] Cấu hình `tools.credentialed_exec` cho các CLI tool integration an toàn (gh, aws, v.v.)

---

## Security Logging

Tất cả security event log ở `slog.Warn` với prefix `security.*`:

| Event | Ý nghĩa |
|-------|---------|
| `security.injection_detected` | Phát hiện prompt injection pattern |
| `security.injection_blocked` | Tin nhắn bị reject (action = block) |
| `security.rate_limited` | Request bị reject bởi rate limiter |
| `security.cors_rejected` | WebSocket connection bị reject bởi CORS policy |
| `security.message_truncated` | Tin nhắn bị cắt ở `max_message_chars` |

Lọc tất cả security event:

```bash
./goclaw 2>&1 | grep '"security\.'
# hoặc với structured logs:
journalctl -u goclaw | grep 'security\.'
```

---

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Tin nhắn hợp lệ bị chặn | `injection_action: "block"` quá chặt | Chuyển sang `"warn"` và review logs trước khi bật lại block |
| Agent đọc được file ngoài workspace | `restrict_to_workspace: false` trên agent | Bật lại (mặc định là `true`) |
| Credentials xuất hiện trong tool output | `scrub_credentials: false` | Xóa override đó — scrubbing bật mặc định |
| Sandbox không cô lập được | Sandbox mode là `"off"` | Đặt `sandbox.mode` thành `"non-main"` hoặc `"all"` |
| Encryption key chưa đặt | `GOCLAW_ENCRYPTION_KEY` trống | Đặt trước lần chạy đầu; rotate cần re-encrypt stored secrets |

---

## Tiếp theo

- [Exec Approval](#exec-approval) — human-in-the-loop cho shell commands
- [Sandbox](#sandbox) — chi tiết cấu hình Docker sandbox
- [Docker Compose](#deploy-docker-compose) — deploy với security settings qua compose overlays
- [Database Setup](#deploy-database) — PostgreSQL TLS và encrypted secret storage

<!-- goclaw-source: 120fc2d | cập nhật: 2026-03-18 -->
