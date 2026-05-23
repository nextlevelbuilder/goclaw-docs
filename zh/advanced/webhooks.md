 > 翻译自 [English version](/webhooks)

# Webhooks

> 通过 HMAC 鉴权的 HTTP 端点，从外部系统触发 agent 或推送频道消息。

## 概述

GoClaw Webhook 提供两个 HTTP 入口，让外部系统无需使用 WebSocket RPC 协议即可驱动网关：

| Kind | 端点 | 用途 | Edition |
|------|------|------|---------|
| `llm` | `POST /v1/webhooks/llm` | 用提示词调用 agent（同步或异步） | Standard + Lite |
| `message` | `POST /v1/webhooks/message` | 通过已连接频道向用户发送消息 | 仅 Standard |

每个 webhook 都是一条租户范围的注册记录。管理员通过 CRUD API 创建记录，一次性获得 bearer secret 与 HMAC signing key；调用方随后用其中之一对入站请求进行鉴权。

> **必须设置加密密钥。** 只有当 `GOCLAW_ENCRYPTION_KEY` 已设置时，webhook 子系统才会被挂载。未设置时所有 `/v1/webhooks/*` 路由返回 `404`，网关日志会输出 `webhook subsystem disabled`。详见 [安全加固](/deploy-security) 和 [环境变量](/env-vars)。

## 管理 CRUD

所有管理端点都需要租户管理员的网关 token（`Authorization: Bearer <admin-token>`）。

| Method | Path | 用途 |
|--------|------|------|
| `POST` | `/v1/webhooks` | 创建 webhook；一次性返回 raw secret 和 HMAC key |
| `GET` | `/v1/webhooks` | 列出租户的 webhook，可选 `?agent_id=<uuid>` 过滤 |
| `GET` | `/v1/webhooks/{id}` | 获取单条记录（不含 secret） |
| `PATCH` | `/v1/webhooks/{id}` | 部分更新；`kind` 不可修改 |
| `POST` | `/v1/webhooks/{id}/rotate` | 生成新 secret，旧 secret 立即失效 |
| `DELETE` | `/v1/webhooks/{id}` | 撤销；后续入站调用一律返回 `401` |

完整请求/响应字段见 [REST API → Webhooks](/rest-api) 与 [端点目录](/api-endpoints-catalog)。

### 创建

```bash
curl -X POST https://gw.example.com/v1/webhooks \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "billing-sync",
    "kind": "llm",
    "agent_id": "9c5a...e4",
    "require_hmac": true,
    "rate_limit_per_min": 60,
    "ip_allowlist": ["10.0.0.0/8"]
  }'
```

响应（201 Created）：

```json
{
  "id": "f5a1...",
  "name": "billing-sync",
  "secret_prefix": "wh_ABCD",
  "secret": "wh_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH",
  "hmac_signing_key": "a3f4...hex64chars",
  "kind": "llm",
  "rate_limit_per_min": 60,
  "require_hmac": true,
  "localhost_only": false,
  "ip_allowlist": ["10.0.0.0/8"],
  "created_at": "2026-05-21T12:00:00Z"
}
```

> `secret` 与 `hmac_signing_key` 只在创建和 rotate 时返回 **一次**。请立刻保存到密钥管理系统，之后无法重新获取。

### 创建字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 最长 100 字符 |
| `kind` | string | 是 | `"llm"` 或 `"message"` |
| `agent_id` | UUID | `llm` 类型必填 | 要触发的 agent |
| `channel_id` | UUID | 可选 | 将 `message` webhook 绑定到特定频道实例 |
| `require_hmac` | bool | 否 | 强制仅使用 HMAC（禁用 bearer） |
| `localhost_only` | bool | 否 | 仅允许 127.0.0.1/::1。Lite 版本强制为 `true` |
| `rate_limit_per_min` | int | 否 | 单 webhook 限速（0 = 使用租户默认） |
| `ip_allowlist` | []string | 否 | IP 或 CIDR 列表，留空允许任意来源 |

## 鉴权

webhook 行上的 `require_hmac` 决定接受哪种模式。

### Bearer 鉴权

```
Authorization: Bearer wh_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH
```

网关使用 SHA-256 哈希 token 并与 `secret_hash` 做常量时间比较，然后用 `GOCLAW_ENCRYPTION_KEY` 解密存储的 secret 物料。当 `require_hmac=true` 时 bearer 会被 **拒绝**。

