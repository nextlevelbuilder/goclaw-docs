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
                            ├── enabled
                            └── encrypted_env（BYTEA，AES-256-GCM — 可选的 per-grant 环境变量覆盖）
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
| `encrypted_env` | 可选的 per-grant 环境变量覆盖（静止时 AES-256-GCM 加密） |

当 agent 运行 binary 时，GoClaw 按以下顺序应用设置：
1. Binary 默认值
2. Grant 覆盖（非 null 字段替换 binary 默认值）
3. Per-grant `encrypted_env` 在执行时解密并合并到子进程环境中（仅对此 agent 覆盖 binary 级别的环境变量）

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
      "env_keys": [],
      "env_set": false,
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
  "tips": "所有命令使用 --output json",
  "env_vars": {
    "MY_API_KEY": "secret-value"
  }
}
```

省略的字段（`deny_args`、`deny_verbose`、`tips`、`enabled`、`env_vars`）默认为 `null` / `true`。`env_vars` 的值在静止时加密存储；后续 list/get 调用仅返回 key 名称。

### 获取 grant 详情

```
GET /v1/cli-credentials/{id}/agent-grants/{grantId}
```

### 更新 grant

```
PUT /v1/cli-credentials/{id}/agent-grants/{grantId}
```

仅发送需要修改的字段。允许的字段：`deny_args`、`deny_verbose`、`timeout_seconds`、`tips`、`enabled`、`env_vars`。

### 删除 grant

```
DELETE /v1/cli-credentials/{id}/agent-grants/{grantId}
```

删除受限 binary（`is_global = false`）的 grant 会立即撤销该 agent 对此 binary 的访问权限。

### 获取 grant 的明文环境变量

```
POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal
```

返回解密后的明文环境变量。每用户每分钟限制 10 次调用。详见 [获取解密环境变量](#获取解密环境变量)。

## Per-Agent 环境变量覆盖

自迁移 `000058` 起，每个 `secure_cli_agent_grants` 行可携带可选的 `encrypted_env` 列（BYTEA，AES-256-GCM）。这让你可以为同一 binary 给特定 agent 配置不同的环境变量集——例如不同的 AWS 账户、独立的 API key 或 staging 端点——而无需创建单独的 binary 定义。

**工作原理：**

- 创建/更新 grant 时，在请求体中发送 `env_vars`（明文 `string → string` 映射）。
- GoClaw 对 key 进行 denylist 验证，然后加密并持久化到 `encrypted_env`。
- 明文值永不存储或记录日志；store 层在写入前加密，读取时解密。
- list 和 get 响应仅返回 `env_keys`（已排序的 key 名称列表）和 `env_set`（布尔值）。除通过 `env:reveal` 端点外，值永不返回。

**创建带环境变量覆盖的 grant：**

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

响应（`201 Created`）包含 `env_keys` 但不含值：

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

**更新现有 grant 的环境变量：**

在 `PUT` 请求体中发送 `env_vars`。三态语义：
- **缺失** — 现有 env 不变
- **`null`** — 清除环境变量覆盖（移除 `encrypted_env`）
- **`{...}`** — 替换整个 env 映射（空 `{}` 与 `null` 效果相同）

## 获取解密环境变量

`POST /v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal` 返回特定 grant 的解密明文环境变量。端点使用 POST（而非 GET）以防止 HTTP 缓存并满足 CSRF 安全要求。

**安全控制：**
- 需要具有正确租户范围的 `admin` 角色——master 范围的调用者被拒绝。
- 每用户每分钟限制 **10 次**（burst 3）。超出时返回 `429`。
- 响应头包含 `Cache-Control: no-store`，防止代理缓存。
- 每次调用均被审计：调用者 ID、租户 ID、grant ID、binary ID 和时间戳以 INFO 级别记录日志。

```bash
curl -X POST http://localhost:8080/v1/cli-credentials/{id}/agent-grants/{grantId}/env:reveal \
  -H "Authorization: Bearer $TOKEN"
```

响应：

```json
{
  "env_vars": {
    "AWS_PROFILE": "staging",
    "AWS_DEFAULT_REGION": "us-west-2"
  }
}
```

当 grant 未设置环境变量覆盖时返回 `{"env_vars": {}}`。

## 环境变量 Denylist

并非所有环境变量名称都被接受。GoClaw 拒绝可能导致权限提升、shell 注入、TLS 绕过或数据外泄的 key。

**Key 格式要求：** key 必须匹配 `^[A-Z_][A-Z0-9_]*$`——仅大写字母、数字、下划线。小写字母、空格和特殊字符（包括 Shellshock 类函数定义）均被拒绝。

**精确匹配拒绝：**

| Key | 原因 |
|-----|------|
| `PATH`、`HOME`、`USER`、`SHELL`、`PWD` | 核心 shell/用户标识 |
| `LD_PRELOAD`、`LD_LIBRARY_PATH`、`LD_AUDIT` | 动态链接器劫持 |
| `NODE_OPTIONS`、`NODE_PATH` | Node.js 代码注入 |
| `PYTHONPATH`、`PYTHONHOME`、`PYTHONSTARTUP` | Python 路径/启动注入 |
| `GIT_SSH_COMMAND`、`GIT_SSH`、`GIT_EXEC_PATH`、`GIT_CONFIG_SYSTEM` | Git 命令注入 |
| `SSH_AUTH_SOCK` | SSH 密钥转发 |
| `BASH_ENV`、`ENV` | 非交互式 shell sourcing |
| `PROMPT_COMMAND` | shell 提示符执行 |
| `PERL5LIB`、`RUBYOPT` | Perl/Ruby 库注入 |
| `HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` | 数据外泄通道/代理绕过 |
| `SSL_CERT_FILE`、`SSL_CERT_DIR`、`CURL_CA_BUNDLE` | TLS CA 覆盖（中间人攻击） |
| `IFS` | shell 内部字段分隔符注入 |

**前缀匹配拒绝：** 以 `DYLD_`、`GOCLAW_`、`LD_` 或 `NPM_CONFIG_` 开头的任意 key 均被拒绝。

**限制：** 每个 grant 最多 50 个 key；每个值最多 4 096 字节；值不得包含 NUL 字节或换行符。

创建/更新时的 `400` 响应在 `rejected_keys` 中包含被拒绝的 key 名称：

```json
{
  "error": "env keys denied: LD_PRELOAD, PATH",
  "rejected_keys": "LD_PRELOAD,PATH"
}
```

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

<!-- goclaw-source: 392f0fda | 更新: 2026-05-21 -->
