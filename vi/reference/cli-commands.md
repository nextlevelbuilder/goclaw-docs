> Bản dịch từ [English version](../../reference/cli-commands.md)

# CLI Commands

> Tham chiếu đầy đủ mọi lệnh, subcommand, và flag của `goclaw`.

## Tổng quan

Binary `goclaw` là một executable duy nhất vừa khởi động gateway vừa cung cấp các subcommand quản lý. Global flag áp dụng cho tất cả lệnh.

```bash
goclaw [global flags] <command> [subcommand] [flags] [args]
```

**Global flags**

| Flag | Mặc định | Mô tả |
|------|----------|-------|
| `--config <path>` | `config.json` | Đường dẫn config file. Cũng đọc từ `$GOCLAW_CONFIG` |
| `-v`, `--verbose` | false | Bật debug logging |

---

## Gateway (mặc định)

Chạy `goclaw` không có subcommand sẽ khởi động gateway.

```bash
./goclaw
source .env.local && ./goclaw          # với secrets đã load
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

Lần chạy đầu tiên (chưa có config file), setup wizard tự khởi động.

---

## `version`

In phiên bản và protocol number.

```bash
goclaw version
# goclaw v1.2.0 (protocol 3)
```

---

## `onboard`

Wizard cài đặt tương tác — cấu hình provider, model, gateway port, channel, tính năng, và database.

```bash
goclaw onboard
```

Các bước:
1. AI provider + API key (OpenRouter, Anthropic, OpenAI, Groq, DeepSeek, Gemini, Mistral, xAI, MiniMax, Cohere, Perplexity, Claude CLI, Custom)
2. Gateway port (mặc định: 18790)
3. Channels (Telegram, Zalo OA, Feishu/Lark)
4. Tính năng (memory, browser automation)
5. TTS provider
6. PostgreSQL DSN

Lưu `config.json` (không có secrets) và `.env.local` (chỉ secrets).

**Auto-onboard qua environment** — nếu các env var bắt buộc đã đặt, wizard bị bỏ qua và setup chạy non-interactively (hữu ích cho Docker/CI).

---

## `agent`

Quản lý agents — thêm, liệt kê, xóa, và chat.

### `agent list`

Liệt kê tất cả agents đã cấu hình.

```bash
goclaw agent list
goclaw agent list --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

### `agent add`

Wizard tương tác để thêm agent mới.

```bash
goclaw agent add
```

Hỏi: tên agent, display name, provider (hoặc kế thừa), model (hoặc kế thừa), thư mục workspace. Lưu vào `config.json`. Restart gateway để kích hoạt.

### `agent delete`

Xóa agent khỏi config.

```bash
goclaw agent delete <agent-id>
goclaw agent delete researcher --force
```

| Flag | Mô tả |
|------|-------|
| `--force` | Bỏ qua xác nhận |

Cũng xóa các binding tham chiếu đến agent đã xóa.

### `agent chat`

Gửi tin nhắn one-shot đến agent qua gateway đang chạy.

```bash
goclaw agent chat "What files are in the workspace?"
goclaw agent chat --agent researcher "Summarize today's news"
goclaw agent chat --session my-session "Continue where we left off"
```

| Flag | Mặc định | Mô tả |
|------|----------|-------|
| `--agent <id>` | `default` | Target agent ID |
| `--session <key>` | auto | Session key để resume |
| `--json` | false | Output response dạng JSON |

---

## `migrate`

Quản lý database migration. Tất cả subcommand cần `GOCLAW_POSTGRES_DSN`.

```bash
goclaw migrate [--migrations-dir <path>] <subcommand>
```

| Flag | Mô tả |
|------|-------|
| `--migrations-dir <path>` | Đường dẫn thư mục migrations (mặc định: `./migrations`) |

### `migrate up`

Áp dụng tất cả migration đang chờ.

```bash
goclaw migrate up
```

Sau SQL migration, chạy Go-based data hook đang chờ.

### `migrate down`

Rollback migration.

```bash
goclaw migrate down           # rollback 1 bước
goclaw migrate down -n 3      # rollback 3 bước
```

| Flag | Mặc định | Mô tả |
|------|----------|-------|
| `-n`, `--steps <n>` | 1 | Số bước rollback |

### `migrate version`

Hiển thị phiên bản migration hiện tại.

```bash
goclaw migrate version
# version: 10, dirty: false
```

### `migrate force <version>`

Force-set phiên bản migration mà không áp dụng SQL (dùng sau khi sửa thủ công).

```bash
goclaw migrate force 9
```

### `migrate goto <version>`

Migrate đến phiên bản cụ thể (lên hoặc xuống).

```bash
goclaw migrate goto 5
```

### `migrate drop`

**NGUY HIỂM.** Drop tất cả bảng.

```bash
goclaw migrate drop
```

---

## `upgrade`

Upgrade database schema và chạy data migration. Idempotent — an toàn khi chạy nhiều lần.

```bash
goclaw upgrade
goclaw upgrade --dry-run    # xem trước không áp dụng
goclaw upgrade --status     # hiện trạng thái upgrade hiện tại
```

