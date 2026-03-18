> Bản dịch từ [English version](#recipe-personal-assistant)

# Trợ lý Cá nhân

> AI assistant cá nhân trên Telegram với bộ nhớ và tính cách tùy chỉnh.

## Tổng quan

Recipe này hướng dẫn bạn từ đầu đến một trợ lý cá nhân hoàn chỉnh: một gateway, một agent, một Telegram bot. Sau khi hoàn thành, trợ lý của bạn sẽ ghi nhớ mọi thứ qua các hội thoại và phản hồi theo tính cách bạn đặt ra.

**Những gì bạn cần:**
- GoClaw binary (xem [Getting Started](../getting-started/))
- PostgreSQL database với pgvector
- Telegram bot token từ @BotFather
- API key từ bất kỳ LLM provider nào được hỗ trợ

## Bước 1: Chạy wizard thiết lập

```bash
./goclaw onboard
```

Wizard tương tác bao gồm mọi thứ trong một lần:

1. **Provider** — chọn LLM provider của bạn (OpenRouter được khuyến nghị để truy cập nhiều model)
2. **Gateway port** — mặc định `18790`
3. **Channel** — chọn `Telegram`, dán bot token của bạn
4. **Features** — chọn `Memory` (vector search) và `Browser` (truy cập web)
5. **Database** — dán Postgres DSN của bạn

Wizard lưu file `config.json` (không có bí mật) và file `.env.local` (chỉ chứa bí mật). Khởi động gateway:

```bash
source .env.local && ./goclaw
```

## Bước 2: Hiểu config mặc định

Sau khi onboard, `config.json` trông đại khái như thế này:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.goclaw/workspace",
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "max_tokens": 8192,
      "max_tool_iterations": 20,
      "memory": {
        "enabled": true,
        "embedding_provider": ""
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "",
      "dm_policy": "pairing",
      "reaction_level": "minimal"
    }
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790
  },
  "tools": {
    "browser": {
      "enabled": true,
      "headless": true
    }
  }
}
```

`dm_policy: "pairing"` nghĩa là người dùng mới phải ghép nối qua mã trên browser trước khi bot phản hồi. Điều này bảo vệ bot của bạn khỏi người lạ.

## Bước 3: Ghép nối tài khoản Telegram

Mở web dashboard tại `http://localhost:18790`. Vào trang pairing và làm theo hướng dẫn — bạn sẽ gửi mã đến Telegram bot, và dashboard xác nhận kết nối. Sau khi ghép nối, bot sẽ phản hồi tin nhắn của bạn.

Hoặc dùng `./goclaw agent chat` để chat trực tiếp trên terminal mà không cần ghép nối.

## Bước 4: Tùy chỉnh tính cách (SOUL.md)

Ở lần chat đầu tiên, agent tạo file `SOUL.md` trong context người dùng của bạn. Chỉnh sửa trong dashboard:

Vào **Agents → agent của bạn → Files tab → SOUL.md** và chỉnh sửa trực tiếp. Ví dụ:

```markdown
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
```

Click **Save** khi hoàn tất.

<details>
<summary><strong>Qua API</strong></summary>

```bash
curl -X PUT http://localhost:18790/v1/agents/default/files/SOUL.md \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-GoClaw-User-Id: your-user-id" \
  -H "Content-Type: text/plain" \
  --data-binary @- <<'EOF'
You are a sharp, direct research partner. You prefer short answers over long explanations
unless the user explicitly asks to dig deeper. You have a dry sense of humor.
You never hedge with "I think" or "I believe" — just state your answer.
EOF
```

</details>

Xem [Editing Personality](#editing-personality) để biết tài liệu tham khảo đầy đủ về SOUL.md.

## Bước 5: Bật bộ nhớ

Bộ nhớ đã bật nếu bạn chọn nó trong wizard. Agent dùng SQLite + pgvector cho tìm kiếm kết hợp. Ghi chú được lưu bằng `memory_save` và tìm kiếm bằng `memory_search` tự động.

Để xác minh bộ nhớ đang hoạt động, nhắn bot: "Nhớ rằng tôi thích Python hơn JavaScript." Sau đó ở session sau: "Tôi thích ngôn ngữ lập trình nào?" — agent sẽ nhớ lại từ bộ nhớ.

Bạn cũng có thể kiểm tra trạng thái bộ nhớ trong dashboard: vào **Agents → agent của bạn** và xác minh memory config hiển thị đã bật.

## Tùy chọn: Cá nhân hóa agent

Một vài điều chỉnh thêm bạn có thể cấu hình trong dashboard tại **Agents → agent của bạn**:

- **Emoji:** Đặt emoji icon qua bộ chọn emoji trong trang chi tiết agent — hiển thị trong danh sách agent và giao diện chat
- **Skill learning:** (Chỉ agent predefined) Bật **Skill Learning** để agent ghi lại workflow tái sử dụng dưới dạng skill sau các task phức tạp. Đặt nudge interval để kiểm soát tần suất agent đề xuất tạo skill.

## Sự cố thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Bot không phản hồi trên Telegram | Kiểm tra `dm_policy`. Với `"pairing"`, bạn phải hoàn tất ghép nối trên browser trước. Đặt `"open"` để bỏ qua ghép nối. |
| Bộ nhớ không hoạt động | Xác nhận `memory.enabled: true` trong config và embedding provider có API key. Kiểm tra log gateway để tìm lỗi embedding. |
| Lỗi "No provider configured" | Đảm bảo biến môi trường API key đã được đặt. Chạy `source .env.local` trước `./goclaw`. |
| Bot phản hồi với tất cả mọi người | Đặt `dm_policy: "allowlist"` và `allow_from: ["your_username"]` trong `channels.telegram`. |

## Tiếp theo

- [Editing Personality](#editing-personality) — tùy chỉnh SOUL.md, IDENTITY.md, USER.md
- [Telegram Channel](#channel-telegram) — tài liệu tham khảo cấu hình Telegram đầy đủ
- [Team Chatbot](#recipe-team-chatbot) — thêm các agent chuyên biệt cho các task khác nhau
- [Multi-Channel Setup](#recipe-multi-channel) — đặt cùng agent trên Discord và WebSocket

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