### HMAC 鉴权（推荐）

需要发送三个 header：

```
X-Webhook-Id: <webhook-uuid>
X-GoClaw-Signature: t=<unix_seconds>,v1=<hmac_hex>
Content-Type: application/json
```

签名算法：

```
signing_key = hex.Decode(hmac_signing_key)   // hex_64 → 32 字节原始数据
payload     = "{unix_ts}.{request_body_bytes}"
signature   = HMAC_SHA256(signing_key, payload)
header      = "t={unix_ts},v1={hex(signature)}"
```

`hmac_signing_key` 等于 `hex(SHA-256(raw_secret))`。网关从不存储 raw secret —— 只存哈希及一段 AES-256-GCM 密文（供后台 worker 在投递时重新计算 HMAC）。

**时间戳偏差。** `|now - t| > 300` 秒的请求会被拒绝。请通过 NTP 同步时钟。

**防重放。** 签名通过后，网关会把 `sha256(tenant_id|signature_hex)` 写入进程内 nonce 缓存（TTL 320s）。重放请求返回 `401`，并产生审计事件 `security.webhook.hmac_replay`。该缓存按进程隔离 —— 在多节点部署中，理论上其他节点仍可能放行同一重放。

**IP allowlist。** 当 `ip_allowlist` 非空时，鉴权通过后每个条目都会与请求的 `RemoteAddr` 比对。支持 CIDR 及单个 IP。`X-Forwarded-For` **不被信任**。

## POST /v1/webhooks/llm

用提示词触发 agent。所有 edition 可用（Standard + Lite）。

```bash
curl -X POST https://gw.example.com/v1/webhooks/llm \
  -H "Authorization: Bearer wh_..." \
  -H "Content-Type: application/json" \
  -d '{
    "input": "汇总最新指标",
    "session_key": "user-123-session",
    "mode": "sync"
  }'
```

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string 或 array | 是 | 普通字符串或 `[{role, content}]` 数组 |
| `session_key` | string | 否 | 多轮会话连续性的稳定 key |
| `user_id` | string | 否 | 外部用户标识，用于作用域 |
| `model` | string | 否 | 单次请求 model 覆盖 |
| `mode` | string | 否 | `"sync"`（默认）或 `"async"` |
| `callback_url` | string | async 时必填 | HTTPS URL；按 SSRF 策略校验 |
| `metadata` | object | 否 | 异步回调时原样回传（最大 8 KB） |

**同步模式** 30 秒超时，返回完整 agent 输出：

```json
{
  "call_id": "<uuid>",
  "agent_id": "<uuid>",
  "output": "以下为指标：...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "finish_reason": "stop"
}
```

