> Bản dịch từ [English version](/cli-commands)

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
| `--server <url>` | — | Ghi đè URL gateway server cho các lệnh dựa trên HTTP (traces, skills, v.v.). Fallback về `$GOCLAW_SERVER`, rồi `$GOCLAW_GATEWAY_URL` |
| `--token <token>` | — | Ghi đè gateway bearer token. Fallback về `$GOCLAW_GATEWAY_TOKEN` |

---

## Gateway (mặc định)

Chạy `goclaw` không có subcommand sẽ khởi động gateway.

```bash
./goclaw
source .env.local && ./goclaw          # với secrets đã load
GOCLAW_CONFIG=/etc/goclaw.json ./goclaw
```

Lần chạy đầu tiên (chưa có config file), setup wizard tự khởi động.

Lệnh `gateway` được tách thành các file chuyên biệt để dễ bảo trì:

| File | Trách nhiệm |
|------|------------|
| `gateway_deps.go` | Khởi tạo và kết nối dependency |
| `gateway_http_wiring.go` | Thiết lập HTTP server và đăng ký route |
| `gateway_events.go` | Kết nối event bus |
| `gateway_lifecycle.go` | Khởi động, tắt máy, và xử lý signal |
| `gateway_tools_wiring.go` | Đăng ký tool và thiết lập exec workspace |
| `gateway_providers.go` | Đăng ký provider từ config và database |
| `gateway_vault_wiring.go` | Kết nối vault và memory store |
| `gateway_evolution_cron.go` | Lên lịch evolution và cron job nền |

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

Phiên bản TUI của onboard cũng có sẵn khi terminal hỗ trợ (`tui_onboard.go`). Tự động fallback sang chế độ tương tác thông thường nếu không hỗ trợ.

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

Chat tương tác với agent hoặc gửi tin nhắn one-shot qua gateway đang chạy.

```bash
goclaw agent chat
goclaw agent chat --name researcher -m "Summarize today's news"
goclaw agent chat --session my-session
goclaw agent chat --user alice
goclaw agent chat -u alice -m "What files are in the workspace?"
```

| Flag | Mặc định | Mô tả |
|------|----------|-------|
| `-n`, `--name <name>` | `default` | Tên agent đích |
| `-m`, `--message <text>` | — | Gửi một tin nhắn; bỏ qua để vào chế độ tương tác |
| `-s`, `--session <key>` | auto | Session key để resume |
| `-u`, `--user <id>` | — | Đặt user context cho kết nối chat này |

Khi truyền `--user` hoặc `-u`, CLI gửi giá trị đó dưới dạng `connect.user_id` trong WebSocket connect params để xác lập user context cho phiên chat. Đây không phải API authentication token; cơ chế xác thực gateway vẫn tách biệt.

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

## `backup`

Sao lưu database và config của GoClaw thành file archive.

```bash
goclaw backup
goclaw backup --output /path/to/backup.tar.gz
```

| Flag | Mô tả |
|------|-------|
| `--output <path>` | Đường dẫn file archive output (mặc định: file có timestamp trong thư mục hiện tại) |

---

## `restore`

Khôi phục từ file backup archive.

```bash
goclaw restore /path/to/backup.tar.gz
```

---

## `tenant_backup`

Sao lưu dữ liệu của một tenant.

```bash
goclaw tenant_backup --tenant <tenant-id>
goclaw tenant_backup --tenant <tenant-id> --output /path/to/backup.tar.gz
```

---

## `tenant_restore`

Khôi phục một tenant từ file backup archive.

```bash
goclaw tenant_restore --tenant <tenant-id> /path/to/backup.tar.gz
```

---

## `doctor`

Kiểm tra môi trường hệ thống và sức khỏe cấu hình.

```bash
goclaw doctor
```

Kiểm tra: phiên bản binary, config file, kết nối database, phiên bản schema, providers, channels, binary bên ngoài (docker, curl, git), thư mục workspace. In tóm tắt pass/fail cho mỗi mục kiểm tra.

Provider có `display_name` rỗng nay hiển thị `name` chính thức thay vì dòng trống.

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

## `traces`

