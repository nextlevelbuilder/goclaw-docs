> Bản dịch từ [English version](/gallery)

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
      "memory": { "enabled": true }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "" // từ @BotFather
    }
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
        "model": "claude-opus-4-6",
        "tools": { "profile": "coding" },
        "temperature": 0.3,
        "max_tool_iterations": 50
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "" // từ Discord Developer Portal
    }
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
        "tools": { "profile": "messaging" }
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "" // Telegram bot token
    },
    "discord": {
      "enabled": true,
      "token": "" // Discord bot token
    }
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
        "model": "claude-opus-4-6"
      },
      "researcher": {
        "provider": "openrouter",
        "model": "google/gemini-2.5-pro",
        "tools": { "profile": "coding" }
      },
      "writer": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929",
        "tools": { "profile": "messaging" }
      }
    }
  }
}
```

**Những gì bạn có:** Agent lead điều phối công việc, delegate nghiên cứu cho agent chạy Gemini và các task viết lách cho agent chạy Claude. Mỗi agent dùng model phù hợp nhất cho vai trò của nó.

## Cộng đồng

Bạn có một thiết lập GoClaw muốn giới thiệu? Mở pull request để thêm vào đây.

## Tiếp theo

- [What Is GoClaw](/what-is-goclaw) — Bắt đầu từ đầu
- [Quick Start](/quick-start) — Chạy trong 5 phút
- [Configuration](/configuration) — Tài liệu tham khảo config đầy đủ

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
