 > Bản dịch từ [English version](/webhooks)

# Webhooks

> Kích hoạt agent hoặc gửi tin nhắn channel từ hệ thống bên ngoài qua endpoint HTTP xác thực bằng HMAC.

## Tổng quan

Webhooks của GoClaw cung cấp hai entry point HTTP cho phép hệ thống bên ngoài điều khiển gateway mà không cần dùng giao thức WebSocket RPC:

| Kind | Endpoint | Mục đích | Edition |
|------|----------|----------|---------|
| `llm` | `POST /v1/webhooks/llm` | Gọi agent với một prompt (sync hoặc async) | Standard + Lite |
| `message` | `POST /v1/webhooks/message` | Gửi tin nhắn tới người dùng qua channel đã kết nối | Standard |

Mỗi webhook là một bản ghi registry trong phạm vi tenant. Admin tạo bản ghi qua CRUD API rồi nhận một bearer secret và một HMAC signing key dùng một lần; sau đó client xác thực inbound request bằng một trong hai credential này.

> **Bắt buộc có encryption key.** Hệ webhook chỉ được mount khi `GOCLAW_ENCRYPTION_KEY` đã được set. Khi thiếu, mọi route `/v1/webhooks/*` trả về `404` và gateway log `webhook subsystem disabled`. Xem [Security Hardening](/deploy-security) và [Environment Variables](/env-vars).

## Admin CRUD

Mọi endpoint admin đều yêu cầu gateway token với quyền tenant-admin (`Authorization: Bearer <admin-token>`).

| Method | Path | Mục đích |
|--------|------|----------|
| `POST` | `/v1/webhooks` | Tạo webhook; trả về raw secret và HMAC key (một lần) |
| `GET` | `/v1/webhooks` | Liệt kê webhook của tenant. Hỗ trợ filter `?agent_id=<uuid>` |
| `GET` | `/v1/webhooks/{id}` | Lấy chi tiết một webhook (không có secret) |
| `PATCH` | `/v1/webhooks/{id}` | Update từng phần; `kind` không đổi được |
| `POST` | `/v1/webhooks/{id}/rotate` | Sinh secret mới (secret cũ bị vô hiệu ngay lập tức) |
| `DELETE` | `/v1/webhooks/{id}` | Revoke; mọi inbound call sau đó trả về `401` |

Xem [REST API → Webhooks](/rest-api) và [Endpoint Catalog](/api-endpoints-catalog) để biết shape request/response đầy đủ.

### Tạo webhook

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

Response (201 Created):

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

> `secret` và `hmac_signing_key` chỉ được trả về **một lần** — khi tạo và khi rotate. Hãy lưu ngay vào secret manager; không thể lấy lại được.

### Các field khi tạo

| Field | Loại | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `name` | string | có | Tối đa 100 ký tự |
| `kind` | string | có | `"llm"` hoặc `"message"` |
| `agent_id` | UUID | với kind `llm` | Agent sẽ được gọi |
| `channel_id` | UUID | tuỳ chọn | Cố định webhook `message` vào một channel cụ thể |
| `require_hmac` | bool | không | Bắt buộc dùng HMAC (vô hiệu bearer) |
| `localhost_only` | bool | không | Chỉ chấp nhận 127.0.0.1/::1. Trên Lite luôn bị ép thành `true` |
| `rate_limit_per_min` | int | không | Giới hạn cho từng webhook (0 = dùng default của tenant) |
| `ip_allowlist` | []string | không | IP hoặc CIDR. Rỗng = cho phép mọi nguồn |

## Authentication

Field `require_hmac` trên webhook quyết định mode nào được chấp nhận.

### Bearer auth

```
Authorization: Bearer wh_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH
```

Gateway hash token bằng SHA-256, so sánh constant-time với `secret_hash`, rồi dùng `GOCLAW_ENCRYPTION_KEY` để giải mã material đã lưu. Bearer auth bị **từ chối** khi `require_hmac=true`.

### HMAC auth (khuyến nghị)

Gửi ba header:

```
X-Webhook-Id: <webhook-uuid>
X-GoClaw-Signature: t=<unix_seconds>,v1=<hmac_hex>
Content-Type: application/json
```

Thuật toán ký:

```
signing_key = hex.Decode(hmac_signing_key)   // hex_64 → 32 raw bytes
payload     = "{unix_ts}.{request_body_bytes}"
signature   = HMAC_SHA256(signing_key, payload)
header      = "t={unix_ts},v1={hex(signature)}"
```

`hmac_signing_key` chính là `hex(SHA-256(raw_secret))`. Gateway không bao giờ lưu raw secret — chỉ lưu hash và một ciphertext AES-256-GCM dùng cho worker outbound khi cần ký lại.

**Timestamp skew.** Request có `|now - t| > 300` giây bị từ chối. Hãy đồng bộ đồng hồ qua NTP.