Kiểm tra trace thực thi agent và run timeline qua gateway đang chạy. Tất cả subcommand `traces` đều dựa trên HTTP — chúng kết nối tới gateway được phân giải từ `--server` / `$GOCLAW_SERVER` / `$GOCLAW_GATEWAY_URL` và xác thực bằng `--token` / `$GOCLAW_GATEWAY_TOKEN`.

| Persistent flag | Mặc định | Mô tả |
|------|---------|-------------|
| `-o`, `--output <table\|json>` | `table` | Định dạng output |

```bash
goclaw traces list --status error --limit 20
goclaw traces get <trace-id> -o json
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces timeline <trace-id>
# remote gateway:
goclaw --server https://goclaw.example.com --token "$GOCLAW_GATEWAY_TOKEN" traces get <trace-id> -o json
```

### `traces list`

Liệt kê trace với bộ lọc và tìm kiếm full-text.

```bash
goclaw traces list
goclaw traces list -q "payment" --has-tool-calls true --limit 50
```

| Flag | Mô tả |
|------|-------|
| `-q`, `--query <text>` | Tìm kiếm nội dung trace, ID, label, và preview span |
| `--agent-id <uuid>` | Lọc theo UUID agent |
| `--user <id>` | Lọc theo user ID (người gọi admin) |
| `--session <key>` | Lọc theo session key |
| `--status <status>` | Lọc theo trạng thái trace (`running`, `completed`, `error`, `cancelled`) |
| `--channel <channel>` | Lọc theo raw channel |
| `--agent <text>` | Tìm kiếm display name hoặc key của agent |
| `--channel-query <text>` | Tìm kiếm label của channel instance |
| `--tool <name>` | Tìm kiếm tên tool của span |
| `--from <rfc3339>` | Cận dưới thời điểm bắt đầu (bao gồm) |
| `--to <rfc3339>` | Cận trên thời điểm bắt đầu (không bao gồm) |
| `--since <rfc3339>` | Bí danh của `--from` |
| `--until <rfc3339>` | Bí danh của `--to` |
| `--has-tool-calls <true\|false>` | Chỉ trace có/không có tool call |
| `--min-input-tokens <n>` | Số input token tối thiểu |
| `--max-input-tokens <n>` | Số input token tối đa |
| `--min-output-tokens <n>` | Số output token tối thiểu |
| `--max-output-tokens <n>` | Số output token tối đa |
| `--min-tool-calls <n>` | Số tool call tối thiểu |
| `--max-tool-calls <n>` | Số tool call tối đa |
| `--limit <n>` | Kích thước trang (tối đa 200) |
| `--offset <n>` | Offset phân trang |

### `traces get <trace-id>`

Lấy chi tiết trace kèm span. Nhận đúng một trace ID.

```bash
goclaw traces get <trace-id>
goclaw traces get <trace-id> -o json
```

### `traces export <trace-id>`

Export cây trace dạng gzip. Nhận đúng một trace ID.

```bash
goclaw traces export <trace-id>                 # ghi trace-<short>-<YYYYMMDD>.json.gz
goclaw traces export <trace-id> --file trace.json.gz
goclaw traces export <trace-id> --file -        # gzip ra stdout
goclaw traces export <trace-id> -o json         # JSON đã giải nén ra stdout
```

| Flag | Mô tả |
|------|-------|
| `--file <path>` | Ghi bản export gzip ra file (dùng `-` cho stdout). Mặc định ghi `trace-<short>-<YYYYMMDD>.json.gz` |

### `traces follow`

Poll thay đổi trace cho một session hoặc agent. **Yêu cầu `--session` HOẶC `--agent-id`.**

```bash
goclaw traces follow --session <session-key> --since 2026-06-12T01:00:00Z
goclaw traces follow --agent-id <uuid> --include-spans
```

| Flag | Mô tả |
|------|-------|
| `--session <key>` | Lọc theo session key |
| `--agent-id <uuid>` | Lọc theo UUID agent |
| `--user <id>` | Lọc theo user ID (người gọi admin) |
| `--status <status>` | Lọc theo trạng thái trace |
| `--channel <channel>` | Lọc theo raw channel |
| `--since <rfc3339>` | Cận dưới RFC3339 cho trace đã thay đổi |
| `--limit <n>` | Kích thước trang (tối đa 200) |
| `--include-spans` | Bao gồm span nhóm theo trace ID |

