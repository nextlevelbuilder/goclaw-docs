 > Bản dịch từ [English version](/workstations)

# Workstations

> Chạy command của agent trên máy từ xa qua SSH hoặc Docker, với allowlist riêng cho từng workstation và audit đầy đủ.

## Tổng quan

**Workstation** là một target thực thi từ xa được đăng ký trong GoClaw. Khi agent gọi tool có sẵn `workstation_exec`, gateway mở session tới workstation đã link, chạy command, stream stdout/stderr về dưới dạng event-bus chunks, và ghi một row vào log activity.

Workstation tenant-scoped và chỉ có ở Standard edition. Hai backend được hỗ trợ:

| Backend | `backendType` | Transport | Ghi chú |
|---------|---------------|-----------|---------|
| SSH | `ssh` | OpenSSH client + session pool | Inline PEM private key hoặc password. TOFU host-key fingerprint |
| Docker | `docker` | Docker engine API | Image + tên container; phù hợp cho sandbox tạm thời |

Connection pool dùng chung trong từng workstation, nên các lần gọi `workstation_exec` lặp lại sẽ tái sử dụng SSH client đang ấm thay vì handshake lại TCP+TLS mỗi lần.

## Lifecycle

1. **Tạo** workstation — POST `/v1/workstations` với `workstationKey`, `name`, `backendType`, và `metadata`.
2. **Test** connection — `POST /v1/workstations/{id}/test`. SSH backend sẽ dial, chạy `echo ok`, và tear down trong vòng 5 giây.
3. **Seed allowlist** — diễn ra tự động khi create. Xem [Permission model](#permission-model).
4. **Link agent** — qua WebSocket: `workstations.linkAgent` với `{agentId, workstationId, isDefault}`.
5. **Sử dụng** — agent gọi tool `workstation_exec`. Mỗi call đều đi qua permission checker và được ghi vào `workstation_activity`.

`workstationKey` là slug ổn định dùng trong API call; regex là `^[a-z0-9][a-z0-9-]{0,99}$`.

## Endpoints

Mọi endpoint HTTP đều yêu cầu gateway token tenant-admin (`Authorization: Bearer <admin-token>`).

| Method | Path | Mục đích |
|--------|------|----------|
| `GET` | `/v1/workstations` | Liệt kê workstation active |
| `POST` | `/v1/workstations` | Tạo workstation |
| `GET` | `/v1/workstations/{id}` | Lấy chi tiết (sanitized view) |
| `PUT` | `/v1/workstations/{id}` | Update từng phần |
| `DELETE` | `/v1/workstations/{id}` | Xoá hẳn (tenant-scoped) |
| `POST` | `/v1/workstations/{id}/test` | Health-check backend |
| `GET` | `/v1/workstations/{id}/permissions` | Liệt kê pattern allowlist |
| `POST` | `/v1/workstations/{id}/permissions` | Thêm pattern (mặc định enabled) |
| `DELETE` | `/v1/workstations/{id}/permissions/{permId}` | Xoá pattern |
| `PUT` | `/v1/workstations/{id}/permissions/{permId}/toggle` | Bật/tắt pattern |
| `GET` | `/v1/workstations/{id}/activity` | Audit log có phân trang (`limit`, `cursor`) |

Các thao tác tương đương cũng có ở dạng WebSocket RPC dưới namespace `workstations.*` (xem [WebSocket Protocol](/websocket-protocol)). `workstations.linkAgent` / `workstations.unlinkAgent` **chỉ** có qua WebSocket.

### Tạo workstation

```bash
curl -X POST https://gw.example.com/v1/workstations \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workstationKey": "build-vm",
    "name": "Build VM (us-west)",
    "backendType": "ssh",
    "metadata": {
      "host": "10.0.4.21",
      "port": 22,
      "user": "deploy",
      "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
      "knownHostsFingerprint": "SHA256:abcdef..."
    },
    "defaultCwd": "/srv/builds",
    "defaultEnv": {"PATH": "/usr/local/bin:/usr/bin"}
  }'
```

Response (201 Created) trả về **sanitized view** — private key và password không bao giờ được echo lại. Chỉ có metadata summary (`host`, `port`, `user`, `hasKey`):

```json
{
  "workstation": {
    "id": "1c2d...",
    "workstationKey": "build-vm",
    "tenantId": "...",
    "name": "Build VM (us-west)",
    "backendType": "ssh",
    "defaultCwd": "/srv/builds",
    "active": true,
    "createdAt": "2026-05-21T12:00:00Z",
    "metadataSummary": {"host": "10.0.4.21", "port": 22, "user": "deploy", "hasKey": true}
  }
}
```

### SSH metadata

| Field | Bắt buộc | Ghi chú |
|-------|----------|---------|
| `host` | có | DNS name hoặc IP |
| `user` | có | User trên máy remote |
| `port` | không | Mặc định `22`; trong khoảng 1–65535 |
| `privateKey` | một trong `privateKey`/`password` | PEM; lưu AES-256-GCM encrypted |
| `password` | một trong `privateKey`/`password` | Ưu tiên key auth |
| `knownHostsFingerprint` | khuyến nghị | `SHA256:...` của host key. Rỗng → TOFU lần đầu |
| `connectTimeoutSec` | không | Override timeout dial mặc định 10s |

### Docker metadata

| Field | Bắt buộc | Ghi chú |
|-------|----------|---------|
| `image` | có | Tham chiếu image container |
| `host` | một trong `host`/`socketPath` | URL Docker daemon remote |
| `socketPath` | một trong `host`/`socketPath` | UNIX socket local |
| `network` | không | Docker network để attach |

## Permission model

Workstation chạy theo **default-deny** allowlist match với `argv[0]` — tên binary. Không hỗ trợ wildcard `*` đơn lẻ.

Bảng `workstation_permissions` có table riêng (migration `000063`) và được seed tự động khi tạo workstation. Default seed là tập binary read-only hoặc rủi ro thấp:

```
echo, pwd, ls, cat, git, whoami, hostname, date, uname, claude
```

Các shell (`bash`, `sh`, `zsh`) bị cố tình loại — thêm shell sẽ phá huỷ toàn bộ mô hình vì cho phép truyền command tuỳ ý qua argument.

Mỗi pattern hoặc là tên binary tuyệt đối (`git`) hoặc prefix-glob (`python*`). Mở rộng allowlist:

```bash
curl -X POST https://gw.example.com/v1/workstations/<id>/permissions \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"pattern": "make"}'
```

Tạm tắt pattern mà không xoá:

```bash
curl -X PUT https://gw.example.com/v1/workstations/<id>/permissions/<permId>/toggle \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"enabled": false}'
```

Pattern disabled vẫn nằm trong bảng nhưng bị runtime checker bỏ qua.

## Link agent

Dùng WebSocket RPC `workstations.linkAgent`:

```json
{
  "id": "req-1",
  "method": "workstations.linkAgent",
  "params": {
    "agentId": "<agent-uuid>",
    "workstationId": "<ws-uuid>",
    "isDefault": true
  }
}
```

Bảng `agent_workstation_links` chỉ cho phép một workstation default cho mỗi agent — set `isDefault=true` sẽ xoá default cũ. Để unlink, gọi `workstations.unlinkAgent` với cùng `agentId` và `workstationId`.

Khi agent chạy tool `workstation_exec` mà không chỉ định workstation, gateway tra qua bảng link này để chọn.

## Activity audit

Mỗi lần gọi `workstation_exec` ghi một row vào `workstation_activity` (migration `000064`). Bảng append-only và được prune hằng đêm qua `Prune(before)` trên store interface.

| Field | Ghi chú |
|-------|---------|
| `action` | `"exec"` hoặc `"deny"` |
| `cmdHash` | SHA-256 của command đầy đủ (cho forensics) |
| `cmdPreview` | 200 ký tự đầu, đã redact secret |
| `exitCode`, `durationMs` | Có cho row `exec`; null cho row `deny` |
| `denyReason` | Điền cho row `deny` (vd. `"binary 'curl' not allowed"`) |

Đọc log theo trang từ mới nhất:

```bash
curl "https://gw.example.com/v1/workstations/<id>/activity?limit=50" \
  -H "Authorization: Bearer <admin-token>"
```

Response gồm `activity` (array) và `nextCursor` (truyền lại ở `?cursor=...` để page tiếp).

## Dùng `workstation_exec`

Khi đã link workstation và allowlist có binary cần dùng, agent có thể gọi tool trực tiếp. Tool stream stdout/stderr theo event-bus chunks (`execChunkSize` 64 KiB), áp giới hạn độ dài command (`4 KiB`), bytes argument (`1 KiB`), số env (`50`) và độ dài giá trị env (`256` bytes), và trả về exit code kèm 2 KiB cuối của mỗi stream.

Mỗi call build lại env từ `defaultEnv` trên workstation cộng với override truyền từ tool. Các env key trong [`env_denylist`](/cli-credentials) (ví dụ `LD_PRELOAD`, AWS root creds) bị strip trước khi tạo SSH session.

## Bảo mật

- **Encrypted at rest.** `metadata` và `defaultEnv` được lưu AES-256-GCM. Cùng env var `GOCLAW_ENCRYPTION_KEY` mà webhook dùng cũng mã hoá credential workstation.
- **Response đã sanitize.** Mọi response API dùng `SanitizedWorkstation` — private key, password, hay raw `defaultEnv` không bao giờ ra khỏi gateway.
- **Tenant isolation.** Mọi query store đều tenant-scoped; handler còn re-check ownership qua `GetByID` trước khi thao tác permission và activity.
- **Host-key TOFU.** Workstation có `knownHostsFingerprint` rỗng sẽ chấp nhận host key lần đầu và pin lại cho các lần sau. Hãy điền sẵn fingerprint cho target production.
- **Env denylist.** Các env key cấm (loader hooks, credential ambient cloud) bị strip trước khi exec — xem [CLI Credentials](/cli-credentials) để biết danh sách đầy đủ.
- **Default-deny allowlist.** Chỉ những binary đã seed mới chạy được cho tới khi admin mở rộng list. Không có shortcut `*`.

## Workflow phổ biến

**Gắn host build remote vào agent.**

```bash
# 1. Tạo workstation
curl -X POST .../v1/workstations -d @ssh-build-host.json

# 2. Mở rộng allowlist cho các binary build cần
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"make"}'
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"npm"}'

# 3. Link agent (qua WebSocket) với isDefault=true
# 4. Yêu cầu agent chạy `make build`; tool stream output về live.
```

**Audit xem agent đã chạy gì trong đêm.**

```bash
curl ".../v1/workstations/<id>/activity?limit=200" \
  -H "Authorization: Bearer <admin-token>"
```

## Troubleshooting

| Triệu chứng | Nguyên nhân | Cách khắc phục |
|-------------|-------------|----------------|
| `501 not implemented` từ `/test` | Test connection còn là stub | Validate bằng một call `echo` exec nhỏ |
| `invalid slug: workstationKey` | Key có chữ hoa, dấu gạch dưới, hoặc dài >100 | Dùng kebab-case ASCII, ví dụ `build-vm-west` |
| `invalid metadata shape: ssh: privateKey or password is required` | Credential rỗng | Cung cấp inline PEM hoặc password |
| Row `deny` với `binary 'curl' not allowed` | Allowlist chưa có binary | Thêm pattern qua `POST /v1/workstations/{id}/permissions` |
| `404 workstation not found` khi gọi cross-tenant | Workstation thuộc tenant khác | Dùng token đúng tenant |
| `ssh: health check dial` lỗi | Host không reach được, sai port, hoặc fingerprint sai | Kiểm tra network và `knownHostsFingerprint` |

## What's Next

- [Tools Overview](/tools-overview) — `workstation_exec` nằm ở đâu trong các tool built-in
- [CLI Credentials](/cli-credentials) — env denylist, inject secret
- [REST API → Workstations](/rest-api)
- [WebSocket Protocol → workstations.*](/websocket-protocol)
- [Database Schema](/database-schema) — `workstations`, `workstation_permissions`, `workstation_activity`

<!-- goclaw-source: 392f0fda | cập nhật: 2026-05-21 -->
