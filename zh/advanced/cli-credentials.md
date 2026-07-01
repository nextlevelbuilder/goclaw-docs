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

## 类型化凭证适配器（Typed Credential Adapters）

上面各节描述的是**旧版 env 粘贴模型**——你粘贴任意环境变量，GoClaw 将它们原样注入子进程。这对从单个稳定 env var 读取认证信息的工具（`GH_TOKEN`、`AWS_ACCESS_KEY_ID` 等）有效，但对 `git` 这类从配置文件、凭证 helper 或 per-remote URL 读取凭证的工具则失效——把 PAT 粘贴进 `GIT_TOKEN` 毫无作用。

**类型化凭证适配器**解决了这个问题。你不再粘贴原始 env var，而是选择一个凭证*类型*，GoClaw 会通过一个服务端适配器路由该凭证，适配器知道如何为特定工具正确且安全地注入它。

### 凭证类型

每行 typed credential 携带一个 `credential_type`：

| `credential_type` | 含义 |
|-------------------|------|
| `NULL` / `env` | 旧版 env 透传——env var 原样注入，与之前完全相同。无 host scoping。 |
| `pat` | Personal Access Token，用于 HTTPS git remote（GitHub/GitLab/Gitea）。需要 `host_scope`。 |
| `ssh_key` | SSH 私钥（PEM），用于 SSH 上的 git。需要 `host_scope`。 |

`NULL`/`env` 行永不被迁移——现有旧版凭证保持原样工作。类型化适配器按凭证逐个 opt-in。

### Agent 凭证（默认 git 路径）

Agent 凭证是 git 认证的**默认**路径。它们避免了 channel 用户 ID 的歧义：被选中的 agent 拥有该凭证，任何被允许使用该 agent 的人都可以让它带着已存凭证运行 git。

Agent 凭证存于 `secure_cli_agent_credentials` 表（migration `000077`），该表将类型化 secret 材料与 `secure_cli_agent_grants` 策略行**分开**存储。每个 `(agent, binary)` 对应一个凭证。

**添加 agent 凭证（UI）：**

1. 打开 **Packages → CLI Credentials**。
2. 选择 `git` 行并打开 **Agent Access**。
3. 在 **Credential** 选项卡中选择 agent。
4. 选择 **Credential Type**：`Personal Access Token` 或 `SSH Private Key`。
5. 输入 **Host Scope**（PAT/SSH 必填）：凭证认证到的 hostname（例如 `github.com`、`gitlab.example.com`、`gitea.internal:8443`）。
6. 粘贴 token（PAT）或未加密的 PEM 主体（SSH）。
7. 保存。

**Agent Access** 对话框有两个选项卡：

- **Credential**——选择 agent、凭证类型、host scope 和 secret（如上）。
- **Access policy**——更改该 agent 的 deny args、timeout、tips 或 env 覆盖（`secure_cli_agent_grants` 行）。

策略与 secret 存储在内部保持分离，但你在这一个对话框中将它们作为单一访问决策来管理。存储的 secret 经 AES-256-GCM 加密且永不可读回——编辑该行会显示 `••••••••` 占位符。

### 凭证生效优先级

当 git 运行时，GoClaw 按以下顺序解析要注入哪个类型化凭证——**第一个**匹配项胜出：

1. **用户覆盖**——一个 per-user 类型化凭证（下方的 Advanced user overrides）。
2. **channel/context 凭证**——scope 到该次运行所源自的 channel 或 group context 的凭证。
3. **Agent 凭证**——agent 自己的 `secure_cli_agent_credentials` 行。这是默认信任边界。
4. **Binary 级 env 默认值**——binary 定义上的旧版透传 env。

授予 agent git 访问权限实际上就是授予使用其已存 git 凭证，因此除非存在更高层（用户覆盖或 channel/context 凭证），agent 凭证就是默认边界。

### Advanced user overrides

Per-user 凭证仍可用于个人覆盖与向后兼容。仅当一个稳定的租户用户 ID 是预期的凭证边界时才使用它们——它们在优先级顺序中位于 agent 凭证**之上**。

在 dashboard 的 **Packages → CLI Credentials → Advanced User Overrides → Add** 管理它们：选择 user，选择凭证类型（`Personal Access Token` 或 `SSH Private Key`），输入 **Host Scope**，并粘贴 secret。存储的 secret 经 AES-256-GCM 加密且永不可读回——编辑时 secret 字段留空将保留已存值，输入新值则替换它。