| Flag | Mô tả |
|------|-------|
| `--dry-run` | Hiển thị những gì sẽ làm mà không áp dụng |
| `--status` | Hiển thị phiên bản schema và hook đang chờ |

Gateway khởi động cũng kiểm tra schema compatibility. Đặt `GOCLAW_AUTO_UPGRADE=true` để tự upgrade khi khởi động.

---

## `pairing`

Quản lý device pairing — phê duyệt, liệt kê, và thu hồi thiết bị đã pair.

### `pairing list`

Liệt kê pairing request đang chờ và thiết bị đã pair.

```bash
goclaw pairing list
```

### `pairing approve [code]`

Phê duyệt pairing code. Chọn tương tác nếu không có code.

```bash
goclaw pairing approve              # picker tương tác
goclaw pairing approve ABCD1234    # phê duyệt code cụ thể
```

### `pairing revoke <channel> <senderId>`

Thu hồi thiết bị đã pair.

```bash
goclaw pairing revoke telegram 123456789
```

---

## `sessions`

Xem và quản lý chat session. Cần gateway đang chạy.

### `sessions list`

Liệt kê tất cả session.

```bash
goclaw sessions list
goclaw sessions list --agent researcher
goclaw sessions list --json
```

| Flag | Mô tả |
|------|-------|
| `--agent <id>` | Lọc theo agent ID |
| `--json` | Output dạng JSON |

### `sessions delete <key>`

Xóa một session.

```bash
goclaw sessions delete "telegram:123456789"
```

### `sessions reset <key>`

Xóa lịch sử session trong khi giữ lại session record.

```bash
goclaw sessions reset "telegram:123456789"
```

---

## `cron`

Quản lý scheduled cron job. Cần gateway đang chạy.

### `cron list`

Liệt kê cron job.

```bash
goclaw cron list
goclaw cron list --all      # bao gồm job đã tắt
goclaw cron list --json
```

| Flag | Mô tả |
|------|-------|
| `--all` | Bao gồm job đã tắt |
| `--json` | Output dạng JSON |

### `cron delete <jobId>`

Xóa cron job.

```bash
goclaw cron delete 3f5a8c2b
```

### `cron toggle <jobId> <true|false>`

Bật hoặc tắt cron job.

```bash
goclaw cron toggle 3f5a8c2b true
goclaw cron toggle 3f5a8c2b false
```

---

## `config`

Xem và quản lý cấu hình.

### `config show`

Hiển thị cấu hình hiện tại với secrets đã che.

```bash
goclaw config show
```

### `config path`

In đường dẫn config file đang dùng.

```bash
goclaw config path
# /home/user/goclaw/config.json
```

### `config validate`

Kiểm tra cú pháp và cấu trúc config file.

```bash
goclaw config validate
# Config at config.json is valid.
```

---

## `channels`

Liệt kê và quản lý messaging channel.

### `channels list`

Liệt kê các channel đã cấu hình và trạng thái của chúng.

```bash
goclaw channels list
goclaw channels list --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

Các cột output: `CHANNEL`, `ENABLED`, `CREDENTIALS` (ok/missing).

---

## `skills`

Liệt kê và kiểm tra skills.

**Thư mục store** (tìm kiếm theo thứ tự):

1. `{workspace}/skills/` — skills riêng cho agent (workspace per-agent, file-based)
2. `~/.goclaw/skills/` — skills global chia sẻ tất cả agents (file-based)
3. `~/.goclaw/skills-store/` — managed skills upload qua API/dashboard (nội dung file lưu ở đây, metadata trong PostgreSQL)

### `skills list`

Liệt kê tất cả skills có sẵn.

```bash
goclaw skills list
goclaw skills list --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

### `skills show <name>`

Hiển thị nội dung và metadata cho một skill cụ thể.

```bash
goclaw skills show sequential-thinking
```

---

## `models`

Liệt kê AI model và provider đã cấu hình.

### `models list`

```bash
goclaw models list
goclaw models list --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

Hiển thị model mặc định, per-agent overrides, và provider nào đã cấu hình API key.

---

## `doctor`

Kiểm tra môi trường hệ thống và sức khỏe cấu hình.

```bash
goclaw doctor
```

Kiểm tra: phiên bản binary, config file, kết nối database, phiên bản schema, providers, channels, binary bên ngoài (docker, curl, git), thư mục workspace.

---

## `auth`

Quản lý OAuth authentication cho LLM provider. Cần gateway đang chạy.

### `auth status`

Hiển thị trạng thái OAuth authentication (hiện tại: OpenAI OAuth).

```bash
goclaw auth status
```

Dùng env var `GOCLAW_GATEWAY_URL`, `GOCLAW_HOST`, `GOCLAW_PORT`, và `GOCLAW_TOKEN` để kết nối.

### `auth logout [provider]`

Xóa OAuth token đã lưu.

```bash
goclaw auth logout          # xóa OpenAI OAuth token
goclaw auth logout openai
```

---

## Tiếp theo

- [WebSocket Protocol](./websocket-protocol.md) — tham chiếu wire protocol của gateway
- [REST API](./rest-api.md) — danh sách HTTP API endpoint
- [Config Reference](./config-reference.md) — schema đầy đủ `config.json`
