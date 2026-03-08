> Bản dịch từ [English version](../../showcases/gallery.md)

# Thư viện

> Ví dụ thực tế và các kịch bản deploy cho GoClaw.

## Tổng quan

Trang này giới thiệu cách GoClaw có thể được deploy trong các tình huống khác nhau — từ bot Telegram cá nhân đến nền tảng team đa tenant. Hãy dùng những ví dụ này làm điểm khởi đầu cho thiết lập của riêng bạn.

## Các Kịch bản Deploy

### Trợ lý AI Cá nhân

Một agent duy nhất trên Telegram cho sử dụng cá nhân.

```jsonc
{
  "agents": {
    "defaults": {
      "provider": "openrouter",
      "model": "anthropic/claude-sonnet-4-5-20250929",
      "agent_type": "open",
      "memory": true
    }
  },
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" }
  }
}
```

**Những gì bạn có:** Trợ lý cá nhân nhớ sở thích của bạn, tìm kiếm web, chạy code, và quản lý file — tất cả qua Telegram.

### Bot Coding cho Team

Một agent predefined dùng chung cho cả nhóm phát triển trên Discord.

```jsonc
{
  "agents": {
    "list": {
      "code-bot": {
        "agent_type": "predefined",
        "provider": "anthropic",
        "model": "claude-opus-4-20250514",
        "tools_profile": "coding",
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  },
  "channels": {
    "discord": { "enabled": true, "token": "env:DISCORD_BOT_TOKEN" }
  }
}
```

**Những gì bạn có:** Trợ lý coding dùng chung với tính cách nhất quán (predefined), nhiệt độ thấp để code chính xác, và nhiều lần lặp tool cho các task phức tạp. Mỗi thành viên team có context cá nhân qua USER.md.

### Bot Hỗ trợ Đa Channel

Một agent có mặt trên Telegram, Discord, và WebSocket cùng lúc.

```jsonc
{
  "agents": {
    "list": {
      "support-bot": {
        "agent_type": "predefined",
        "tools_profile": "messaging"
      }
    }
  },
  "channels": {
    "telegram": { "enabled": true, "token": "env:TELEGRAM_BOT_TOKEN" },
    "discord": { "enabled": true, "token": "env:DISCORD_BOT_TOKEN" }
  }
}
```

**Những gì bạn có:** Trải nghiệm hỗ trợ nhất quán qua các channel. Người dùng trên Telegram và Discord đều nói chuyện với cùng một agent có cùng nền tảng kiến thức.

### Agent Team với Delegation

Một lead agent phân công các task chuyên biệt cho các agent khác.

```jsonc
{
  "agents": {
    "list": {
      "lead": {
        "provider": "anthropic",
        "model": "claude-opus-4-20250514"
      },
      "researcher": {
        "provider": "openrouter",
        "model": "google/gemini-2.5-pro",
        "tools_profile": "coding"
      },
      "writer": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929",
        "tools_profile": "messaging"
      }
    }
  }
}
```

**Những gì bạn có:** Agent lead điều phối công việc, delegate nghiên cứu cho agent chạy Gemini và các task viết lách cho agent chạy Claude. Mỗi agent dùng model phù hợp nhất cho vai trò của nó.

## Ảnh chụp màn hình Dashboard

Web dashboard của GoClaw cung cấp quản lý trực quan cho tất cả tính năng:

- **Agent Management** — Tạo, cấu hình và kiểm tra agent
- **Channel Configuration** — Kết nối các nền tảng nhắn tin
- **Traces Viewer** — Theo dõi các lệnh gọi LLM, chi phí và hiệu suất
- **Team Board** — Quản lý agent team và phân công task
- **Skills Browser** — Tải lên và tìm kiếm agent skill

Ảnh chụp màn hình có trong thư mục `images/dashboard/`.

## Cộng đồng

Bạn có một thiết lập GoClaw muốn giới thiệu? Mở pull request để thêm vào đây.

## Tiếp theo

- [What Is GoClaw](../getting-started/what-is-goclaw.md) — Bắt đầu từ đầu
- [Quick Start](../getting-started/quick-start.md) — Chạy trong 5 phút
- [Configuration](../getting-started/configuration.md) — Tài liệu tham khảo config đầy đủ
