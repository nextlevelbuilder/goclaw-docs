> 翻译自 [English version](/provider-custom)

# 自定义 Provider

将 GoClaw 连接到任意 OpenAI 兼容 API——本地模型、自托管推理服务器或第三方代理。

## 概述

GoClaw 的 `OpenAIProvider` 适用于任何实现 OpenAI chat completions 格式的服务器。你配置名称、API base URL、API key（本地服务器可选）和默认模型。适用范围涵盖 Ollama、vLLM 等本地部署、LiteLLM 等代理服务，以及任何声称兼容 OpenAI 的厂商。

GoClaw 还会自动清理不被某些 provider 接受的工具 schema 字段——即使下游模型比 OpenAI 更严格，你的工具也能正常工作。

## 配置

自定义 provider 通过 HTTP API 注册或在数据库层配置——任意名称没有静态配置键。但你可以使用任意内置命名槽配合自定义 `api_base` 指向不同服务器：

```json
{
  "providers": {
    "openai": {
      "api_key": "not-required",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

这样可行是因为 GoClaw 只关心 API base 和 key——provider 名称只是路由的标签。

## 本地 Ollama

使用 [Ollama](https://ollama.com) 在本地运行模型：

```bash
ollama serve          # 启动于 http://localhost:11434
ollama pull llama3.2  # 下载模型
```

```json
{
  "providers": {
    "openai": {
      "api_key": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2"
    }
  }
}
```

Ollama 忽略 API key 值——传入任意非空字符串即可。

## vLLM

使用 [vLLM](https://docs.vllm.ai) 自托管任意 HuggingFace 模型：

```bash
vllm serve meta-llama/Llama-3.2-3B-Instruct --port 8000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "vllm",
      "api_base": "http://localhost:8000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "meta-llama/Llama-3.2-3B-Instruct"
    }
  }
}
```

## LiteLLM 代理

[LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) 将 100+ provider 代理在单一 OpenAI 兼容端点后：

```bash
litellm --model ollama/llama3.2 --port 4000
```

```json
{
  "providers": {
    "openai": {
      "api_key": "$LITELLM_KEY",
      "api_base": "http://localhost:4000/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "ollama/llama3.2"
    }
  }
}
```

## Schema 清理

GoClaw 根据 provider 名称自动从工具定义中去除不支持的 JSON Schema 字段，在 `CleanToolSchemas` 中处理：

| Provider | 移除的字段 |
|---|---|
| `gemini` / `gemini-*` | `$ref`、`$defs`、`additionalProperties`、`examples`、`default` |
| `anthropic` | `$ref`、`$defs` |
| 其他所有 | 不移除 |

对于使用非标准名称的自定义 provider，不会应用 schema 清理。若你的本地模型拒绝某些 schema 字段，使用能触发正确清理的 provider 名称（如将 provider 命名为 `gemini` 以去除 Gemini 不兼容的字段）。

## 工具格式差异

并非所有 OpenAI 兼容服务器都以相同方式实现工具。常见注意事项：

- **Ollama**：工具支持取决于模型。使用标有 `tools` 支持的模型（如 `llama3.2`、`qwen2.5`）。
- **vLLM**：工具支持取决于模型。启动 vLLM 时传入 `--enable-auto-tool-choice` 和 `--tool-call-parser` 标志。
- **LiteLLM**：透明地处理各 provider 的工具格式转换。

若工具调用失败，尝试为该 provider 禁用工具，改用带结构化输出提示的纯文本。

## 示例

**LM Studio（本地运行模型的 GUI 工具）：**

```json
{
  "providers": {
    "openai": {
      "api_key": "lm-studio",
      "api_base": "http://localhost:1234/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF"
    }
  }
}
```

**Jan（另一个本地模型运行器）：**

```json
{
  "providers": {
    "openai": {
      "api_key": "jan",
      "api_base": "http://localhost:1337/v1"
    }
  },
  "agents": {
    "defaults": {
      "provider": "openai",
      "model": "llama3.2-3b-instruct"
    }
  }
}
```

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `connection refused` | 本地服务器未运行 | 在 GoClaw 之前启动 Ollama/vLLM/LiteLLM |
| `model not found` | 服务器的模型名称错误 | 检查服务器的模型列表（`GET /v1/models`） |
| 工具调用报错 | 服务器不支持工具 | 在 agent 配置中禁用工具，或切换到支持工具的模型 |
| Schema 验证错误 | 服务器拒绝 `additionalProperties` 或 `$ref` | 使用能触发 schema 清理的 provider 名称，或在上游清理工具 schema |
| 流式传输不工作 | 服务器 SSE 实现不正确 | 尝试禁用流式传输；部分本地服务器存在 SSE bug |

## 下一步

- [概览](/providers-overview) — 并排比较所有 provider
- [DashScope](/provider-dashscope) — 阿里巴巴的 Qwen 模型
- [Perplexity](/provider-perplexity) — 搜索增强生成

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
