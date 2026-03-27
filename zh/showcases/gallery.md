> 翻译自 [English version](#showcases-gallery)

# 展示案例

> GoClaw 的真实应用场景和部署示例。

## 概览

本页展示 GoClaw 在不同场景下的部署方式——从个人 Telegram bot 到多租户团队平台。以这些示例作为你自己配置的起点。

## 部署场景

### 个人 AI 助理

用于个人使用的单 agent Telegram bot。

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
      "token": "" // 来自 @BotFather
    }
  }
}
```

**你将获得：** 一个能记住你的偏好、搜索网页、运行代码和管理文件的个人助理——全程通过 Telegram。

### 团队编程 Bot

在 Discord 上共享给开发团队使用的预定义 agent。

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
      "token": "" // 来自 Discord Developer Portal
    }
  }
}
```

**你将获得：** 具有一致个性（预定义）的共享编程助理，低温度值确保精确的代码输出，较大的工具迭代次数应对复杂任务。每位团队成员通过 USER.md 获得个人上下文。

### 多 Channel 客服 Bot

一个 agent 同时在 Telegram、Discord 和 WebSocket 上可用。

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

**你将获得：** 跨 channel 一致的支持体验。Telegram 和 Discord 上的用户与拥有相同知识库的同一 agent 对话。

### 带委托的 Agent 团队

一个 lead agent 将专项任务委托给其他 agent。

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

**你将获得：** Lead agent 协调工作，将调研任务委托给 Gemini 驱动的 agent，将写作任务委托给 Claude 驱动的 agent。每个 agent 使用最适合其角色的模型。

## 社区

有你想分享的 GoClaw 部署案例？欢迎提交 pull request 添加到这里。

## 下一步

- [GoClaw 是什么](#what-is-goclaw) — 从头开始了解
- [快速开始](#quick-start) — 5 分钟内跑起来
- [配置](#configuration) — 完整配置参考

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
