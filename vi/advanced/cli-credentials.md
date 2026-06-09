> Bản dịch từ [English version](/cli-credentials)

# CLI Credentials

> Lưu trữ và quản lý bộ thông tin xác thực có tên cho thực thi lệnh shell, với kiểm soát truy cập per-agent qua grants.

## Tổng quan

CLI Credentials cho phép định nghĩa bộ thông tin xác thực có tên (API key, token, connection string) mà agent có thể tham chiếu khi chạy lệnh shell qua tool `exec` — mà không lộ secret trong system prompt hay lịch sử hội thoại.

Mỗi credential được lưu dưới dạng **secure CLI binary** — cấu hình có tên ánh xạ một binary (ví dụ `gh`, `gcloud`, `aws`) với bộ biến môi trường mã hóa AES-256-GCM. Khi agent chạy binary đó, GoClaw giải mã env var và inject vào child process lúc thực thi.

## Binary Global và Per-Agent

Từ migration 036, mô hình truy cập dùng **grants system** thay vì gán agent per-binary:

- **Binary global** (`is_global = true`): tất cả agent đều dùng được trừ khi grant override cài đặt
- **Binary hạn chế** (`is_global = false`): chỉ agent có grant tường minh mới truy cập được

Cách này tách biệt định nghĩa credential khỏi kiểm soát truy cập, cho phép định nghĩa binary một lần và cấp cho agent cụ thể với override per-agent tùy chọn.

```
secure_cli_binaries (credential + mặc định)
        │
        ├── is_global = true  → tất cả agent đều dùng được
        └── is_global = false → chỉ agent có grant
                    │
                    └── secure_cli_agent_grants (override per-agent)
                            ├── deny_args (NULL = dùng mặc định binary)
                            ├── deny_verbose (NULL = dùng mặc định binary)
                            ├── timeout_seconds (NULL = dùng mặc định binary)
                            ├── tips (NULL = dùng mặc định binary)
                            ├── enabled
                            └── encrypted_env (BYTEA, AES-256-GCM — override env per-grant tùy chọn)
```

## Agent Grants

Bảng `secure_cli_agent_grants` liên kết binary với agent cụ thể và tùy chọn override các cài đặt mặc định của binary. Trường `NULL` sẽ kế thừa giá trị mặc định của binary.

| Trường | Hành vi |
|--------|---------|
| `deny_args` | Override pattern argument bị cấm cho agent này |
| `deny_verbose` | Override loại bỏ verbose flag cho agent này |
| `timeout_seconds` | Override timeout process cho agent này |
| `tips` | Override gợi ý inject vào TOOLS.md cho agent này |
| `enabled` | Vô hiệu hóa grant mà không xóa |
| `encrypted_env` | Override env var per-grant tùy chọn (mã hóa AES-256-GCM khi lưu trữ) |

Khi agent chạy binary, GoClaw áp dụng cài đặt theo thứ tự:
1. Mặc định của binary
2. Override từ grant (trường khác null sẽ thay thế mặc định binary)
3. `encrypted_env` per-grant được giải mã và merge vào môi trường child process lúc thực thi (override env var ở cấp binary cho agent này)

## REST API

Tất cả endpoint grant được lồng dưới resource binary và yêu cầu role `admin`.

### Liệt kê grant của binary

```
GET /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "grants": [
    {
      "id": "019...",
      "binary_id": "019...",
      "agent_id": "019...",
      "deny_args": null,
      "timeout_seconds": 60,
      "enabled": true,
      "env_keys": [],
      "env_set": false,
      "created_at": "2026-04-05T00:00:00Z",
      "updated_at": "2026-04-05T00:00:00Z"
    }
  ]
}
```

### Tạo grant

```
POST /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "agent_id": "019...",
  "timeout_seconds": 120,
  "tips": "Dùng --output json cho tất cả lệnh",
  "env_vars": {
    "MY_API_KEY": "secret-value"
  }
}
```

Các trường bỏ qua (`deny_args`, `deny_verbose`, `tips`, `enabled`, `env_vars`) mặc định là `null` / `true`. Giá trị `env_vars` được mã hóa khi lưu trữ; chỉ tên key được trả về trong các lần list/get tiếp theo.

