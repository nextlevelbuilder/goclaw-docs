> Bản dịch từ [English version](/provider-claude-cli)

# Claude CLI

Chạy Claude Code (binary `claude` CLI) như một GoClaw provider — cấp cho agent của bạn khả năng sử dụng tool agentic đầy đủ, được cung cấp bởi subscription Claude của Anthropic.

## Tổng quan

Claude CLI provider khác hoàn toàn so với các provider khác trong GoClaw. Thay vì gửi HTTP request đến một API, nó shell out đến binary `claude` được cài trên máy. GoClaw chuyển tiếp message của người dùng đến CLI, và CLI quản lý mọi thứ còn lại: lịch sử session, thực thi tool (Bash, sửa file, tìm kiếm web, v.v.), tích hợp MCP, và context.

Nghĩa là agent của bạn có thể chạy lệnh terminal thật, sửa file, duyệt web, và dùng bất kỳ MCP server nào — tất cả qua subscription Claude hiện có, không cần API key riêng.

**Tóm tắt kiến trúc:**

```
User message → GoClaw → claude CLI (subprocess)
                              ↓
                   CLI quản lý: session, tool, MCP, context
                              ↓
                   Stream output → GoClaw → user
```

## Điều kiện tiên quyết

1. Cài Claude CLI: theo [hướng dẫn cài đặt của Anthropic](https://docs.anthropic.com/en/docs/claude-code/getting-started)
2. Đăng nhập subscription Claude: chạy `claude` một lần và hoàn thành auth flow
3. Kiểm tra hoạt động: `claude -p "Hello" --output-format json`

## Cài đặt

Cấu hình CLI provider trong `config.json`:

```json
{
  "providers": {
    "claude_cli": {
      "cli_path": "claude",
      "model": "sonnet",
      "base_work_dir": "~/.goclaw/cli-workspaces",
      "perm_mode": "bypassPermissions"
    }
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "sonnet"
    }
  }
}
```

Tất cả field đều là tùy chọn — giá trị mặc định phù hợp với hầu hết cài đặt:

| Field | Mặc định | Mô tả |
|---|---|---|
| `cli_path` | `"claude"` | Đường dẫn đến binary `claude` (dùng đường dẫn đầy đủ nếu không có trong `$PATH`) |
| `model` | `"sonnet"` | Alias model: `sonnet`, `opus`, hoặc `haiku` |
| `base_work_dir` | `~/.goclaw/cli-workspaces` | Thư mục gốc cho workspace theo session |
| `perm_mode` | `"bypassPermissions"` | Chế độ quyền CLI (xem bên dưới) |

## Models

Claude CLI dùng model alias, không phải model ID đầy đủ:

| Alias | Ánh xạ sang |
|---|---|
| `sonnet` | Claude Sonnet mới nhất |
| `opus` | Claude Opus mới nhất |
| `haiku` | Claude Haiku mới nhất |

Không thể dùng model ID đầy đủ (như `claude-sonnet-4-5`) với provider này. GoClaw xác thực alias và trả về lỗi nếu không nhận ra.

## Cô lập Session

Mỗi GoClaw session có workspace directory riêng biệt trong `base_work_dir`. GoClaw tạo UUID deterministic từ session key, cho phép CLI resume cùng hội thoại qua các lần restart bằng `--resume`.

Session file được CLI lưu tại `~/.claude/projects/<encoded-workdir>/<session-id>.jsonl`. GoClaw kiểm tra file này ở đầu mỗi request: nếu có, truyền `--resume`; nếu không, truyền `--session-id` để bắt đầu mới.

Các request đồng thời đến cùng session được serialize bằng per-session mutex — CLI chỉ xử lý được một request mỗi session tại một thời điểm.

## System Prompt

GoClaw ghi system prompt của agent vào file `CLAUDE.md` trong session workspace. CLI đọc file này tự động mỗi lần chạy, kể cả session được resume. GoClaw bỏ qua việc ghi nếu nội dung chưa thay đổi để tránh disk I/O không cần thiết.

## Chế độ Quyền

Chế độ quyền mặc định là `bypassPermissions`, cho phép CLI chạy tool mà không hỏi xác nhận. Phù hợp cho agent phía server. Bạn có thể thay đổi:

```json
{
  "providers": {
    "claude_cli": {
      "perm_mode": "default"
    }
  }
}
```

Các chế độ có sẵn: `bypassPermissions` (mặc định), `default`, `acceptEdits`.

## Security Hooks

GoClaw có thể inject security hook vào CLI để áp đặt shell deny patterns và giới hạn đường dẫn workspace. Bật tính năng này trong agent config (ở cấp agent, không phải config provider). Hook được ghi vào file settings tạm và truyền cho CLI qua `--settings`.

## MCP Config Passthrough

Nếu bạn cấu hình MCP server trong GoClaw, provider sẽ tạo file MCP config và truyền cho CLI qua `--mcp-config`. Khi có MCP config, GoClaw tắt các built-in tool của CLI (Bash, Edit, Read, Write, v.v.) để toàn bộ thực thi tool đi qua MCP bridge được kiểm soát.

## Tắt Built-in Tools

Đặt `disable_tools: true` trong options để tắt toàn bộ CLI tool. Hữu ích cho tác vụ sinh text thuần túy không muốn CLI chạy lệnh nào:

```json
{
  "options": {
    "disable_tools": true
  }
}
```

## Debug

Bật debug logging để xem raw CLI stream output:

```bash
GOCLAW_DEBUG=1 ./goclaw
```

Lệnh này ghi file `cli-debug.log` trong workspace directory của mỗi session với toàn bộ CLI command, stream-json output, và stderr.

## Ví dụ

**Config tối giản — dùng binary `claude` trong PATH:**

```json
{
  "providers": {
    "claude_cli": {}
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "sonnet"
    }
  }
}
```

**Đường dẫn đầy đủ đến binary, dùng Opus:**

```json
{
  "providers": {
    "claude_cli": {
      "cli_path": "/usr/local/bin/claude",
      "model": "opus",
      "base_work_dir": "/var/goclaw/workspaces"
    }
  },
  "agents": {
    "defaults": {
      "provider": "claude-cli",
      "model": "opus"
    }
  }
}
```

## Lỗi thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `claude-cli: exec: "claude": executable file not found` | `claude` không có trong `$PATH` | Đặt `cli_path` thành đường dẫn đầy đủ của binary |
| `unsupported model "claude-sonnet-4-5"` | Dùng model ID đầy đủ thay vì alias | Dùng `sonnet`, `opus`, hoặc `haiku` |
| Session không resume được | Session file thiếu hoặc workdir thay đổi | Kiểm tra `~/.claude/projects/` xem có session file; đảm bảo `base_work_dir` ổn định |
| CLI hỏi xác nhận tương tác | `perm_mode` chưa đặt thành `bypassPermissions` | Đặt `perm_mode: "bypassPermissions"` trong config |
| Response đầu tiên chậm | CLI cold start + kiểm tra auth | Bình thường ở lần chạy đầu; các call tiếp trong cùng session nhanh hơn |
| Biến môi trường `CLAUDE_*` gây xung đột | Phát hiện nested CLI session | GoClaw lọc bỏ toàn bộ biến `CLAUDE_*` trước khi spawn subprocess |

## Tiếp theo

- [Codex / ChatGPT](/provider-codex) — provider OAuth dùng subscription ChatGPT
- [Custom Provider](/provider-custom) — kết nối bất kỳ API nào tương thích OpenAI

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
