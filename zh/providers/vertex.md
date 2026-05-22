 > 翻译自 [English version](/provider-vertex)

# Vertex AI

> 使用 Google Cloud Vertex AI 面向 Gemini 的 OpenAI-compatible endpoint,通过 OAuth2 service account 或 Application Default Credentials 认证。

## 概述

GoClaw 通过 OpenAI-compatible API 连接 Google Cloud Vertex AI。内部实现是一个 `OpenAIProvider`,挂上了 Google OAuth2 token source —— 每次请求都用短期 access token 签名,gateway 每小时自动刷新一次。

Endpoint URL 由 GCP project 和 region 构造:

```
https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/endpoints/openapi
```

例如 project `acme-prod`、region `us-central1` 会指向 `https://us-central1-aiplatform.googleapis.com/v1/projects/acme-prod/locations/us-central1/endpoints/openapi`。

## 前置条件

- 一个已启用 **Vertex AI API** 的 Google Cloud 项目。
- 二选一:
  - 拥有 `roles/aiplatform.user` 角色的 service-account JSON key,或
  - Application Default Credentials(本地用 `gcloud auth application-default login`,或 GCE/GKE/Cloud Run 上的 metadata server)。
- OAuth scope `https://www.googleapis.com/auth/cloud-platform` 会被自动请求 —— 无需配置。

## 凭据解析顺序

Provider 启动时,按以下顺序遍历凭据来源,在第一个有效来源处停止:

1. **Inline JSON** —— `credentials_json`(DB 中的 Settings 字段)或 `providers.vertex.api_key`(config.json)。粘贴整个 service-account JSON。
2. **File path** —— `credentials_file` 磁盘路径。**仅限 operator 使用。** 该路径由 gateway 进程直接读取;在没有严格 path allowlist 的情况下,绝不要通过 admin UI 暴露。
3. **Application Default Credentials** —— 回落到 `GOOGLE_APPLICATION_CREDENTIALS`、gcloud user creds 或 GCP metadata server。ADC discovery 上限为 10 秒,以免缺失 metadata server 时拖死启动。

## 通过 config.json 配置

```json
{
  "providers": {
    "vertex": {
      "api_key": "{\"type\":\"service_account\",\"project_id\":\"acme-prod\", ... }",
      "credentials_file": "",
      "project_id": "acme-prod",
      "region": "us-central1",
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

只有当 `project_id` 和 `region` **同时** 提供时,provider 才会初始化。`api_key` 接收完整的 service-account JSON 字符串。若想使用 ADC,把 `api_key` 和 `credentials_file` 都留空。

## 通过 Dashboard 配置

在 **Settings → Providers → Add provider** 创建 provider,`provider_type: "vertex"`。Vertex 特有的字段放在 `settings` 里:

```json
{
  "name": "vertex-prod",
  "provider_type": "vertex",
  "api_key": "{\"type\":\"service_account\", ... }",
  "settings": {
    "project_id": "acme-prod",
    "region": "us-central1",
    "model": "google/gemini-2.5-pro-001"
  }
}
```

API key 和 settings 都在数据库中以 AES-256-GCM 静态加密。从 DB 启动的 provider 同样遵循上面的凭据顺序 —— 如果宿主 gateway 使用 ADC,就把 `api_key` 留空。

## 支持的模型

Vertex AI 的 OpenAI-compatible endpoint 接受 Google 在 `google/` 命名空间下发布的所有 Gemini 模型,例如:

| Model ID | 说明 |
|----------|------|
| `google/gemini-2.0-flash-001` | 默认 |
| `google/gemini-2.5-pro-001` | 最大 context,支持 thinking |
| `google/gemini-2.5-flash-001` | 快速,支持 thinking |
| `google/gemini-1.5-pro-002` | 上一代,2M context |

务必保留 `google/` 前缀 —— Vertex OpenAI shim 强制要求。查阅 [Vertex model catalog](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) 了解 region 维度下可用的模型。

## Region 与 project 校验

Provider 在发起任何网络请求之前会校验两个值:

- `project_id` —— 6–30 个 lowercase/digit/hyphen 字符,以字母开头(GCP project ID 格式)。
- `region` —— 全 lowercase,由 hyphen 分隔的 alphanumeric 段(如 `us-central1`、`asia-southeast1`)。

格式错误的值会在启动时直接失败。如果你传入 `api_base_override`,gateway 还会拒绝 host 不在 `*.googleapis.com` 下的 URL —— 防止 provider 在仍然向 Google 鉴权的同时被指向攻击者的 endpoint。

## 示例

### Agent loop 中的快速 smoke test

```json
{
  "model": "google/gemini-2.0-flash-001",
  "options": {
    "temperature": 0.2
  }
}
```

### 按请求 pin model

由于 Vertex 使用 `OpenAIProvider` 适配器,所有请求都尊重 request-level 的 `model` 覆盖。webhook inline-message 和标准 agent loop 都接受。

### config.json 中内联 credentials

```json
{
  "providers": {
    "vertex": {
      "api_key": "{\n  \"type\": \"service_account\",\n  \"project_id\": \"acme-prod\",\n  \"private_key_id\": \"...\",\n  \"private_key\": \"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\",\n  \"client_email\": \"goclaw-vertex@acme-prod.iam.gserviceaccount.com\",\n  \"token_uri\": \"https://oauth2.googleapis.com/token\"\n}",
      "project_id": "acme-prod",
      "region": "us-central1"
    }
  }
}
```

### GKE / Cloud Run 上的 ADC

把 `api_key` 和 `credentials_file` 都留空,并给 workload service account 授予 `roles/aiplatform.user`。Provider 会自动从 metadata server 取 token。

## Streaming、tools、vision

Vertex provider 与 `openai` 和 `gemini` 适配器共用 OpenAI ChatCompletions 代码路径。Streaming、function/tool calling 和 image input 的行为与 `openai` / `gemini` 一致。Gemini 2.5 上的 extended thinking 会把 `thinking_level` 自动映射为 `reasoning_effort`(关于 thought_signature 回传细节见 [Gemini](/provider-gemini))。

## 故障排查

| 错误 | 原因 | 解决办法 |
|------|------|---------|
| `vertex: project_id is required` | 缺少 project 或 region | 同时设置 `project_id` 和 `region` |
| `vertex: invalid project_id` | ID 含大写、下划线或长度错误 | 使用标准 GCP project ID(6–30 lowercase) |
| `vertex: application default credentials not found` | 主机上没有 ADC 源 | 设置 `GOOGLE_APPLICATION_CREDENTIALS`、传入 `credentials_file`,或在 GCP 上运行 |
| `vertex: parse inline credentials` | `api_key` 不是有效的 service-account JSON | 粘贴整份 JSON,不做修改 |
| Vertex 返回 `403 Permission denied` | Service account 缺少角色 | 授予 `roles/aiplatform.user` |
| `HTTP 429` | 超出配额 | 在 GCP console 申请提额;GoClaw 会自动重试 |
| 找不到模型 | model ID 或 region 错误 | 确认 model 在当前 region 可用;保留 `google/` 前缀 |

## 下一步

- [Gemini](/provider-gemini) —— 通过 Google AI Studio 的 OpenAI-compatible endpoint 使用 Gemini
- [OpenAI](/provider-openai) —— OpenAI-compatible 适配器的通用说明
- [Providers Overview](/providers-overview) —— 适配器架构、retry、凭据解析

<!-- goclaw-source: 392f0fda | 更新: 2026-05-21 -->
