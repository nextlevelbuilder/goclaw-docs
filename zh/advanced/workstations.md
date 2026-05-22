 > 翻译自 [English version](/workstations)

# Workstations

> 通过 SSH 或 Docker 在远程机器上运行 agent 命令,每个 workstation 有独立的 allowlist 和完整审计日志。

## 概述

**Workstation** 是注册到 GoClaw 中的远程执行目标。当 agent 调用内置工具 `workstation_exec` 时,gateway 会向已链接的 workstation 建立会话,执行命令,将 stdout/stderr 作为 event-bus chunks 流式返回,并在活动日志中写入一行记录。

Workstations 是 tenant-scoped 的,且仅在 Standard edition 中可用。GoClaw 支持两种 backend:

| Backend | `backendType` | Transport | 说明 |
|---------|---------------|-----------|------|
| SSH | `ssh` | OpenSSH 客户端 + 会话池 | 内联 PEM 私钥或密码。TOFU host-key 指纹 |
| Docker | `docker` | Docker engine API | 镜像 + 容器名;适合临时沙盒目标 |

连接池在每个 workstation 内共享,因此重复的 `workstation_exec` 调用会复用已经热起来的 SSH 客户端,而不是每次都重新做 TCP+TLS 握手。

## 生命周期

1. **创建** workstation — `POST /v1/workstations`,提供 `workstationKey`、`name`、`backendType` 和 `metadata`。
2. **测试** 连接 — `POST /v1/workstations/{id}/test`。SSH backend 会拨号、运行 `echo ok`,并在 5 秒内拆除连接。
3. **种子 allowlist** — 创建时自动完成。参见 [权限模型](#权限模型)。
4. **链接 agent** — 通过 WebSocket:`workstations.linkAgent`,参数为 `{agentId, workstationId, isDefault}`。
5. **使用** — agent 调用 `workstation_exec` 工具。每次调用都经过权限检查,并记录到 `workstation_activity`。

`workstationKey` 是 API 调用中使用的稳定 slug;正则为 `^[a-z0-9][a-z0-9-]{0,99}$`。

## Endpoints

所有 HTTP endpoint 都需要 tenant-admin gateway token(`Authorization: Bearer <admin-token>`)。

| Method | Path | 用途 |
|--------|------|------|
| `GET` | `/v1/workstations` | 列出活动中的 workstation |
| `POST` | `/v1/workstations` | 创建 workstation |
| `GET` | `/v1/workstations/{id}` | 获取详情(sanitized 视图) |
| `PUT` | `/v1/workstations/{id}` | 局部更新 |
| `DELETE` | `/v1/workstations/{id}` | 硬删除(tenant-scoped) |
| `POST` | `/v1/workstations/{id}/test` | Backend 健康检查 |
| `GET` | `/v1/workstations/{id}/permissions` | 列出 allowlist 模式 |
| `POST` | `/v1/workstations/{id}/permissions` | 添加模式(默认启用) |
| `DELETE` | `/v1/workstations/{id}/permissions/{permId}` | 删除模式 |
| `PUT` | `/v1/workstations/{id}/permissions/{permId}/toggle` | 启用/禁用模式 |
| `GET` | `/v1/workstations/{id}/activity` | 分页审计日志(`limit`、`cursor`) |

同样的操作也以 WebSocket RPC 形式提供,位于 `workstations.*` 命名空间下(见 [WebSocket Protocol](/websocket-protocol))。`workstations.linkAgent` / `workstations.unlinkAgent` **只能** 通过 WebSocket 调用。

### 创建 workstation

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

Response(201 Created)返回 **sanitized 视图** —— 私钥和密码绝不会回显。只包含一份 metadata summary(`host`、`port`、`user`、`hasKey`):

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

| 字段 | 必填 | 说明 |
|------|------|------|
| `host` | 是 | DNS 名或 IP |
| `user` | 是 | 远程机器上的用户 |
| `port` | 否 | 默认 `22`;范围 1–65535 |
| `privateKey` | `privateKey`/`password` 二选一 | PEM;AES-256-GCM 加密存储 |
| `password` | `privateKey`/`password` 二选一 | 优先使用密钥认证 |
| `knownHostsFingerprint` | 推荐 | host key 的 `SHA256:...`。留空 → 首次 TOFU |
| `connectTimeoutSec` | 否 | 覆盖默认 10s 的拨号超时 |

### Docker metadata

| 字段 | 必填 | 说明 |
|------|------|------|
| `image` | 是 | 容器镜像引用 |
| `host` | `host`/`socketPath` 二选一 | 远程 Docker daemon URL |
| `socketPath` | `host`/`socketPath` 二选一 | 本地 UNIX socket |
| `network` | 否 | 要 attach 的 Docker network |

## 权限模型

Workstation 按照 **默认拒绝(default-deny)** 的 allowlist 工作,匹配 `argv[0]` —— 也就是二进制文件名。不支持单独的 `*` 通配。

`workstation_permissions` 表(migration `000063`)在创建 workstation 时自动 seed。默认种子是一组只读或低风险的二进制:

```
echo, pwd, ls, cat, git, whoami, hostname, date, uname, claude
```

Shell(`bash`、`sh`、`zsh`)被故意排除 —— 加入 shell 会摧毁整个模型,因为它允许通过参数传入任意命令。

每条模式要么是绝对二进制名(`git`),要么是 prefix-glob(`python*`)。扩展 allowlist:

```bash
curl -X POST https://gw.example.com/v1/workstations/<id>/permissions \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"pattern": "make"}'
```

不删除而临时禁用一条模式:

```bash
curl -X PUT https://gw.example.com/v1/workstations/<id>/permissions/<permId>/toggle \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"enabled": false}'
```

禁用的模式仍保留在表中,但运行时检查会忽略。

## 链接 agent

使用 WebSocket RPC `workstations.linkAgent`:

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

`agent_workstation_links` 表对每个 agent 只允许一个默认 workstation —— 把 `isDefault=true` 会清掉旧的默认值。要解除链接,使用相同的 `agentId` 和 `workstationId` 调用 `workstations.unlinkAgent`。

当 agent 调用 `workstation_exec` 工具而未指定 workstation 时,gateway 通过该链接表查找。

## 活动审计

每次调用 `workstation_exec` 都会在 `workstation_activity`(migration `000064`)中写入一行。表为 append-only,通过 store interface 的 `Prune(before)` 每晚清理。

| 字段 | 说明 |
|------|------|
| `action` | `"exec"` 或 `"deny"` |
| `cmdHash` | 完整命令的 SHA-256(用于取证) |
| `cmdPreview` | 前 200 个字符,已脱敏密钥 |
| `exitCode`、`durationMs` | `exec` 行有;`deny` 行为 null |
| `denyReason` | `deny` 行填写(例如 `"binary 'curl' not allowed"`) |

按时间倒序分页读取日志:

```bash
curl "https://gw.example.com/v1/workstations/<id>/activity?limit=50" \
  -H "Authorization: Bearer <admin-token>"
```

Response 包含 `activity`(数组)和 `nextCursor`(下一页通过 `?cursor=...` 传回)。

## 使用 `workstation_exec`

链接好 workstation 并把所需二进制加入 allowlist 后,agent 即可直接调用该工具。工具按 event-bus chunks(`execChunkSize` 64 KiB)流式回传 stdout/stderr,并强制命令长度上限(`4 KiB`)、参数字节数(`1 KiB`)、env 数量(`50`)和 env 值长度(`256` bytes),最后返回 exit code 以及每个流的尾部 2 KiB。

每次调用都会根据 workstation 上的 `defaultEnv` 加上工具传入的 override 重新构建 env。属于 [`env_denylist`](/cli-credentials)(例如 `LD_PRELOAD`、AWS root credentials)的 env key 会在创建 SSH 会话之前被剥离。

## 安全性

- **静态加密。** `metadata` 和 `defaultEnv` 以 AES-256-GCM 加密。Workstation credentials 与 webhook 共享同一个 `GOCLAW_ENCRYPTION_KEY` 环境变量。
- **响应已脱敏。** 所有 API 响应都使用 `SanitizedWorkstation` —— 私钥、密码或原始 `defaultEnv` 永远不会离开 gateway。
- **租户隔离。** 所有 store 查询都是 tenant-scoped;handler 在操作 permission 和 activity 之前还会通过 `GetByID` 再次校验所有权。
- **Host-key TOFU。** `knownHostsFingerprint` 留空的 workstation 会在首次连接时接受 host key,并将其固定下来。生产目标请预填指纹。
- **Env denylist。** 被禁止的 env key(loader hooks、环境云 credential)在执行前被剥离 —— 完整列表见 [CLI Credentials](/cli-credentials)。
- **默认拒绝 allowlist。** 在管理员扩展之前,只有 seed 中的二进制可以运行。没有 `*` 捷径。

## 常见工作流

**把远程 build 主机挂到 agent 上。**

```bash
# 1. 创建 workstation
curl -X POST .../v1/workstations -d @ssh-build-host.json

# 2. 为所需的 build 二进制扩展 allowlist
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"make"}'
curl -X POST .../v1/workstations/<id>/permissions -d '{"pattern":"npm"}'

# 3. 通过 WebSocket 以 isDefault=true 链接 agent
# 4. 让 agent 运行 `make build`;工具会实时流回输出。
```

**审计夜间 agent 跑了什么。**

```bash
curl ".../v1/workstations/<id>/activity?limit=200" \
  -H "Authorization: Bearer <admin-token>"
```

## 故障排查

| 现象 | 原因 | 解决办法 |
|------|------|---------|
| `/test` 返回 `501 not implemented` | Test connection 还是 stub | 用一次小的 `echo` exec 调用来验证 |
| `invalid slug: workstationKey` | Key 含大写字母、下划线,或长度 >100 | 使用 kebab-case ASCII,例如 `build-vm-west` |
| `invalid metadata shape: ssh: privateKey or password is required` | 凭据为空 | 提供内联 PEM 或密码 |
| `binary 'curl' not allowed` 的 `deny` 行 | 二进制不在 allowlist 中 | 通过 `POST /v1/workstations/{id}/permissions` 添加模式 |
| 跨租户调用时 `404 workstation not found` | Workstation 属于其他租户 | 使用正确租户的 token |
| `ssh: health check dial` 失败 | 主机不可达、端口错误,或指纹不匹配 | 检查网络和 `knownHostsFingerprint` |

## 下一步

- [Tools Overview](/tools-overview) —— `workstation_exec` 在内置工具中的定位
- [CLI Credentials](/cli-credentials) —— env denylist、密钥注入
- [REST API → Workstations](/rest-api)
- [WebSocket Protocol → workstations.*](/websocket-protocol)
- [Database Schema](/database-schema) —— `workstations`、`workstation_permissions`、`workstation_activity`

<!-- goclaw-source: 392f0fda | 更新: 2026-05-21 -->