**异步模式** 返回 `202 Accepted` 与 `{"call_id": "...", "status": "queued"}`；结果通过出站投递发送到 `callback_url`（见 [出站回调](#出站回调)）。

错误码：

| Status | Code | 触发条件 |
|--------|------|---------|
| 400 | `invalid_request` | 缺 `input`、`mode` 不合法、async 缺 `callback_url` |
| 401 | — | bearer 错、HMAC 不匹配、已撤销、HMAC 重放 |
| 403 | `unauthorized` | 违反 `localhost_only`、IP 拒绝、kind 不符、租户不符 |
| 404 | `not_found` | 找不到 agent |
| 429 | — | 超出速率限制（`Retry-After: 60`） |
| 503 | — | webhook 处理通道已满 |
| 504 | — | LLM 超时（仅 sync） |

## POST /v1/webhooks/message

通过已连接频道向用户发送消息。**仅 Standard edition。**

```json
{
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "content": "来自集成的问候！",
  "media_url": "https://example.com/image.jpg",
  "media_caption": "可选 caption",
  "fallback_to_text": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `channel_name` | string | 是（除非 webhook 已绑定 `channel_id`） | 频道实例名 |
| `chat_id` | string | 是 | 该频道下的收件人 ID |
| `content` | string | 是（除非提供 `media_url`） | 文本正文，最大 16 KB |
| `media_url` | string | 否 | HTTPS URL，按 SSRF 策略校验并先做 HEAD 探测 |
| `media_caption` | string | 否 | 媒体 caption |
| `fallback_to_text` | bool | 否 | 为 true 时，频道不支持媒体则仅发文本 |

响应：

```json
{
  "call_id": "<uuid>",
  "status": "sent",
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "warning": ""
}
```

当 `fallback_to_text=true` 且媒体被丢弃时，`warning` 会设为 `"media_not_supported_fallback_text"`。无法投递媒体的频道（如 `zalo_oa`），若 `fallback_to_text=false` 则返回 `501 Not Implemented`。

## 幂等性

所有 webhook 端点均接受 `Idempotency-Key` header（最长 255 字符）。

- 该 key 的首次请求：正常处理。
- 同 key + 完全相同的 body：直接返回缓存响应，`200 OK`。
- 同 key + 不同 body：返回 `409 Conflict`（`webhook.idempotency_conflict`）。
- key 在 24 小时后过期（`webhook_calls` 表 TTL）。

可用 UUID 或 payload 的哈希作为 key。重试时请发送 **完全相同的 body**。

## 出站回调

`mode=async` 的 LLM 调用会通过 `HTTP POST` 将结果投递到 `callback_url`。投递为 **至少一次**，接收方必须幂等。

每次尝试都携带：

```
X-Webhook-Delivery-Id: <uuid>          ; 多次重试保持不变 —— 用它做去重
X-Webhook-Signature:   t=<unix>,v1=<hex>; 与入站采用相同 HMAC 方案
Content-Type:          application/json
User-Agent:            goclaw-webhook/1
```

Payload：

```json
{
  "call_id": "<uuid>",
  "delivery_id": "<uuid>",
  "agent_id": "<uuid>",
  "status": "done",
  "output": "agent 的回复...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "metadata": {},
  "error": ""
}
```

成功时 `status` 为 `"done"`，agent 出错时为 `"failed"`（`error` 非空）。

重试计划（±10% 抖动）：

| 次序 | 延迟 |
|------|------|
| 1 | 30 秒 |
| 2 | 2 分钟 |
| 3 | 10 分钟 |
| 4 | 1 小时 |
| 5 | 6 小时 |

连续 5 次失败后行记录变为 `status=dead`。接收方返回的 `429 Retry-After` 会被遵守（上限 6 小时）。除 `429` 外的 `4xx` 视为永久失败。任何 `2xx` 都标记投递完成。

## 校验签名

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "strings"
    "time"
)

func verify(body []byte, sigHeader, hmacSigningKey string) error {
    var ts int64
    var sigHex string
    for _, part := range strings.Split(sigHeader, ",") {
        switch {
        case strings.HasPrefix(part, "t="):
            fmt.Sscanf(part[2:], "%d", &ts)
        case strings.HasPrefix(part, "v1="):
            sigHex = part[3:]
        }
    }
    if abs(time.Now().Unix()-ts) > 300 {
        return fmt.Errorf("timestamp skew")
    }
    key, err := hex.DecodeString(hmacSigningKey)
    if err != nil {
        return err
    }
    mac := hmac.New(sha256.New, key)
    fmt.Fprintf(mac, "%d.", ts)
    mac.Write(body)
    expected := mac.Sum(nil)
    received, err := hex.DecodeString(sigHex)
    if err != nil || !hmac.Equal(expected, received) {
        return fmt.Errorf("signature mismatch")
    }
    return nil
}
```

### Node.js

```js
const crypto = require('crypto');

function signWebhookRequest(body, hmacSigningKeyHex) {
  const ts = Math.floor(Date.now() / 1000);
  const key = Buffer.from(hmacSigningKeyHex, 'hex');
  const payload = Buffer.concat([Buffer.from(`${ts}.`), Buffer.from(body)]);
  const sig = crypto.createHmac('sha256', key).update(payload).digest('hex');
  return { ts, header: `t=${ts},v1=${sig}` };
}

const body = JSON.stringify({ input: 'hello', mode: 'sync' });
const { header } = signWebhookRequest(body, process.env.WEBHOOK_HMAC_KEY);

await fetch('https://gw.example.com/v1/webhooks/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Id': process.env.WEBHOOK_ID,
    'X-GoClaw-Signature': header,
  },
  body,
});
```

### Python

```python
import hashlib, hmac, json, os, time, requests

def sign(body: bytes, hmac_signing_key_hex: str) -> str:
    ts = int(time.time())
    key = bytes.fromhex(hmac_signing_key_hex)
    payload = f"{ts}.".encode() + body
    sig = hmac.new(key, payload, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"

body = json.dumps({"input": "hello", "mode": "sync"}).encode()
requests.post(
    "https://gw.example.com/v1/webhooks/llm",
    headers={
        "Content-Type": "application/json",
        "X-Webhook-Id": os.environ["WEBHOOK_ID"],
        "X-GoClaw-Signature": sign(body, os.environ["WEBHOOK_HMAC_KEY"]),
    },
    data=body,
)
```

## 速率限制

两层都必须通过：

| 层 | 上限 | 说明 |
|----|------|------|
| 单 webhook | `rate_limit_per_min` 字段（0 = 关闭） | 写在 webhook 记录上 |
| 单租户 | 平台默认值 | 对该租户的所有 webhook 共享 |

任一层拒绝都会返回 `429 Too Many Requests`，并带上 `Retry-After: 60`。

## Edition 差异

| 能力 | Standard | Lite |
|------|----------|------|
| `/v1/webhooks/llm` | 可用 | 可用（强制 `localhost_only`） |
| `/v1/webhooks/message` | 可用 | 禁用 |
| `localhost_only=false` | 可配置 | 永远 `true`，无法解除 |
| 创建 `kind="message"` | 允许 | 拒绝（`403`） |

Lite 模式下，所有 webhook 都会被自动创建为 `localhost_only=true`。试图通过 `PATCH` 取消它会得到 `403`。

## 安全

- **SSRF 防护。** `media_url` 与 `callback_url` 都按 SSRF 策略校验并做 HEAD 探测；`callback_url` 在投递时会再次校验以防 DNS 重绑定（`security.webhook.callback_ssrf_blocked`）。
- **Secret 存储。** 数据库只保存 `SHA-256(secret)` 与 AES-256-GCM 密文，raw secret 不会写日志。
- **租户隔离。** Agent 与 channel 必须属于该 webhook 的租户（`security.webhook.tenant_mismatch`）。
- **Rotate。** `POST /v1/webhooks/{id}/rotate` 立即作废旧 secret，没有过渡期。请提前与调用方协调。
- **加密密钥。** `GOCLAW_ENCRYPTION_KEY`（base64、32 字节原始数据）必须在所有网关副本一致。轮换它会通过标准的密钥轮换迁移重新加密所有 webhook secret。

## 审计 payload

每次调用都会向 `webhook_calls` 写入一行，包含 `request_payload`：

```json
{
  "body_hash": "<sha256-hex-64-chars>",
  "meta": { /* handler 相关 */ }
}
```

`body_hash` 是 raw request 字节的 SHA-256 —— 幂等检查器用它来发现同一 `Idempotency-Key` 下 body 不一致的重放。对 `llm` 调用，`meta` 镜像解码后的字段（`input`、`session_key`、`user_id`、`model`、`mode`、`callback_url`、`metadata`）。对 `message` 调用，`meta` 形如 `{channel_name, chat_id, has_media}`。

## 常见陷阱

| 现象 | 可能原因 | 处理 |
|------|---------|------|
| 每个 `/v1/webhooks/*` 都是 `404` | 未设置 `GOCLAW_ENCRYPTION_KEY` | 设置环境变量并重启网关 |
| `401 timestamp skew` | 时钟漂移 | 在调用方启用 NTP |
| 重试出现 `401 hmac_replay` | 重发了相同已签名的 payload | 每次重试用新时间戳重新签名 |
| `409 idempotency_conflict` | 同一 `Idempotency-Key` 但 body 不一致 | 重发完全相同的 body，或使用新的 key |
| Lite 网关返回 `403 unauthorized` | 试图创建 `message` webhook 或解除 `localhost_only` | 使用 Standard 网关或修改请求 |
| async 回调始终未到达 | `callback_url` 未通过 SSRF 校验或返回 `4xx` | 检查 `webhook_calls.status` 与 worker 日志 |

## What's Next

- [REST API → Webhooks](/rest-api)
- [环境变量 → `GOCLAW_ENCRYPTION_KEY`](/env-vars)
- [安全加固](/deploy-security)
- [频道概览](/channels-overview)

<!-- goclaw-source: 392f0fda | 更新: 2026-05-21 -->