### `traces timeline <trace-id>`

Hiển thị run timeline đã lưu liên kết với một trace. Phân giải `run_id` của trace, rồi truy vấn run archive. Nhận đúng một trace ID.

```bash
goclaw traces timeline <trace-id>
goclaw traces timeline <trace-id> --limit 100 --offset 0
```

| Flag | Mô tả |
|------|-------|
| `--limit <n>` | Kích thước trang (tối đa 500) |
| `--offset <n>` | Offset phân trang |

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

## `providers`

Quản lý LLM provider (yêu cầu gateway đang chạy).

### `providers list`

Liệt kê provider đã cấu hình.

```bash
goclaw providers list
goclaw providers list --json
goclaw providers list --models
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |
| `--models` | Hiển thị thêm model khả dụng của mỗi provider |

Hiển thị tên provider, loại, trạng thái enabled, và trạng thái API key.

### `providers add`

Thêm provider mới (tương tác).

```bash
goclaw providers add
```

Nhập tương tác: loại provider, tên, API key, base URL. Hỏi xác minh kết nối sau khi tạo.

### `providers update <id>`

Cập nhật tên hoặc API key của provider.

```bash
goclaw providers update <id>
```

### `providers delete <id>`

Xóa provider.

```bash
goclaw providers delete <id>
goclaw providers delete <id> --force
```

| Flag | Mô tả |
|------|-------|
| `--force` | Bỏ qua xác nhận |

### `providers verify <id>`

Xác minh kết nối provider hoặc một model cụ thể.

```bash
goclaw providers verify <id>
goclaw providers verify <id> --model anthropic/claude-sonnet-4
```

| Flag | Mô tả |
|------|-------|
| `--model <alias>` | Model alias cần xác minh (bỏ qua để ping kết nối) |

Không có `--model`: ping provider (kiểm tra đã đăng ký và có thể kết nối) — không thực hiện LLM call.
Có `--model`: gửi chat request nhỏ để xác minh model alias.

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

> Các subcommand dưới đây dựa trên HTTP (cần gateway đang chạy). Tham số `<skill>` chấp nhận skill ID, slug, hoặc name — nó được phân giải theo gateway.

### `skills evolve`

Quản lý cài đặt self-evolution cho từng skill.

```bash
goclaw skills evolve status <skill>
goclaw skills evolve enable <skill>
goclaw skills evolve disable <skill>
goclaw skills evolve mode <skill> suggest_only
goclaw skills evolve mode <skill> auto_analyze
```

| Lệnh | Args | Tác dụng |
|---------|------|--------|
| `skills evolve status <skill>` | 1 | Hiển thị cài đặt self-evolution |
| `skills evolve enable <skill>` | 1 | Bật self-evolution |
| `skills evolve disable <skill>` | 1 | Tắt self-evolution |
| `skills evolve mode <skill> <suggest_only\|auto_analyze>` | 2 | Đặt chế độ evolution |

### `skills metrics <skill>`

Hiển thị usage metrics đã ghi của một skill (Total, Started, Succeeded, Failed, Abandoned, Success rate).

```bash
goclaw skills metrics <skill>
goclaw skills metrics <skill> --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

### `skills activity <skill>`

Hiển thị hoạt động self-evolution gần đây của một skill (chi tiết giới hạn cho admin).

```bash
goclaw skills activity <skill>
goclaw skills activity <skill> --json
```

| Flag | Mô tả |
|------|-------|
| `--json` | Output dạng JSON |

### `skills suggestions`

Quản lý đề xuất cải thiện skill.

```bash
goclaw skills suggestions list <skill>
goclaw skills suggestions approve <skill> <suggestion-id>
goclaw skills suggestions reject <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id>
goclaw skills suggestions apply <skill> <suggestion-id> --approve
```

