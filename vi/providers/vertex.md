 > Bản dịch từ [English version](/provider-vertex)

# Vertex AI

> Dùng endpoint OpenAI-compatible của Google Cloud Vertex AI cho Gemini, xác thực bằng OAuth2 service account hoặc Application Default Credentials.

## Tổng quan

GoClaw kết nối tới Google Cloud Vertex AI qua API OpenAI-compatible. Bên trong, provider là một `OpenAIProvider` được wire với Google OAuth2 token source — mỗi request được ký bằng access token ngắn hạn mà gateway tự refresh mỗi giờ.

URL endpoint được tạo từ GCP project và region:

```
https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/endpoints/openapi
```

Ví dụ project `acme-prod` và region `us-central1` sẽ tới `https://us-central1-aiplatform.googleapis.com/v1/projects/acme-prod/locations/us-central1/endpoints/openapi`.

## Yêu cầu

- Một project Google Cloud đã bật **Vertex AI API**.
- Một trong hai:
  - Service-account JSON key có role `roles/aiplatform.user`, hoặc
  - Application Default Credentials (`gcloud auth application-default login` cho local, hoặc metadata server trên GCE/GKE/Cloud Run).
- OAuth scope `https://www.googleapis.com/auth/cloud-platform` được yêu cầu tự động — bạn không cần config.

## Thứ tự credential

Khi provider khởi động, nó duyệt các nguồn credential theo thứ tự sau và dừng ở nguồn đầu tiên có giá trị:

1. **Inline JSON** — `credentials_json` (field Settings trong DB) hoặc `providers.vertex.api_key` (config.json). Dán toàn bộ JSON service-account.
2. **File path** — `credentials_file` đường dẫn trên ổ đĩa. **Chỉ dành cho operator.** Path này được đọc trực tiếp bởi process gateway; tuyệt đối đừng expose qua admin UI nếu chưa có allowlist path nghiêm ngặt.
3. **Application Default Credentials** — fallback về `GOOGLE_APPLICATION_CREDENTIALS`, creds user gcloud, hoặc metadata server của GCP. ADC discovery giới hạn ở 10 giây để metadata server thiếu không treo startup.

## Cấu hình qua config.json

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

Provider chỉ được init khi **có cả** `project_id` và `region`. `api_key` nhận toàn bộ service-account JSON dưới dạng string. Để dùng ADC, để trống cả `api_key` và `credentials_file`.

## Cấu hình qua Dashboard

Tạo provider tại **Settings → Providers → Add provider** với `provider_type: "vertex"`. Các field riêng của Vertex nằm trong `settings`:

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

API key và settings được mã hoá at-rest bằng AES-256-GCM. Provider chạy từ DB cũng tuân theo thứ tự credential ở trên — để trống `api_key` nếu host gateway dùng ADC.

## Model được hỗ trợ

Endpoint OpenAI-compatible của Vertex AI nhận mọi model Gemini Google publish dưới namespace `google/`, ví dụ:

| Model ID | Ghi chú |
|----------|---------|
| `google/gemini-2.0-flash-001` | Mặc định |
| `google/gemini-2.5-pro-001` | Context lớn nhất, hỗ trợ thinking |
| `google/gemini-2.5-flash-001` | Nhanh, hỗ trợ thinking |
| `google/gemini-1.5-pro-002` | Thế hệ trước, context 2M |

Luôn giữ prefix `google/` — Vertex OpenAI shim bắt buộc có nó. Kiểm tra [Vertex model catalog](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) để biết model hiện có theo region.

## Validate region và project

Provider validate cả hai giá trị trước khi gọi network:

- `project_id` — 6–30 ký tự lowercase/digit/hyphen, bắt đầu bằng chữ cái (format GCP project ID).
- `region` — lowercase, các đoạn alphanumeric ngăn cách bằng hyphen (vd. `us-central1`, `asia-southeast1`).

Giá trị sai format sẽ fail ngay khi startup. Nếu bạn truyền `api_base_override`, gateway còn từ chối URL có host không nằm dưới `*.googleapis.com` — bảo vệ không cho provider trỏ tới endpoint của attacker trong khi vẫn auth Google.

## Ví dụ

### Smoke test nhanh trong agent loop

```json
{
  "model": "google/gemini-2.0-flash-001",
  "options": {
    "temperature": 0.2
  }
}
```

### Pin model theo từng request

Vì Vertex dùng adapter `OpenAIProvider`, mọi request đều tôn trọng override `model` ở request level. Cả webhook inline-message lẫn agent loop chuẩn đều chấp nhận.

### Inline credential trong config.json

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

### ADC trên GKE / Cloud Run

Để trống cả `api_key` và `credentials_file`, đồng thời gán role `roles/aiplatform.user` cho service account của workload. Provider lấy token từ metadata server tự động.

## Streaming, tools, vision

Provider Vertex nói OpenAI ChatCompletions cùng code path với adapter `openai` và `gemini`. Streaming, function/tool calling, và image input hoạt động giống như `openai` hay `gemini`. Extended thinking trên Gemini 2.5 được map từ `thinking_level` sang `reasoning_effort` tự động (xem [Gemini](/provider-gemini) để biết chi tiết thought_signature passback).

## Troubleshooting

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| `vertex: project_id is required` | Thiếu project hoặc region | Set cả `project_id` và `region` |
| `vertex: invalid project_id` | ID có chữ hoa, gạch dưới, hoặc sai độ dài | Dùng project ID GCP chuẩn (6–30 lowercase) |
| `vertex: application default credentials not found` | Không có nguồn ADC trên host | Set `GOOGLE_APPLICATION_CREDENTIALS`, truyền `credentials_file`, hoặc chạy trên GCP |
| `vertex: parse inline credentials` | `api_key` không phải service-account JSON hợp lệ | Paste nguyên file JSON, không sửa |
| `403 Permission denied` từ Vertex | Service account thiếu role | Gán `roles/aiplatform.user` |
| `HTTP 429` | Vượt quota | Xin tăng quota trong GCP console; GoClaw tự retry |
| Model không tìm thấy | Sai model ID hoặc sai region | Đảm bảo model có sẵn ở region đang config; giữ prefix `google/` |

## What's Next

- [Gemini](/provider-gemini) — Gemini qua endpoint OpenAI-compatible của Google AI Studio
- [OpenAI](/provider-openai) — ghi chú chung về adapter OpenAI-compatible
- [Providers Overview](/providers-overview) — kiến trúc adapter, retry, credential resolver

<!-- goclaw-source: 392f0fda | cập nhật: 2026-05-21 -->