**Chống replay.** Sau khi signature hợp lệ, gateway ghi `sha256(tenant_id|signature_hex)` vào nonce cache in-memory (TTL 320s). Replay trả `401` kèm sự kiện audit `security.webhook.hmac_replay`. Cache này per-process — deployment nhiều node có thể vẫn chấp nhận replay ở node khác trên lý thuyết.

**IP allowlist.** Khi `ip_allowlist` khác rỗng, mỗi entry được match với `RemoteAddr` của request sau khi auth thành công. Hỗ trợ CIDR và IP đơn lẻ. `X-Forwarded-For` **không** được tin cậy.

## POST /v1/webhooks/llm

Kích hoạt agent với một prompt. Có sẵn ở mọi edition (Standard + Lite).

```bash
curl -X POST https://gw.example.com/v1/webhooks/llm \
  -H "Authorization: Bearer wh_..." \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Tóm tắt metric mới nhất",
    "session_key": "user-123-session",
    "mode": "sync"
  }'
```

Các field request:

| Field | Loại | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `input` | string hoặc array | có | Chuỗi đơn giản, hoặc array `[{role, content}]` |
| `session_key` | string | không | Khoá để liên tục hội thoại nhiều turn |
| `user_id` | string | không | Định danh user bên ngoài để scope |
| `model` | string | không | Override model cho request này |
| `mode` | string | không | `"sync"` (mặc định) hoặc `"async"` |
| `callback_url` | string | bắt buộc khi async | HTTPS URL; validate qua SSRF policy |
| `metadata` | object | không | Echo lại vào callback async (tối đa 8 KB) |

**Sync mode** timeout sau 30 giây và trả về toàn bộ output của agent:

```json
{
  "call_id": "<uuid>",
  "agent_id": "<uuid>",
  "output": "Đây là metric: ...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "finish_reason": "stop"
}
```