| Lệnh | Args / Flags | Tác dụng |
|---------|--------------|--------|
| `skills suggestions list <skill>` | 1 | Liệt kê đề xuất cho một skill |
| `skills suggestions approve <skill> <suggestion-id>` | 2 | Phê duyệt một đề xuất |
| `skills suggestions reject <skill> <suggestion-id>` | 2 | Từ chối một đề xuất |
| `skills suggestions apply <skill> <suggestion-id>` | 2, `--approve` | Áp dụng đề xuất đã phê duyệt (`--approve` phê duyệt đề xuất đang chờ trước) |

### `skills deps`

Quét, kiểm tra, và cài đặt dependency của skill. Tham số chấp nhận đường dẫn skill cục bộ hoặc gateway skill ID.

```bash
goclaw skills deps status <skill-id-or-path>
goclaw skills deps scan <skill-id-or-path>
goclaw skills deps check <skill-id-or-path>
goclaw skills deps install <skill-id>
```

| Lệnh | Args / Flags | Tác dụng |
|---------|--------------|--------|
| `skills deps status <skill-id-or-path>` | 1, `--json` | Hiển thị trạng thái dependency |
| `skills deps scan <skill-id-or-path>` | 1, `--json` | Quét khai báo dependency |
| `skills deps check <skill-id-or-path>` | 1, `--json` | Kiểm tra tính khả dụng |
| `skills deps install <skill-id>` | 1, `--json` | Cài đặt dependency còn thiếu (master tenant) |

### `skills access`

Quản lý chế độ access của skill và access hiệu lực.

```bash
goclaw skills access get <skill-id>
goclaw skills access set <skill-id> --mode internal
goclaw skills access effective <skill-id> --agent <agent-id> --user <user-id>
goclaw skills access effective --agent <agent-id> --user <user-id>
```

| Lệnh | Args / Flags | Tác dụng |
|---------|--------------|--------|
| `skills access get <skill-id>` | 1, `--json` | Hiển thị chế độ access và grant |
| `skills access set <skill-id> --mode <private\|internal\|public>` | 1, `--mode` (bắt buộc), `--json` | Đặt chế độ access |
| `skills access effective [skill-id] --agent <id> --user <id>` | 0–1, `--agent`+`--user` (bắt buộc), `--json` | Kiểm tra access hiệu lực (theo từng skill khi có ID, ngược lại trên toàn bộ skills) |

### `skills grant`

Cấp quyền access skill cho một agent hoặc user.

```bash
goclaw skills grant agent <skill-id> <agent-id>
goclaw skills grant agent <skill-id> <agent-id> --can-manage --pinned-version 3
goclaw skills grant user <skill-id> <user-id>
```

| Lệnh | Args / Flags | Tác dụng |
|---------|--------------|--------|
| `skills grant agent <skill-id> <agent-id>` | 2, `--can-manage`, `--pinned-version <n>`, `--json` | Cấp một skill cho agent |
| `skills grant user <skill-id> <user-id>` | 2, `--json` | Cấp một skill cho user |

### `skills revoke`

Thu hồi quyền access skill khỏi một agent hoặc user.

```bash
goclaw skills revoke agent <skill-id> <agent-id>
goclaw skills revoke user <skill-id> <user-id>
```

| Lệnh | Args | Tác dụng |
|---------|------|--------|
| `skills revoke agent <skill-id> <agent-id>` | 2 | Thu hồi grant của agent |
| `skills revoke user <skill-id> <user-id>` | 2 | Thu hồi grant của user |

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

## Lệnh `setup`

Wizard cài đặt có hướng dẫn cho từng thành phần. Mỗi lệnh chạy tương tác và ghi vào `config.json`.

### `setup agent`

Thêm hoặc cấu hình lại agent theo hướng dẫn.

```bash
goclaw setup agent
```

### `setup channel`

Cấu hình messaging channel (Telegram, Zalo OA, Feishu/Lark, v.v.).

```bash
goclaw setup channel
```

### `setup provider`

Thêm hoặc cấu hình lại LLM provider.

```bash
goclaw setup provider
```

### `setup` (tổng quát)

Chạy toàn bộ setup flow (tương đương `onboard` cho bản cài đặt đã có).

```bash
goclaw setup
```

---

## Lệnh TUI

Phiên bản Terminal UI của các flow setup và onboard. Khả dụng khi terminal hỗ trợ TUI tương tác. Tự động fallback sang CLI thông thường trên các terminal không hỗ trợ.