这些行存于 `secure_cli_user_credentials` 表。

### Agent 凭证 REST API

agent-credentials 端点管理单个 `(binary, agent)` 对的类型化 secret。它们需要 `admin` 角色。

#### 列出某 binary 的 agent 凭证

```
GET /v1/cli-credentials/{id}/agent-credentials
```

返回为该 binary 存有凭证的 agent，仅含元数据（凭证类型、host scope、是否有 key）——绝不返回 secret。

#### 获取某个 agent 的凭证

```
GET /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

#### 设置（创建或替换）某个 agent 的凭证

```
PUT /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

发送 `credential_type`、`host_scope` 和 secret（`env` 用 `env_vars`，或类型化 PAT/SSH key 主体）。secret 在存储时加密且绝不返回。

#### 删除某个 agent 的凭证

```
DELETE /v1/cli-credentials/{id}/agent-credentials/{agentId}
```

删除已存 secret。agent 的 `secure_cli_agent_grants` 策略行（deny args、timeout 等）不受影响——单独删除 grant 以撤销访问权限。

### git 适配器

`git` 适配器是首个发布的类型化适配器。它**仅**为网络子命令注入凭证：

```
clone   fetch   pull   push   submodule
```

任何其他子命令（`status`、`log`、`diff`、`commit`、`branch` 等）都是本地操作，**无凭证**运行——不注入、无 audit-log 行。

**PAT 流程。** token 通过环境变量注入，绝不出现在 `argv` 上：

```
GIT_CONFIG_COUNT=1
GIT_CONFIG_KEY_0=http.https://<host>/.extraheader
GIT_CONFIG_VALUE_0=Authorization: Basic base64("x-access-token:<token>")
```

header 值是 HTTP Basic 认证：固定用户名 `x-access-token` 与你的 token 用冒号连接，再做 base64 编码。由于 token 位于 env value 中（而非命令行 flag），它绝不会出现在 `ps`、`/proc/<pid>/cmdline` 或 shell 历史中。注入的 env var 仅作用于被 spawn 的 `git` 进程——GoClaw 自身的环境和其他 exec 调用永远看不到它们。

原始 token、base64 payload **以及**完整的 `Authorization: Basic …` header 都已注册到 output scrubber，因此这三者都无法通过 stdout、stderr、错误消息或 audit log 泄回 agent。

**SSH 流程。** PEM 密钥被写入系统临时目录中一个 `0600` 模式的 tmpfile（前缀 `goclaw-gitkey-*`），并将 `GIT_SSH_COMMAND` 设为：

```
ssh -i <tmpfile> -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=accept-new
```

`BatchMode=yes` 意味着 SSH 绝不提示，并在 agent 上下文中快速失败。`StrictHostKeyChecking=accept-new` 在**首次连接（TOFU）**时接受未知 host key。预先填充 `~/.ssh/known_hosts` 以关闭该窗口（见 [安全加固](/deploy-security)）。tmpfile 在 exec 后通过 deferred cleanup 删除。**SSH 私钥在保存时会两次校验**——先用 Go 的 SSH 解析器，再在可用时用 OpenSSH（`ssh-keygen -y -f <tmpfile>`）——以捕获那些能保存成功但日后会因 OpenSSH 诊断而失败的密钥。**带 passphrase 的 SSH 密钥在保存时被拒绝**——请重新导出无 passphrase 的密钥，或使用专用 deploy key。

### Host scope

`pat` 和 `ssh_key` 都需要 **`host_scope`**——凭证有效的精确 ASCII `host` 或 `host:port`。它被规范化为小写 ASCII（通过 `idna.ToASCII`）并**精确匹配**。v1 **无通配符**，且 port 是 key 的一部分：

| 存储的 `host_scope` | `github.com` | `api.github.com` | `github.com:8443` |
|---------------------|:---:|:---:|:---:|
| `github.com` | ✓ | ✗ | ✗ |

如果你在 scheme 的默认端口（443 HTTPS、22 SSH）上运行自托管服务器，省略 port；若在非默认端口上，则包含 port（例如 `gitea.internal:8443`）。当没有选择任何类型化 PAT/SSH 凭证，或所选凭证无法匹配解析出的 remote host 时，**适配器管理的 remote git 命令将 fail closed 并附带一个 GoClaw 诊断**。在 agent 运行时中，`git` **不**允许回退到交互式用户名/密码提示。

