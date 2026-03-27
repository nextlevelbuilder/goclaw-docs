> 翻译自 [English version](#api-keys-rbac)

# API Keys 与 RBAC

> 为多用户和程序化访问部署管理带角色权限控制的 API key。

## 概述

GoClaw 使用 **5 层权限系统**。API key 和角色位于第 1 层 — 网关认证层。请求到达时，GoClaw 检查 `Authorization: Bearer <token>` 请求头，将 token 解析为角色，并对调用的方法执行该角色的权限检查。

存在三种角色：

| 角色 | 级别 | 描述 |
|------|-------|-------------|
| `admin` | 3 | 完全访问 — 可管理 API key、agent、配置、团队及以下所有内容 |
| `operator` | 2 | 读写 — 可聊天、管理会话、cron、审批、配对 |
| `viewer` | 1 | 只读 — 可列出/获取资源但不能修改 |

角色**不直接设置在 API key 上**。你为 key 分配 **scope**，GoClaw 在运行时从这些 scope 推导出有效角色。

---

## Scope

| Scope | 授予的权限 |
|-------|--------|
| `operator.admin` | `admin` 角色 — 完全访问，包括 key 管理和配置 |
| `operator.write` | `operator` 角色 — 写操作（聊天、会话、cron） |
| `operator.approvals` | `operator` 角色 — exec 审批的接受/拒绝 |
| `operator.pairing` | `operator` 角色 — 设备配对操作 |
| `operator.read` | `viewer` 角色 — 只读的列出和获取 |

**角色推导（最高权限优先）**，通过 `permissions/policy.go` 中的 `RoleFromScopes()`：

```
存在 admin scope              → RoleAdmin
write / approvals / pairing  → RoleOperator
仅 read scope                → RoleViewer
默认（无 scope）              → RoleViewer
```

一个 key 可持有多个 scope — 最高权限 scope 生效。

---

## 方法权限

| 方法 | 所需角色 |
|---------|---------------|
| `api_keys.list`、`api_keys.create`、`api_keys.revoke` | admin |
| `config.apply`、`config.patch` | admin |
| `agents.create`、`agents.update`、`agents.delete` | admin |
| `channels.toggle` | admin |
| `teams.list`、`teams.create`、`teams.delete` | admin |
| `pairing.approve`、`pairing.revoke` | admin |
| `chat.send`、`chat.abort` | operator |
| `sessions.delete`、`sessions.reset`、`sessions.patch` | operator |
| `cron.create`、`cron.update`、`cron.delete`、`cron.toggle` | operator |
| `approvals.*`、`exec.approval.*` | operator |
| `pairing.*`、`device.pair.*` | operator |
| `send` | operator |
| 其他所有（list、get、read） | viewer |

---

## 向后兼容性

如果 `GOCLAW_GATEWAY_TOKEN` 为空（未配置网关 token），所有请求 — 包括未认证的 — 自动获得 `RoleOperator` 访问权限。这让自托管设置无需严格认证即可工作。一旦设置了 token，所有请求必须提供有效凭据，否则收到 `401 Unauthorized`。

---

## 认证

所有 API 请求使用 HTTP Bearer token 认证：

```
Authorization: Bearer <your-api-key>
```

网关也接受 `config.json` 中 `auth.token` 的静态 token。该 token 作为超级管理员，无 scope 限制。API key 是授予外部系统有范围、可撤销访问权限的推荐方式。

---

## Key 格式

API key 格式为 `goclaw_` + 32 个小写十六进制字符（16 随机字节，128 位熵）：

```
goclaw_a1b2c3d4e5f6789012345678901234567890abcdef
```

列表响应中显示的**展示前缀**为 `goclaw_` + 随机部分的前 8 个十六进制字符（如 `goclaw_a1b2c3d4`），便于在 UI 中识别 key 而无需存储密钥。

**一次性显示模式：** 原始 `key` 字段仅在创建响应中返回。后续所有 list/get 调用仅返回 `prefix`。创建后立即复制 key — 之后无法再次获取。

---

## 创建 API Key

**需要：admin 角色**

```bash
curl -X POST http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-pipeline",
    "scopes": ["operator.read", "operator.write"],
    "expires_in": 2592000
  }'
```

| 字段 | 必填 | 描述 |
|-------|----------|-------------|
| `name` | 是 | 显示名称，最多 100 个字符 |
| `scopes` | 是 | 一个或多个有效 scope 字符串 |
| `expires_in` | 否 | 有效期（秒）；省略或设为 `null` 表示永不过期 |

响应（HTTP 201）：

```json
{
  "id": "01944f3a-1234-7abc-8def-000000000001",
  "name": "ci-pipeline",
  "prefix": "goclaw_a1b2c3d4",
  "key": "goclaw_a1b2c3d4e5f6789012345678901234567890abcdef",
  "scopes": ["operator.read", "operator.write"],
  "expires_at": "2026-04-15T00:00:00Z",
  "created_at": "2026-03-16T10:00:00Z"
}
```

**`key` 字段仅显示一次。** 立即保存 — 之后无法再次获取。数据库中只保存 SHA-256 哈希。

---

## 列出 API Key

**需要：admin 角色**

```bash
curl http://localhost:8080/v1/api-keys \
  -H "Authorization: Bearer <admin-token>"
```

响应（HTTP 200）：

```json
[
  {
    "id": "01944f3a-1234-7abc-8def-000000000001",
    "name": "ci-pipeline",
    "prefix": "goclaw_a1b2c3d4",
    "scopes": ["operator.read", "operator.write"],
    "expires_at": "2026-04-15T00:00:00Z",
    "last_used_at": "2026-03-16T09:55:00Z",
    "revoked": false,
    "created_at": "2026-03-16T10:00:00Z"
  }
]
```

`prefix` 字段（前 8 个字符）让你无需存储密钥即可识别 key。创建后原始 key 不再返回。

---

## 撤销 API Key

**需要：admin 角色**

```bash
curl -X POST http://localhost:8080/v1/api-keys/<id>/revoke \
  -H "Authorization: Bearer <admin-token>"
```

响应（HTTP 200）：

```json
{ "status": "revoked" }
```

撤销立即生效 — key 在数据库中标记为已撤销，进程内缓存通过 pubsub 清除。

---

## WebSocket RPC 方法

API key 管理也可通过 WebSocket 连接使用。三种方法均需要 `operator.admin` scope。

### 列出 key

```json
{ "type": "req", "id": "1", "method": "api_keys.list" }
```

### 创建 key

```json
{
  "type": "req",
  "id": "2",
  "method": "api_keys.create",
  "params": {
    "name": "dashboard-readonly",
    "scopes": ["operator.read"]
  }
}
```

### 撤销 key

```json
{
  "type": "req",
  "id": "3",
  "method": "api_keys.revoke",
  "params": { "id": "01944f3a-1234-7abc-8def-000000000001" }
}
```

---

## 安全细节

### SHA-256 哈希

原始 API key 从不存储。创建时，GoClaw 生成随机 key，仅存储其 `SHA-256` 十六进制摘要，并一次性返回原始值。每个入站请求在数据库查找前先进行哈希处理。

### 带 TTL 的进程内缓存

首次查找后，解析的 key 数据和角色在内存中缓存 **5 分钟**。这消除了繁忙端点上重复的数据库往返。缓存以哈希为键 — 而非原始 token。

### 负面缓存

如果提供了未知 token（如拼写错误或已被驱逐的已撤销 key），GoClaw 将未命中缓存为**负面条目**，避免频繁访问数据库。负面缓存上限为 **10,000 条**，防止 token 喷射攻击导致内存耗尽。

### 缓存失效

key 创建或撤销时，`cache.invalidate` 事件在内部消息总线上广播。所有活跃的 HTTP handler 立即清除缓存 — 撤销后不会有过期条目存活。

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|---------|-------|-----|
| key 管理端点返回 `401 Unauthorized` | 调用者不是 admin 角色 | 使用网关 token 或带 `operator.admin` scope 的 key |
| `400 invalid scope: X` | scope 字符串不被识别 | 仅使用：`operator.admin`、`operator.read`、`operator.write`、`operator.approvals`、`operator.pairing` |
| `400 name is required` | `name` 字段缺失或为空 | 在请求体中添加 `"name": "..."` |
| `400 scopes is required` | `scopes` 数组为空或缺失 | 至少包含一个 scope |
| 撤销后 key 仍显示 `revoked: false` | 缓存 TTL（5 分钟）未过期 | 等待最多 5 分钟或重启网关 |
| 创建后原始 key 丢失 | 原始 key 仅返回一次，这是设计行为 | 撤销该 key 并创建新 key |
| 撤销时 `404` | key ID 错误或已撤销 | 从列表端点核对 UUID |

---

## 下一步

- [身份认证与 OAuth](#authentication) — 网关 token 和 OAuth 流程
- [Exec 审批](#exec-approval) — 需要 `operator.approvals` scope
- [安全加固](#deploy-security) — 完整的 5 层权限概览
- [CLI 凭据](./cli-credentials.md) — SecureCLI：向 CLI 工具注入凭据，不向 agent 暴露密钥

<!-- goclaw-source: 57754a5 | 更新: 2026-03-23 -->