### Lấy thông tin grant

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### Cập nhật grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Chỉ gửi các trường muốn thay đổi. Các trường được phép: `deny_args`, `deny_verbose`, `timeout_seconds`, `tips`, `enabled`, `env_vars`.

### Xóa grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

Xóa grant của binary hạn chế (`is_global = false`) sẽ lập tức thu hồi quyền truy cập binary đó của agent.

### Reveal env var của grant

```
POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal
```

Trả về env var plaintext đã giải mã. Rate-limit 10 lần/phút mỗi user. Xem [Reveal Env Var Đã Giải Mã](#reveal-env-var-đã-giải-mã) để biết chi tiết.

## Override Env Per-Agent

Từ migration `000058`, mỗi hàng `secure_cli_agent_grants` có thể mang cột `encrypted_env` tùy chọn (BYTEA, AES-256-GCM). Điều này cho phép cấp cho một agent bộ biến môi trường khác cho cùng binary — ví dụ: tài khoản AWS khác, API key riêng, hoặc endpoint staging — mà không cần tạo định nghĩa binary riêng biệt.

**Cách hoạt động:**

- Khi tạo/cập nhật grant, gửi `env_vars` (map `string → string` plaintext) trong body request.
- GoClaw kiểm tra key với denylist, sau đó mã hóa và lưu vào `encrypted_env`.
- Giá trị plaintext không bao giờ được lưu trữ hoặc log; tầng store mã hóa trước khi ghi và giải mã khi đọc.
- Các response list và get chỉ trả về `env_keys` (danh sách tên key đã sắp xếp) và `env_set` (boolean). Giá trị không bao giờ được trả về ngoại trừ qua endpoint `env:reveal`.

**Tạo grant với env override:**

```bash
curl -X POST http://localhost:8080/v1/cli-credentials/{id}/agent-grants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "019...",
    "env_vars": {
      "AWS_PROFILE": "staging",
      "AWS_DEFAULT_REGION": "us-west-2"
    }
  }'
```

Response (`201 Created`) bao gồm `env_keys` nhưng không có giá trị:

```json
{
  "id": "019...",
  "binary_id": "019...",
  "agent_id": "019...",
  "env_keys": ["AWS_DEFAULT_REGION", "AWS_PROFILE"],
  "env_set": true,
  "enabled": true,
  "created_at": "2026-05-21T00:00:00Z",
  "updated_at": "2026-05-21T00:00:00Z"
}
```

**Cập nhật env var cho grant hiện có:**

Gửi `env_vars` trong body `PUT`. Ba trạng thái:
- **Không có** — env hiện tại không thay đổi
- **`null`** — xóa env override (xóa `encrypted_env`)
- **`{...}`** — thay thế toàn bộ env map (`{}` rỗng được xử lý như `null`)

## Reveal Env Var Đã Giải Mã

`POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal` trả về env var plaintext đã giải mã của một grant cụ thể. Endpoint dùng POST (không phải GET) để ngăn HTTP caching và đảm bảo CSRF safety.

**Kiểm soát bảo mật:**
- Yêu cầu role `admin` có phạm vi đúng tenant — caller master-scope bị từ chối.
- Rate-limit **10 reveal mỗi phút mỗi user** (burst 3). Trả về `429` khi vượt quá.
- Header response bao gồm `Cache-Control: no-store` để ngăn proxy caching.
- Mọi lần gọi đều được audit: caller ID, tenant ID, grant ID, binary ID, và timestamp được log ở mức INFO.

```bash
curl -X POST http://localhost:8080/v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "env_vars": {
    "AWS_PROFILE": "staging",
    "AWS_DEFAULT_REGION": "us-west-2"
  }
}
```

Trả về `{"env_vars": {}}` khi grant không có env override.

## Env Denylist

Không phải tất cả tên biến môi trường đều được chấp nhận. GoClaw từ chối các key có thể cho phép leo thang đặc quyền, shell injection, TLS bypass, hoặc exfiltration.

**Yêu cầu hình dạng key:** key phải khớp `^[A-Z_][A-Z0-9_]*$` — chỉ chữ hoa, chữ số, gạch dưới. Chữ thường, khoảng trắng, và ký tự đặc biệt (bao gồm function definition kiểu Shellshock) bị từ chối.

**Từ chối chính xác:**

| Key | Lý do |
|-----|-------|
| `PATH`, `HOME`, `USER`, `SHELL`, `PWD` | Định danh shell/user cốt lõi |
| `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT` | Chiếm đoạt dynamic linker |
| `NODE_OPTIONS`, `NODE_PATH` | Code injection Node.js |
| `PYTHONPATH`, `PYTHONHOME`, `PYTHONSTARTUP` | Path/startup injection Python |
| `GIT_SSH_COMMAND`, `GIT_SSH`, `GIT_EXEC_PATH`, `GIT_CONFIG_SYSTEM` | Command injection Git |
| `SSH_AUTH_SOCK` | Chuyển tiếp SSH key |
| `BASH_ENV`, `ENV` | Sourcing shell không tương tác |
| `PROMPT_COMMAND` | Thực thi prompt shell |
| `PERL5LIB`, `RUBYOPT` | Injection thư viện Perl/Ruby |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` | Kênh exfiltration / bypass proxy |
| `SSL_CERT_FILE`, `SSL_CERT_DIR`, `CURL_CA_BUNDLE` | Override TLS CA (MitM) |
| `IFS` | Injection Internal Field Separator shell |

**Từ chối theo prefix:** bất kỳ key nào bắt đầu bằng `DYLD_`, `GOCLAW_`, `LD_`, hoặc `NPM_CONFIG_` đều bị từ chối.

**Giới hạn:** tối đa 50 key mỗi grant; tối đa 4 096 byte mỗi giá trị; giá trị không được chứa byte NUL hoặc ký tự xuống dòng.

Response `400` khi tạo/cập nhật bao gồm tên key bị từ chối trong `rejected_keys`:

```json
{
  "error": "env keys denied: LD_PRELOAD, PATH",
  "rejected_keys": "LD_PRELOAD,PATH"
}
```

## Typed Credential Adapters

Các phần trên mô tả **mô hình paste env cũ** — bạn paste các biến môi trường tùy ý và GoClaw inject chúng nguyên văn vào tiến trình con. Cách này hoạt động với các tool đọc auth từ một env var ổn định (`GH_TOKEN`, `AWS_ACCESS_KEY_ID`, …), nhưng thất bại với các tool như `git` vốn đọc credential từ file config, credential helper, hoặc URL theo từng remote — paste một PAT vào `GIT_TOKEN` chẳng có tác dụng gì.

**Typed credential adapters** giải quyết điều này. Thay vì paste env var thô, bạn chọn một *loại* credential, và GoClaw định tuyến credential qua một adapter phía server biết cách inject nó đúng và an toàn cho từng tool cụ thể.

### Các loại credential

Mỗi dòng user credential mang một `credential_type` (migration `000073`):

| `credential_type` | Ý nghĩa |
|-------------------|---------|
| `NULL` / `env` | Passthrough env cũ — env var được inject nguyên văn, đúng như trước. Không có host scoping. |
| `pat` | Personal Access Token, cho git remote HTTPS (GitHub/GitLab/Gitea). Yêu cầu `host_scope`. |
| `ssh_key` | SSH private key (PEM), cho git qua SSH. Yêu cầu `host_scope`. |

Các dòng `NULL`/`env` không bao giờ bị migrate — credential cũ vẫn hoạt động nguyên vẹn. Typed adapter là tùy chọn opt-in theo từng credential.

### User credential và binary/system credential

Typed adapter thao tác trên **user credential**, không phải env default cấp binary:

- **Binary/system credential** — định nghĩa binary + env var default của nó (và override từ agent grant) đã mô tả ở trên. Dùng chung cho mọi grant của binary.
- **User credential** — secret typed theo từng user lưu trong `secure_cli_user_credentials`, scope tới một hostname duy nhất.

Quản lý user credential trong dashboard tại **Settings → CLI Credentials → User Credentials**. Nhấn **Add**, chọn user, chọn loại credential (`Personal Access Token` hoặc `SSH Private Key`), nhập **Host Scope**, và paste secret. Secret lưu trữ được mã hóa AES-256-GCM và không bao giờ đọc lại được — sửa dòng đó sẽ hiển thị placeholder `••••••••`; để trống ô secret sẽ giữ giá trị đã lưu, gõ giá trị mới sẽ thay thế nó.

### Adapter git

Adapter `git` là typed adapter đầu tiên được ship. Nó chỉ inject credential **cho** các subcommand mạng:

```
clone   fetch   pull   push   submodule
```

Bất kỳ subcommand nào khác (`status`, `log`, `diff`, `commit`, `branch`, …) là thao tác cục bộ và chạy **không credential** — không inject, không dòng audit-log.

**Luồng PAT.** Token được inject qua biến môi trường, không bao giờ trên `argv`:

```
GIT_CONFIG_COUNT=1
GIT_CONFIG_KEY_0=http.https://<host>/.extraheader
GIT_CONFIG_VALUE_0=Authorization: Bearer <token>
```

Vì token nằm trong một env value (không phải flag dòng lệnh), nó không bao giờ xuất hiện trong `ps`, `/proc/<pid>/cmdline`, hay lịch sử shell. Các env var được inject chỉ giới hạn trong tiến trình `git` được spawn — môi trường của chính GoClaw và các lệnh exec khác không bao giờ thấy chúng.

**Luồng SSH.** Key PEM được ghi vào một tmpfile mode `0600` trong thư mục temp hệ thống (prefix `goclaw-gitkey-*`), và `GIT_SSH_COMMAND` được đặt thành:

```
ssh -i <tmpfile> -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new
```

`StrictHostKeyChecking=accept-new` chấp nhận host key chưa biết ở **lần kết nối đầu (TOFU)**. Pre-seed `~/.ssh/known_hosts` để đóng cửa sổ này (xem [Security Hardening](/deploy-security)). Tmpfile bị xóa sau khi exec qua deferred cleanup. **SSH key có passphrase bị từ chối lúc lưu** — hãy export lại key không passphrase, hoặc dùng deploy key riêng.

### Host scope

Cả `pat` và `ssh_key` đều yêu cầu **`host_scope`** — chính xác `host` hoặc `host:port` dạng ASCII mà credential hợp lệ. Nó được chuẩn hóa về ASCII chữ thường (qua `idna.ToASCII`) và khớp **chính xác**. v1 **không có wildcard**, và port là một phần của key:

| `host_scope` đã lưu | `github.com` | `api.github.com` | `github.com:8443` |
|---------------------|:---:|:---:|:---:|
| `github.com` | ✓ | ✗ | ✗ |

Nếu bạn chạy server self-hosted trên port mặc định của scheme (443 HTTPS, 22 SSH), bỏ port; nếu trên port không mặc định, thêm port vào (vd `gitea.internal:8443`). Khi không có credential lưu trữ nào khớp host của remote đã resolve, adapter rơi xuống đường không credential và remote sẽ từ chối thao tác nếu nó yêu cầu auth.

### Khả năng hiển thị env: nhạy cảm và không nhạy cảm

Các entry env lưu trữ giờ mang một `kind`. Khi dashboard hoặc admin API đọc lại một credential, response che giá trị theo kind:

| `kind` | Trong response API |
|--------|--------------------|
| `sensitive` (mặc định; map string cũ decode vào đây) | `value: null`, `masked: true` |
| `value` (không nhạy cảm rõ ràng, vd region hoặc tên profile) | trả về giá trị thuần, `masked: false` |

Điều này cho phép operator thấy ngữ cảnh không bí mật (vd `AWS_DEFAULT_REGION=us-west-2`) trong UI trong khi secret vẫn bị che. Secret vẫn không bao giờ được trả về trừ qua endpoint `env:reveal` chuyên dụng.

### Migrate từ credential env cũ

Không có migration bắt buộc. Một dòng có `credential_type IS NULL` hoặc `= 'env'` vẫn phát ra env var của nó đúng như trước. Để nâng cấp một git credential, mở dialog user-credential, chọn **Personal Access Token** hoặc **SSH Private Key**, nhập host scope, paste secret, và lưu — dòng cũ được thay thế atomically.

### Giới hạn v1

- **Không có wildcard host** — một credential cho mỗi `host[:port]` chính xác; `*.github.com` không được hỗ trợ.
- **Không có SSH key có passphrase** — bị từ chối lúc validation.
- **Không propagate vào sandbox** — adapter mutate môi trường của tiến trình con đã fork, không tương thích với đường sandbox Docker bind-mount. Credentialed exec chỉ chạy trên host trong v1.
- **Không pin host key** — SSH dùng TOFU (`accept-new`); pre-seed `known_hosts`.

### Google Workspace CLI (gws)

GoClaw ship một preset `gws` cho Google Workspace CLI (`@googleworkspace/cli`).

**Tính khả dụng.** Binary `gws` chỉ được cài sẵn **trong Docker image `full` đã publish**. Trên image `latest`/`base`, cài `@googleworkspace/cli` từ trang Packages (yêu cầu build có Node, `ENABLE_NODE=true`; Node.js 18+).

**Credential.** Tạo một SecureCLI credential từ preset `gws` và cung cấp ít nhất một nguồn auth:

| Env var | Mục đích |
|---------|----------|
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` | Đường dẫn tới credential `gws` đã export hoặc file JSON OAuth credentials |
| `GOOGLE_WORKSPACE_CLI_TOKEN` | Google OAuth access token lấy sẵn (tùy chọn) |
| `GOOGLE_WORKSPACE_CLI_CLIENT_ID` | OAuth client ID cho luồng auth thủ công (tùy chọn) |
| `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET` | OAuth client secret cho luồng auth thủ công (tùy chọn) |

**Lệnh bị chặn.** Preset chặn các luồng auth tương tác và export credential:

```
gws auth setup    gws auth login    gws auth export    gws auth logout
```

Chạy các luồng đó ngoài agent execution, rồi lưu token hoặc đường dẫn credentials-file kết quả vào SecureCLI.

**Cách dùng.** Mặc định thiên về đọc. Dùng `--params` cho query parameter, `--json` cho request body, và `--page-all` cho đọc phân trang:

```sh
gws drive files list --params '{"pageSize": 10}'
gws gmail users messages list --params '{"userId": "me", "maxResults": 10}'
gws calendar events list --params '{"calendarId": "primary", "maxResults": 10}'
```

> **Cảnh báo ghi.** Lệnh ghi có thể sửa đổi dữ liệu Workspace. Giữ preset mặc định thiên về đọc và tạo một SecureCLI config riêng, đã review cho mọi workflow ghi đã được duyệt.

## Pattern phổ biến

### Chỉ cho phép một agent dùng CLI tool nhạy cảm

1. Tạo binary với `is_global = false`
2. Tạo grant cho agent mục tiêu

### Cho tất cả agent dùng nhưng hạn chế args với một agent

1. Tạo binary với `is_global = true`
2. Tạo grant cho agent bị hạn chế với `deny_args` bổ sung pattern bị chặn

### Tạm thời vô hiệu hóa quyền truy cập của agent

Cập nhật grant: `{"enabled": false}`. Binary vẫn dùng được với các agent khác.

## Sự cố thường gặp

| Vấn đề | Giải pháp |
|--------|-----------|
| Agent không chạy được binary | Kiểm tra `is_global` của binary — nếu `false`, agent cần có grant tường minh |
| Override của grant không được áp dụng | Kiểm tra grant `enabled = true` và các trường override khác null |
| `403` ở endpoint grant | Cần role admin — kiểm tra scope của API key |

## Tiếp theo

- [Database Schema → secure_cli_agent_grants](/database-schema)
- [Exec Approval](/exec-approval)
- [API Keys & RBAC](/api-keys-rbac)
- [Security Hardening](/deploy-security)

<!-- goclaw-source: d85bf171 | cập nhật: 2026-06-07 -->