```bash
goclaw tui           # khởi động TUI app
goclaw tui onboard   # wizard onboard dạng TUI
goclaw tui setup     # wizard setup dạng TUI
```

## `bitrix-portal`

Quản lý các dòng portal Bitrix24 trực tiếp trong database (chỉ PostgreSQL). GoClaw cần một dòng `bitrix_portals` tồn tại trước khi operator chạy luồng cài đặt OAuth tại `/bitrix24/install`; lệnh này tạo và bảo trì dòng đó mà không cần truy cập SQL thô.

> Credential được mã hóa khi lưu bằng `GOCLAW_ENCRYPTION_KEY`. Nếu không đặt key, lệnh sẽ cảnh báo và lưu credential không mã hóa.

### `bitrix-portal create`

Tạo một dòng `bitrix_portals` với credential OAuth.

```bash
goclaw bitrix-portal create \
  --tenant-id <uuid> \
  --name <portal> \
  --domain tamgiac.bitrix24.com \
  --client-id <client_id> \
  --client-secret <client_secret>
```

| Flag | Mô tả |
|------|-------|
| `--tenant-id` | UUID tenant mà portal này thuộc về (bắt buộc) |
| `--name` | Tên portal ngắn, được tham chiếu bởi `channel_instance.config.portal` (bắt buộc) |
| `--domain` | Host portal Bitrix24, ví dụ `tamgiac.bitrix24.com` (bắt buộc) |
| `--client-id` | `client_id` / `application_id` của ứng dụng Bitrix24 (bắt buộc) |
| `--client-secret` | `client_secret` / application key của ứng dụng Bitrix24 (bắt buộc) |

### `bitrix-portal list`

Liệt kê các dòng `bitrix_portals`, tùy chọn giới hạn theo một tenant.

```bash
goclaw bitrix-portal list
goclaw bitrix-portal list --tenant-id <uuid>
```

| Flag | Mô tả |
|------|-------|
| `--tenant-id` | Lọc theo một UUID tenant (tùy chọn) |

### `bitrix-portal update-credentials`

Thay thế `client_id`/`client_secret` trên một dòng portal hiện có. Dùng khi xoay client secret hoặc chuyển từ local app sang marketplace app. OAuth state token bị xóa theo mặc định, vì state được tạo bằng credential cũ không thể refresh bằng credential mới.

```bash
goclaw bitrix-portal update-credentials \
  --tenant-id <uuid> --name <portal> \
  --client-id <client_id> --client-secret <client_secret>
```

| Flag | Mô tả |
|------|-------|
| `--tenant-id` | UUID tenant mà portal này thuộc về (bắt buộc) |
| `--name` | Tên portal cần cập nhật (bắt buộc) |
| `--client-id` | `client_id` mới của ứng dụng Bitrix24 (bắt buộc) |
| `--client-secret` | `client_secret` mới của ứng dụng Bitrix24 (bắt buộc) |
| `--keep-state` | Giữ OAuth state token hiện có (chỉ an toàn khi xoay secret của CÙNG một ứng dụng) |

### `bitrix-portal set-public-url`

Backfill URL public của gateway dùng để đăng ký imbot event handler của Bitrix24. Thao tác một lần cho các portal được cài đặt trước khi có cơ chế tự động lấy public URL.

```bash
goclaw bitrix-portal set-public-url \
  --tenant-id <uuid> --name <portal> \
  --url https://goclaw.example.com
```

| Flag | Mô tả |
|------|-------|
| `--tenant-id` | UUID tenant mà portal này thuộc về (bắt buộc) |
| `--name` | Tên portal (bắt buộc) |
| `--url` | URL public của gateway, ví dụ `https://goclaw.example.com` (bắt buộc) |

---

## Tiếp theo

- [WebSocket Protocol](/websocket-protocol) — tham chiếu wire protocol của gateway
- [REST API](/rest-api) — danh sách HTTP API endpoint
- [Config Reference](/config-reference) — schema đầy đủ `config.json`

<!-- goclaw-source: cc510d92 | cập nhật: 2026-08-09 -->
