> 翻译自 [English version](/provider-ollama-cloud)

# Ollama Cloud

> 通过云端托管使用 Ollama 兼容模型——享受托管推理的便利与 Ollama 开放模型生态系统。

🚧 **本页面正在建设中。** 内容即将推出——欢迎贡献！

## 概述

Ollama Cloud 为 Ollama 兼容模型提供托管推理服务。GoClaw 通过 OpenAI 兼容 API 连接，让你无需管理本地硬件即可访问开源模型。

## Provider 类型

```json
{
  "providers": {
    "ollama-cloud": {
      "provider_type": "ollama-cloud",
      "api_key": "your-ollama-cloud-api-key",
      "api_base": "https://api.ollama.ai/v1"
    }
  }
}
```

## 下一步

- [Provider 概览](/providers-overview)
- [Ollama](/provider-ollama) — 改为在本地运行模型
- [自定义 / OpenAI 兼容](/provider-custom)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
