> Bản dịch từ [English version](/deploy-tailscale)

# Tailscale Integration

> Expose GoClaw gateway của bạn an toàn trên mạng Tailscale — không cần port forwarding, không cần IP public.

## Tổng quan

GoClaw có thể tham gia mạng [Tailscale](https://tailscale.com) của bạn như một node có tên, giúp gateway có thể truy cập từ bất kỳ thiết bị nào mà không cần mở firewall port. Lý tưởng cho self-hosted setup khi bạn muốn truy cập riêng tư từ xa qua laptop, điện thoại, hoặc CI runners.

Tailscale listener chạy **song song** với HTTP listener thông thường trên cùng handler — bạn có thể truy cập qua cả local lẫn Tailscale cùng lúc.

Tính năng này là opt-in và chỉ được compile khi build với `-tags tsnet`. Binary mặc định không có dependency Tailscale.

## Cách hoạt động

```mermaid
graph LR
    A[Laptop của bạn] -->|Tailscale network| B[node goclaw-gateway]
    C[Điện thoại của bạn] -->|Tailscale network| B
    B --> D[Gateway handler]
    E[Local network] -->|Port 18790| D
```

Khi `GOCLAW_TSNET_HOSTNAME` được đặt, GoClaw khởi động một `tsnet.Server` kết nối với Tailscale và lắng nghe trên port 80 (hoặc 443 với TLS). Node Tailscale xuất hiện trong Tailscale admin console như một thiết bị thông thường.

## Build với Tailscale Support

```bash
go build -tags tsnet -o goclaw .
```

Hoặc với Docker Compose dùng overlay có sẵn:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.tailscale.yml \
  up
```

Overlay truyền `ENABLE_TSNET: "true"` làm build arg, compile binary với `-tags tsnet`.

## Cấu hình

### Bắt buộc

```bash
# Từ https://login.tailscale.com/admin/settings/keys
# Dùng reusable auth key cho deployment lâu dài
export GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
```

### Tùy chọn

```bash
# Tên thiết bị Tailscale (mặc định: goclaw-gateway)
export GOCLAW_TSNET_HOSTNAME=my-goclaw

# Thư mục lưu Tailscale state (giữ qua các lần restart)
# Mặc định: OS user config dir
export GOCLAW_TSNET_DIR=/app/tsnet-state
```

Hoặc qua `config.json` (auth key **không bao giờ** lưu trong config — chỉ qua env):

```json
{
  "tailscale": {
    "hostname": "my-goclaw",
    "state_dir": "/app/tsnet-state",
    "ephemeral": false,
    "enable_tls": false
  }
}
```

| Field | Mặc định | Mô tả |
|-------|----------|-------|
| `hostname` | `goclaw-gateway` | Tên thiết bị Tailscale |
| `state_dir` | OS user config dir | Giữ Tailscale identity qua các lần restart |
| `ephemeral` | `false` | Nếu true, node tự động bị xóa khỏi tailnet khi GoClaw dừng — hữu ích cho CI/CD hoặc container ngắn hạn |
| `enable_tls` | `false` | Dùng Tailscale-managed HTTPS certs qua Let's Encrypt (listen trên `:443` thay vì `:80`) |

## Docker Compose Setup

Overlay `docker-compose.tailscale.yml` mount một named volume cho Tailscale state để node identity tồn tại qua các lần restart container:

```yaml
# docker-compose.tailscale.yml (full file)
services:
  goclaw:
    build:
      args:
        ENABLE_TSNET: "true"
    environment:
      - GOCLAW_TSNET_HOSTNAME=${GOCLAW_TSNET_HOSTNAME:-goclaw-gateway}
      - GOCLAW_TSNET_AUTH_KEY=${GOCLAW_TSNET_AUTH_KEY}
    volumes:
      - tsnet-state:/app/tsnet-state

volumes:
  tsnet-state:
```

Đặt auth key trong `.env`:

```bash
GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
GOCLAW_TSNET_HOSTNAME=my-goclaw
```

Rồi khởi động:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.tailscale.yml up -d
```

## Truy cập Gateway

Sau khi chạy, gateway của bạn có thể truy cập tại:

```
http://my-goclaw.your-tailnet.ts.net     # HTTP (mặc định)
https://my-goclaw.your-tailnet.ts.net    # HTTPS (nếu enable_tls: true)
```

Tìm hostname đầy đủ trong [Tailscale admin console](https://login.tailscale.com/admin/machines).

## Các vấn đề thường gặp

| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|------------|
| Node không xuất hiện trong Tailscale console | Auth key không hợp lệ hoặc hết hạn | Tạo reusable key mới tại admin/settings/keys |
| Tailscale listener không khởi động | Binary build thiếu `-tags tsnet` | Rebuild với `go build -tags tsnet` |
| `GOCLAW_TSNET_HOSTNAME` bị bỏ qua | Thiếu build tag | Kiểm tra `ENABLE_TSNET: "true"` trong docker build args |
| State mất sau khi restart container | Thiếu volume mount | Đảm bảo volume `tsnet-state` được mount vào `state_dir` |
| Connection refused từ Tailscale | `enable_tls` không khớp | Kiểm tra xem đang dùng HTTP hay HTTPS |

## Tiếp theo

- [Production Checklist](/deploy-checklist) — bảo mật deployment end to end
- [Security Hardening](/deploy-security) — CORS, rate limits, và token auth
- [Docker Compose Setup](/deploy-docker-compose) — tham chiếu đầy đủ compose overlay

<!-- goclaw-source: 57754a5 | cập nhật: 2026-03-18 -->
