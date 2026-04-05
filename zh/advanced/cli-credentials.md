> 翻译自 [English version](/cli-credentials)

# CLI 凭据

> 安全存储和管理用于 shell 工具执行的命名凭据集，通过 grants 实现 per-agent 访问控制。

## 概述

CLI 凭据让你可以定义命名凭据集（API key、token、连接字符串），agent 在通过 `exec` 工具运行 shell 命令时可以引用这些凭据 — 无需在系统提示词或对话历史中暴露密钥。

每条凭据以 **secure CLI binary** 形式存储——一个将二进制名称（如 `gh`、`gcloud`、`aws`）映射到 AES-256-GCM 加密环境变量集的命名配置。当 agent 运行该 binary 时，GoClaw 在执行时解密环境变量并注入到子进程。

## 全局 Binary 与 Per-Agent Binary

自迁移 036 起，访问模型改用 **grants 系统**，不再使用 per-binary agent 分配：

- **全局 binary**（`is_global = true`）：所有 agent 均可使用，除非 grant 覆盖了设置
- **受限 binary**（`is_global = false`）：只有拥有显式 grant 的 agent 才能访问

这将凭证定义与访问控制分离，允许你定义一次 binary，再按需授权给特定 agent 并附带可选的 per-agent 覆盖。

```
secure_cli_binaries（凭证 + 默认值）
        │
        ├── is_global = true  → 所有 agent 均可使用
        └── is_global = false → 仅有 grant 的 agent 可访问
                    │
                    └── secure_cli_agent_grants（per-agent 覆盖）
                            ├── deny_args（NULL = 使用 binary 默认值）
                            ├── deny_verbose（NULL = 使用 binary 默认值）
                            ├── timeout_seconds（NULL = 使用 binary 默认值）
                            ├── tips（NULL = 使用 binary 默认值）
                            └── enabled
```

## Agent Grants

`secure_cli_agent_grants` 表将 binary 与特定 agent 关联，并可选择性覆盖 binary 的任意默认设置。`NULL` 字段继承 binary 默认值。

| 字段 | 行为 |
|------|------|
| `deny_args` | 覆盖此 agent 的禁止参数模式 |
| `deny_verbose` | 覆盖此 agent 的详细标志剥离规则 |
| `timeout_seconds` | 覆盖此 agent 的进程超时 |
| `tips` | 覆盖注入此 agent TOOLS.md 的提示 |
| `enabled` | 禁用 grant 而不删除它 |

当 agent 运行 binary 时，GoClaw 按以下顺序应用设置：
1. Binary 默认值
2. Grant 覆盖（非 null 字段替换 binary 默认值）

## REST API

所有 grant 端点嵌套在 binary 资源下，需要 `admin` 角色。

### 列出 binary 的所有 grant

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
      "created_at": "2026-04-05T00:00:00Z",
      "updated_at": "2026-04-05T00:00:00Z"
    }
  ]
}
```

### 创建 grant

```
POST /v1/cli-credentials/{id}/agent-grants
```

```json
{
  "agent_id": "019...",
  "timeout_seconds": 120,
  "tips": "所有命令使用 --output json"
}
```

省略的字段（`deny_args`、`deny_verbose`、`tips`、`enabled`）默认为 `null` / `true`。

### 获取 grant 详情

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### 更新 grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

仅发送需要修改的字段。允许的字段：`deny_args`、`deny_verbose`、`timeout_seconds`、`tips`、`enabled`。

### 删除 grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

删除受限 binary（`is_global = false`）的 grant 会立即撤销该 agent 对此 binary 的访问权限。

## 常见模式

### 仅允许一个 agent 使用敏感 CLI 工具

1. 创建 binary，设置 `is_global = false`
2. 为目标 agent 创建 grant

### 允许所有 agent 使用，但对某个 agent 限制参数

1. 创建 binary，设置 `is_global = true`
2. 为受限 agent 创建 grant，在 `deny_args` 中添加额外的阻止模式

### 临时禁用某个 agent 的访问

更新 grant：`{"enabled": false}`。其他 agent 仍可正常使用该 binary。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| Agent 无法运行 binary | 检查 binary 的 `is_global`——若为 `false`，该 agent 需要显式 grant |
| Grant 覆盖未生效 | 确认 grant `enabled = true` 且覆盖字段非 null |
| grant 端点返回 `403` | 需要 admin 角色——检查 API key 的 scopes |

## 下一步

- [数据库 Schema → secure_cli_agent_grants](/database-schema)
- [Exec 审批](/exec-approval)
- [API Keys 与 RBAC](/api-keys-rbac)
- [安全加固](/deploy-security)

<!-- goclaw-source: c083622f | 更新: 2026-04-05 -->
