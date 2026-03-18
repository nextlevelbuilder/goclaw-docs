> Bản dịch từ [English version](#deploy-checklist)

# Production Checklist

> Tất cả những gì cần kiểm tra trước khi đưa GoClaw từ môi trường development lên production.

## Tổng quan

Checklist này bao gồm các bước quan trọng để hardening, bảo mật, và vận hành ổn định GoClaw gateway trong production. Đi qua từng mục từ trên xuống trước khi go live.

---

## 1. Database

- [ ] PostgreSQL 15+ đang chạy với extension **pgvector** đã cài
- [ ] `GOCLAW_POSTGRES_DSN` đặt qua environment — không bao giờ trong `config.json`
- [ ] Connection pool được điều chỉnh phù hợp với concurrency dự kiến
- [ ] Connection pool database dùng tối đa 25 kết nối mở / 10 kết nối nhàn rỗi (cố định) — đảm bảo `max_connections` của PostgreSQL đủ chỗ cho số này cộng với các client khác
- [ ] Backup tự động đã cấu hình (tối thiểu hàng ngày, test restore mỗi quý)
- [ ] Schema đã cập nhật: `./goclaw upgrade --status` hiển thị `UP TO DATE`

```bash
# Kiểm tra trạng thái schema
./goclaw upgrade --status

# Áp dụng migration đang chờ
./goclaw upgrade
```

---

## 2. Secrets và Encryption

- [ ] `GOCLAW_ENCRYPTION_KEY` đặt bằng chuỗi hex 32 byte ngẫu nhiên — **backup ngay**. Mất key này đồng nghĩa mất toàn bộ API key đã mã hóa trong database.
- [ ] `GOCLAW_GATEWAY_TOKEN` đặt bằng giá trị ngẫu nhiên mạnh — bắt buộc cho WebSocket và HTTP auth
- [ ] Không có secret nào xuất hiện trong `config.json`, git history, hay logs
- [ ] Tất cả provider API key đặt qua environment (`GOCLAW_ANTHROPIC_API_KEY`, v.v.) hoặc thêm qua dashboard (được lưu mã hóa AES-256-GCM)

```bash
# Tạo secrets nếu chưa chạy onboard/prepare-env.sh
export GOCLAW_ENCRYPTION_KEY=$(openssl rand -hex 32)
export GOCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

> Backup `GOCLAW_ENCRYPTION_KEY` trong một secrets manager (ví dụ AWS Secrets Manager, 1Password, Vault). Nếu bạn rotate key, toàn bộ API key mã hóa trong database sẽ không đọc được.

---

## 3. Network và TLS

- [ ] TLS termination đã có (nginx, Caddy, Cloudflare, hoặc load balancer) — GoClaw không tự terminate TLS trong chế độ thường
- [ ] Gateway **không** được expose trực tiếp trên public port mà không có TLS
- [ ] `gateway.allowed_origins` đặt đúng với client origins thực tế (để trống = cho phép tất cả WebSocket origins)

```json
{
  "gateway": {
    "allowed_origins": ["https://your-dashboard.example.com"]
  }
}
```

---

## 4. Rate Limiting

- [ ] `gateway.rate_limit_rpm` đã đặt (mặc định: 20 requests/phút mỗi user, 0 = tắt)
- [ ] `tools.rate_limit_per_hour` đã đặt (mặc định: 150 tool executions/giờ mỗi session, 0 = tắt)
- [ ] Webhook rate limiting được tích hợp sẵn (30 requests/60s mỗi nguồn, tối đa 4096 nguồn được theo dõi) — không cần cấu hình

```json
{
  "gateway": {
    "rate_limit_rpm": 20
  },
  "tools": {
    "rate_limit_per_hour": 150
  }
}
```

---

## 5. Cấu hình Sandbox

Nếu agent thực thi code, review cài đặt sandbox:

- [ ] `sandbox.mode` đã đặt: `"off"` (không sandbox), `"non-main"` (chỉ sandbox subagent), hoặc `"all"` (sandbox tất cả)
- [ ] `sandbox.memory_mb` và `sandbox.cpus` đã điều chỉnh phù hợp workload (mặc định: 512 MB, 1 CPU)
- [ ] `sandbox.network_enabled` là `false` trừ khi agent thực sự cần truy cập mạng
- [ ] `sandbox.read_only_root` là `true` (mặc định) để root filesystem container không thể ghi
- [ ] `sandbox.timeout_sec` đặt ở giới hạn hợp lý (mặc định: 300s)
- [ ] `sandbox.idle_hours` đã điều chỉnh (mặc định: 24 — xóa container nhàn rỗi lâu hơn mức này)
- [ ] `sandbox.max_age_days` đã đặt (mặc định: 7 — xóa container cũ hơn số ngày này)

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "memory_mb": 512,
        "cpus": 1.0,
        "network_enabled": false,
        "read_only_root": true,
        "timeout_sec": 120
      }
    }
  }
}
```

---

## 6. Cài đặt bảo mật

- [ ] `gateway.injection_action` đặt `"warn"` (mặc định) hoặc `"block"` — không bao giờ dùng `"off"` trong production
- [ ] `tools.exec_approval.security` là `"full"` (mặc định) — chặn các shell pattern nguy hiểm
- [ ] `agents.defaults.restrict_to_workspace` là `true` (mặc định) — ngăn path traversal ra ngoài workspace
- [ ] Review `tools.web_fetch` domain allow/deny lists nếu agent duyệt web

---

## 7. Monitoring và Alerting

- [ ] Log output được thu thập (stdout/stderr) — GoClaw dùng structured JSON logging qua `slog`
- [ ] Alert khi có nhiều log `slog.Warn("security.*")` — dấu hiệu tấn công bị chặn hoặc anomaly
- [ ] Alert khi có `tracing: span buffer full` — collector đang bị lag dưới tải cao
- [ ] Uptime monitoring đã cấu hình (ví dụ ping `/health` hoặc gateway port)
- [ ] Cân nhắc bật OTel export để có visibility ở cấp trace — xem [Observability](#deploy-observability)
- [ ] Tài liệu API tương tác có tại `/docs` (Swagger UI) và `/v1/openapi.json` để kiểm tra tích hợp

---

## 8. Vận hành

- [ ] Log rotation đã cấu hình nếu ghi ra file (dùng `logrotate` hoặc log driver của container runtime)
- [ ] `GOCLAW_AUTO_UPGRADE=true` chỉ đặt **khi** bạn chấp nhận schema migration tự động khi khởi động; ngược lại upgrade thủ công bằng `./goclaw upgrade`
- [ ] Có runbook cho: restart, rollback, DB restore, và encryption key rotation
- [ ] Quy trình upgrade đã được ghi lại và kiểm tra — xem [Upgrading](#deploy-upgrading)

---

## 9. Quản lý API Key

- [ ] Cân nhắc tạo scoped API key thay vì chia sẻ gateway token
- [ ] API key hỗ trợ scope chi tiết: `operator.admin`, `operator.read`, `operator.write`, `operator.approvals`, `operator.pairing`
- [ ] Key được hash (SHA-256) trước khi lưu — plaintext chỉ hiển thị một lần khi tạo
- [ ] Thiết lập chính sách rotation key — từng key có thể thu hồi độc lập mà không ảnh hưởng key khác

```json
// Ví dụ: tạo key read-only cho monitoring
// qua dashboard hoặc API
{
  "name": "monitoring-readonly",
  "scopes": ["operator.read"]
}
```

---

## 10. Điều chỉnh Concurrency

GoClaw dùng lane-based scheduling để giới hạn số lượng agent chạy đồng thời theo từng loại:

| Biến môi trường | Mặc định | Mục đích |
|----------------|---------|---------|
| `GOCLAW_LANE_MAIN` | `30` | Số lượng main agent chạy đồng thời tối đa |
| `GOCLAW_LANE_SUBAGENT` | `50` | Số lượng subagent chạy đồng thời tối đa |
| `GOCLAW_LANE_DELEGATE` | `100` | Số lượng delegated run đồng thời tối đa |
| `GOCLAW_LANE_CRON` | `30` | Số lượng cron job chạy đồng thời tối đa |

Điều chỉnh các giá trị này dựa trên tài nguyên server và tải dự kiến. Giá trị thấp hơn giảm áp lực bộ nhớ; giá trị cao hơn cải thiện throughput.

---

## 11. Điều chỉnh Gateway

Review các cài đặt gateway sau cho deployment của bạn:

| Cài đặt | Mặc định | Mô tả |
|---------|---------|-------|
| `gateway.owner_ids` | `[]` | User ID có quyền owner — giữ danh sách này ở mức tối thiểu |
| `gateway.max_message_chars` | `32000` | Kích thước tối đa tin nhắn người dùng trước khi cắt bớt |
| `gateway.inbound_debounce_ms` | `1000` | Gộp các tin nhắn liên tiếp nhanh (ms) |
| `gateway.task_recovery_interval_sec` | `300` | Tần suất kiểm tra recovery cho team task |

- [ ] `gateway.owner_ids` chỉ chứa các user ID admin đáng tin
- [ ] `gateway.max_message_chars` phù hợp với use case của bạn (thấp hơn = ít token spend hơn)

---

## Kiểm tra nhanh

### Cài đặt lần đầu

Với cài đặt mới, lệnh `onboard` xử lý quá trình thiết lập ban đầu một cách tương tác:

```bash
./goclaw onboard
```

Nó tạo encryption và gateway token, chạy database migration, và hướng dẫn bạn qua cấu hình cơ bản. Bạn cũng có thể chạy `prepare-env.sh` để tạo secret không tương tác.

### Kiểm tra sức khỏe hệ thống

Lệnh `doctor` chạy kiểm tra toàn diện môi trường của bạn:

```bash
./goclaw doctor
```

Nó xác nhận: thông tin runtime, file config, kết nối database và phiên bản schema, provider API key, thông tin xác thực channel, các công cụ ngoài (docker, curl, git), và thư mục workspace.

```bash
# Kiểm tra schema và migration đang chờ
./goclaw upgrade --status

# Xác nhận gateway khởi động và kết nối được DB
./goclaw &
curl http://localhost:18790/health

# Xác nhận secrets không bị lộ trong logs
# Tìm "***" che, không phải giá trị key thật
```

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân có thể | Cách xử lý |
|--------|-------------------|------------|
| Gateway từ chối khởi động | Schema lỗi thời | Chạy `./goclaw upgrade` |
| Encrypted API key không đọc được | Sai `GOCLAW_ENCRYPTION_KEY` | Restore key đúng từ backup |
| WebSocket connection bị reject | `allowed_origins` quá hạn chế | Thêm dashboard origin vào danh sách |
| Rate limit quá chặt | Mặc định 20 RPM cho high-traffic | Tăng `gateway.rate_limit_rpm` |
| Agent thoát khỏi workspace | `restrict_to_workspace` đã tắt | Đặt `true` trong config |

## Tiếp theo

- [Upgrading](#deploy-upgrading) — cách upgrade GoClaw an toàn
- [Observability](#deploy-observability) — cài đặt tracing và alerting
- [Security Hardening](#deploy-security) — cấu hình bảo mật sâu hơn
- [Docker Compose Setup](#deploy-docker-compose) — các pattern compose cho production

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
