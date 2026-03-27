> 翻译自 [English version](#provider-ollama)

# Ollama

> 使用 Ollama 在本地运行开源模型——无需云服务。

🚧 **本页面正在建设中。** 内容即将推出——欢迎贡献！

## 概述

Ollama 让你在自己的机器上运行大型语言模型。GoClaw 通过 Ollama 本地暴露的 OpenAI 兼容 API 连接，数据不离开你的基础设施。

## Provider 类型

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://localhost:11434/v1"
    }
  }
}
```

## Docker 部署

在 Docker 内运行 GoClaw 时，provider URL 中的 `localhost` 和 `127.0.0.1` 会自动重写为 `host.docker.internal`，使容器能访问宿主机上运行的 Ollama，无需手动配置。

若 Ollama 运行在其他主机上，显式设置完整 URL：

```json
{
  "providers": {
    "ollama": {
      "provider_type": "ollama",
      "api_base": "http://my-ollama-server:11434/v1"
    }
  }
}
```

## 下一步

- [Provider 概览](#providers-overview)
- [Ollama Cloud](#provider-ollama-cloud) — 托管 Ollama 选项
- [自定义 / OpenAI 兼容](#provider-custom)

<!-- goclaw-source: 9168e4b4 | 更新: 2026-03-26 -->