### Env 可见性：敏感与非敏感

存储的 env 条目现在携带一个 `kind`。当 dashboard 或 admin API 读回某个凭证时，response 按 kind 屏蔽值：

| `kind` | 在 API response 中 |
|--------|--------------------|
| `sensitive`（默认；旧版 string map 解码到此） | `value: null`、`masked: true` |
| `value`（明确非敏感，例如 region 或 profile 名） | 返回明文值、`masked: false` |

这让 operator 能在 UI 中看到非密上下文（例如 `AWS_DEFAULT_REGION=us-west-2`），同时 secret 保持屏蔽。secret 仍只能通过专用的 `env:reveal` 端点返回。

### 从旧版 env 凭证迁移

没有强制迁移。`credential_type IS NULL` 或 `= 'env'` 的行仍像以前一样发出其 env var。要升级某个 git 凭证，创建一个匹配的 **Agent Credential**（或者，若稳定的用户 ID 是预期边界，则创建一个 Advanced user override），输入 host scope，粘贴 secret 并保存。现有用户覆盖的优先级仍高于 agent 凭证，因此你可以逐步迁移，并在不再需要时移除用户覆盖。

### v1 限制

- **每个 `(agent, binary)` 行一个凭证**，外加每个 `(user, binary)` 覆盖的旧版一个凭证。
- **无通配符 host**——每个精确 `host[:port]` 对应一个凭证；不支持 `*.github.com`。
- **无带 passphrase 的 SSH 密钥**——在验证时被拒绝。
- **无 sandbox 传播**——适配器会修改已 fork 子进程的环境，与基于 bind-mount 的 Docker sandbox 路径不兼容。v1 中 credentialed exec 仅在 host 上运行。
- **无 host-key 固定**——SSH 使用 TOFU（`accept-new`）；预先填充 `known_hosts`。

### Google Workspace CLI (gws)

GoClaw 为 Google Workspace CLI（`@googleworkspace/cli`）提供了一个 `gws` 预设。

**可用性。** `gws` binary **仅在已发布的 `full` Docker 镜像中**预装。在 `latest`/`base` 镜像上，从 Packages 页面安装 `@googleworkspace/cli`（需要启用 Node 的构建，`ENABLE_NODE=true`；Node.js 18+）。

**凭证。** 从 `gws` 预设创建一个 SecureCLI 凭证，并提供至少一个认证来源：

| Env var | 用途 |
|---------|------|
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` | 导出的 `gws` 凭证或 OAuth credentials JSON 文件的路径 |
| `GOOGLE_WORKSPACE_CLI_TOKEN` | 预先获取的 Google OAuth access token（可选） |
| `GOOGLE_WORKSPACE_CLI_CLIENT_ID` | 手动认证流程的 OAuth client ID（可选） |
| `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET` | 手动认证流程的 OAuth client secret（可选） |

**被阻止的命令。** 该预设阻止交互式和导出凭证的认证流程：

```
gws auth setup    gws auth login    gws auth export    gws auth logout
```

在 agent execution 之外运行这些流程，然后将产生的 token 或 credentials-file 路径存入 SecureCLI。

**用法。** 默认偏向读取。使用 `--params` 传递查询参数，`--json` 传递 request body，`--page-all` 进行分页读取：

```sh
gws drive files list --params '{"pageSize": 10}'
gws gmail users messages list --params '{"userId": "me", "maxResults": 10}'
gws calendar events list --params '{"calendarId": "primary", "maxResults": 10}'
```

> **写入警告。** 写入命令可能修改 Workspace 数据。保持默认预设偏向读取，并为任何已批准的写入工作流创建单独的、经过审查的 SecureCLI 配置。

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
| `git clone`/`push` 因无凭证失败 | 没有类型化凭证匹配 remote host——git fail closed（不提示）。添加一个带精确 `host_scope` 的 Agent Credential。 |

## 下一步

- [权限矩阵](/permission-matrix) — 完整的权限层级、group/channel 范围以及 channel-context 凭证
- [数据库 Schema → secure_cli_agent_grants](/database-schema)
- [Exec 审批](/exec-approval)
- [API Keys 与 RBAC](/api-keys-rbac)
- [安全加固](/deploy-security)

<!-- goclaw-source: fabe86b3 | 更新: 2026-06-30 -->