**Async mode** trả `202 Accepted` cùng `{"call_id": "...", "status": "queued"}`; kết quả được gửi tới `callback_url` qua outbound delivery (xem [Outbound callbacks](#outbound-callbacks)).

Bảng lỗi:

| Status | Code | Khi nào |
|--------|------|---------|
| 400 | `invalid_request` | Thiếu `input`, sai `mode`, thiếu `callback_url` cho async |
| 401 | — | Bearer sai, HMAC mismatch, đã revoke, HMAC replay |
| 403 | `unauthorized` | Vi phạm `localhost_only`, IP bị deny, sai kind, sai tenant |
| 404 | `not_found` | Agent không tồn tại |
| 429 | — | Vượt rate limit (`Retry-After: 60`) |
| 503 | — | Lane xử lý webhook đã đầy |
| 504 | — | LLM timeout (chỉ sync) |

## POST /v1/webhooks/message

Gửi tin nhắn tới user qua channel đã kết nối. **Chỉ Standard edition.**

```json
{
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "content": "Xin chào từ integration!",
  "media_url": "https://example.com/image.jpg",
  "media_caption": "Caption tuỳ chọn",
  "fallback_to_text": false
}
```

| Field | Loại | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `channel_name` | string | có (trừ khi webhook có `channel_id` bound) | Tên channel instance |
| `chat_id` | string | có | ID người nhận theo channel |
| `content` | string | có (trừ khi gửi `media_url`) | Nội dung text; tối đa 16 KB |
| `media_url` | string | không | HTTPS URL. SSRF-guarded + HEAD-probe trước khi tải |
| `media_caption` | string | không | Caption cho media |
| `fallback_to_text` | bool | không | True = chỉ gửi text khi channel không nhận media |

Response:

```json
{
  "call_id": "<uuid>",
  "status": "sent",
  "channel_name": "telegram-prod",
  "chat_id": "123456789",
  "warning": ""
}
```

`warning` được set thành `"media_not_supported_fallback_text"` khi `fallback_to_text=true` và channel đã bỏ media. Các channel không hỗ trợ media (ví dụ `zalo_oa`) trả `501 Not Implemented` trừ khi `fallback_to_text=true`.

## Idempotency

Mọi endpoint webhook đều chấp nhận header `Idempotency-Key` (tối đa 255 ký tự).

- Request đầu tiên với key đó: xử lý bình thường.
- Cùng key + body giống hệt: trả về response đã cache với `200 OK`.
- Cùng key + body khác: trả `409 Conflict` (`webhook.idempotency_conflict`).
- Key hết hạn sau 24 giờ (TTL của bảng `webhook_calls`).

Dùng UUID hoặc hash của payload. Khi retry hãy gửi **đúng body cũ**.

## Outbound callbacks

Async LLM call gửi kết quả về `callback_url` qua `HTTP POST`. Delivery là **at-least-once** — receiver phải idempotent.

Mọi lần thử đều mang header:

```
X-Webhook-Delivery-Id: <uuid>          ; ổn định qua các retry — dedupe theo field này
X-Webhook-Signature:   t=<unix>,v1=<hex>; cùng scheme HMAC như inbound
Content-Type:          application/json
User-Agent:            goclaw-webhook/1
```

Payload:

```json
{
  "call_id": "<uuid>",
  "delivery_id": "<uuid>",
  "agent_id": "<uuid>",
  "status": "done",
  "output": "Phản hồi của agent...",
  "usage": {"prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350},
  "metadata": {},
  "error": ""
}
```

`status` là `"done"` khi thành công, `"failed"` khi agent lỗi (`error` sẽ có nội dung).

Lịch retry (jitter ±10%):

| Lần | Delay |
|-----|-------|
| 1 | 30 giây |
| 2 | 2 phút |
| 3 | 10 phút |
| 4 | 1 giờ |
| 5 | 6 giờ |

Sau 5 lần thất bại, row chuyển sang `status=dead`. Header `429 Retry-After` từ receiver được tôn trọng (giới hạn ở 6 giờ). Mọi response `4xx` khác `429` đều coi là failure vĩnh viễn. Mọi `2xx` đánh dấu delivery hoàn tất.

## Verify chữ ký

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

## Rate limit

Hai tầng phải cùng pass:

| Tầng | Giới hạn | Ghi chú |
|------|----------|---------|
| Theo webhook | Field `rate_limit_per_min` (0 = tắt) | Set trên bản ghi webhook |
| Theo tenant | Mặc định của platform | Áp dụng chung cho mọi webhook của tenant |

Bị reject ở tầng nào cũng trả `429 Too Many Requests` kèm `Retry-After: 60`.

## Khác biệt theo edition

| Tính năng | Standard | Lite |
|-----------|----------|------|
| `/v1/webhooks/llm` | Có | Có (ép `localhost_only`) |
| `/v1/webhooks/message` | Có | Không |
| `localhost_only=false` | Có thể bật/tắt | Luôn `true`; không thay đổi được |
| Tạo webhook `kind="message"` | Cho phép | Bị từ chối (`403`) |

Trên Lite, mọi webhook đều tự động được tạo với `localhost_only=true`. Một `PATCH` cố gắng tắt cờ này sẽ nhận `403`.

## Bảo mật

- **Chặn SSRF.** `media_url` và `callback_url` được validate qua SSRF policy và HEAD-probe; callback URL còn được kiểm tra lại ở thời điểm delivery để chống DNS rebinding (`security.webhook.callback_ssrf_blocked`).
- **Lưu secret.** Chỉ `SHA-256(secret)` và ciphertext AES-256-GCM được lưu; raw secret không bao giờ được log.
- **Tenant isolation.** Agent và channel phải thuộc tenant của webhook (`security.webhook.tenant_mismatch`).
- **Rotate.** `POST /v1/webhooks/{id}/rotate` vô hiệu secret cũ ngay lập tức — không có grace window. Phối hợp với caller trước khi rotate.
- **Encryption key.** `GOCLAW_ENCRYPTION_KEY` (base64, 32 byte) phải giống nhau trên mọi replica gateway. Rotate key sẽ re-encrypt toàn bộ secret webhook qua migration chuẩn.

## Audit payload

Mỗi call ghi một row vào `webhook_calls` với field `request_payload`:

```json
{
  "body_hash": "<sha256-hex-64-chars>",
  "meta": { /* tuỳ handler */ }
}
```

`body_hash` là SHA-256 của raw bytes — dùng cho idempotency checker khi phát hiện body khác với cùng `Idempotency-Key`. Với `llm`, `meta` mirror lại field đã decode (`input`, `session_key`, `user_id`, `model`, `mode`, `callback_url`, `metadata`). Với `message`, `meta` là `{channel_name, chat_id, has_media}`.

## Các lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách khắc phục |
|-------------|-------------|----------------|
| `404` ở mọi route `/v1/webhooks/*` | Chưa set `GOCLAW_ENCRYPTION_KEY` | Set env var và khởi động lại gateway |
| `401 timestamp skew` | Đồng hồ lệch | Bật NTP ở phía caller |
| `401 hmac_replay` khi retry | Gửi lại nguyên payload đã ký | Ký lại với timestamp mới ở mỗi retry |
| `409 idempotency_conflict` | Cùng `Idempotency-Key` nhưng body khác | Gửi lại đúng body, hoặc dùng key mới |
| `403 unauthorized` từ Lite gateway | Tạo webhook `message` hoặc tắt `localhost_only` | Dùng Standard hoặc sửa request |
| Async callback không tới | `callback_url` fail SSRF hoặc trả `4xx` | Kiểm tra `webhook_calls.status` và log worker |

## What's Next

- [REST API → Webhooks](/rest-api)
- [Environment Variables → `GOCLAW_ENCRYPTION_KEY`](/env-vars)
- [Security Hardening](/deploy-security)
- [Channels Overview](/channels-overview)

<!-- goclaw-source: 392f0fda | cập nhật: 2026-05-21 -->
