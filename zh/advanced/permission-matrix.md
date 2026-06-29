# Agent 权限矩阵

> 决定一个 agent 在各 channel、group 和 workspace 上能做什么的全部授权层级——以及这些层级如何组合。

## 概览

一个 agent 的单一操作（发送回复、写 workspace 文件、编辑 context 文件）会经过若干个相互独立的权限层。每一层都可以允许或拒绝，并且它们层层叠加：只有当每个适用的层都允许时，操作才被准许。本页梳理这些层、你可以从 chat 授予的 agent 配置权限规则、按 channel 划分的矩阵，以及最容易让人意外的规则（Zalo context 写入和 channel-context 凭证）。

如果你只需要 gateway-token 角色，请看 [API Keys 与 RBAC](/api-keys-rbac)——那是第 1 层。本页覆盖其上的各层。

## 权限层级

| 层 | 范围 | 说明 |
|----|------|------|
| 租户 RBAC | Dashboard、HTTP、WebSocket RPC | Viewer / operator / admin / owner。仅 admin 的方法包括 `config.permissions.*`。 |
| Agent 所有权 / 共享 | 用户能看到和管理哪些 agent | Owner 加上显式共享；见[共享与访问控制](/sharing-and-access)。 |
| Channel 成员资格 | 平台投递 | 在 GoClaw 允许操作后，平台仍可拒绝出站投递。 |
| Agent 配置权限 | 从 chat 驱动的配置变更 | 按 `agent_id`、`scope`、`config_type`、`user_id` 匹配，包括通配符行。 |
| Workspace 文件边界 | 文件系统访问 | 防止路径逃逸和不支持的写入。 |
| Context 文件边界 | Agent 身份 / context 文件 | 受保护文件被路由到 store，并在 group context 中要求 group writer 权限。 |
| Channel context 能力 | MCP + Secure CLI 工具执行 | 凭证优先级：用户凭证 > context 凭证/grant > agent grant > 全局默认值。 |

## Agent 配置权限行

agent 的部分配置可以从 chat 中更改（例如启用 file writer 或 heartbeat）。每条权限规则是一个带四个字段的行：

| 字段 | 示例 | 含义 |
|------|------|------|
| `scope` | `agent`、`group:*`、`group:zalo:123`、`group:telegram:-100`、`*` | grant 适用的位置。 |
| `config_type` | `file_writer`、`heartbeat`、`cron`、`context_files`、`*` | grant 覆盖的操作族。 |
| `user_id` | `123456`、`zalo-user-id`、`*` | grant 覆盖的对象。`*` 授予所选范围内的每位成员。 |
| `permission` | `allow`、`deny` | 决策。deny 可以覆盖更宽的 allow。 |

### 生效优先级

当多行匹配同一请求时，GoClaw 自上而下解析，并停在第一个适用的规则：

1. 个体 deny。
2. 个体 allow。
3. 范围/用户通配符 deny。
4. 范围/用户通配符 allow。
5. 默认 deny。

因此针对某个用户的特定 `deny` 始终胜过通配符 `allow`，未匹配到的任何内容都按默认拒绝。

## Channel 矩阵

agent 能做什么取决于请求来自哪里。下表汇总了常见的 channel context。

| Channel context | 读取 agent 输出 | 发送回复 | 写 workspace 文件 | 写受保护 context 文件 | 授予所有成员 |
|-----------------|-----------------|----------|-------------------|------------------------|--------------|
| Dashboard | 受 RBAC 控制 | N/A | admin/operator 路径，然后 workspace 边界 | admin 路径，然后 context interceptor | 使用 Permissions 选项卡 |
| 私信 | 按 agent/session 访问 | Channel adapter | 由 workspace 边界允许 | 由 agent/context 规则允许 | 通常不需要 |
| Telegram group | Group 范围 + sender ID | Channel adapter | group 受控时需要 `file_writer` | 需要 `context_files` 或 `file_writer` 且 sender 真实 | `scope=group:telegram:<chatId>`、`user_id=*` |
| Zalo group | Group 范围 + sender ID | Channel adapter、group thread 元数据 | group 受控时需要 `file_writer` | 需要 `context_files` 或 `file_writer` 且 sender 真实 | `scope=group:zalo:<chatId>`、`user_id=*` |
| Discord guild/channel | Guild 范围 + sender ID | Channel adapter | guild 受控时需要 `file_writer` | 需要 `context_files` 或 `file_writer` 且 sender 真实 | `scope=guild:<id>` 或匹配的 group 范围、`user_id=*` |
| 计划/主动运行 | 系统 sender | Channel adapter | group 受控写入被拒绝，除非 context 被提升 | 受保护 group context 写入被拒绝 | 配置显式规则，或从 dashboard/admin context 运行 |

## Zalo context 写入规则

一个常见的 Zalo group 失败是：agent 试图从一个缺少 sender 的 group session 写入受保护的 context 文件——`SOUL.md`、`IDENTITY.md`、`AGENTS.md`、`USER.md`、`USER_PREDEFINED.md` 或 `CAPABILITIES.md`。受保护的 context 写入会经过 group permission gate，要求：

- `sender_id` 是**真实的平台用户**，不为空或合成。
- `user_id` 标识 group 范围，例如 `group:zalo:<chatId>`。
- sender 匹配一个 `context_files` allow（或旧版 `file_writer` allow），包括 `user_id="*"` 这样的通配符行。
- 缺少租户 context 或 permission-store 错误会 **fail closed**——写入被拒绝而非被允许。

如果某个 Zalo group 写入被拒绝，请检查该消息是否携带真实 sender，以及该 group 范围是否存在匹配的 `context_files` 规则。

## Permissions 选项卡（UX）

dashboard 的 Permissions 选项卡是上述各行的完整矩阵编辑器：

| 控件 | 行为 |
|------|------|
| 用户/联系人选择器 | 接受显式用户 ID 和联系人搜索结果。 |
| All members 按钮 | 将当前规则的 `user_id` 设为 `*`。 |
| Config type 选择器 | `file_writer`、`heartbeat`、`cron`、`context_files` 或 `*`。 |
| Scope 选择器 | 已知 group、`group:*`、`agent` 或 `*`。 |
| Check access | 调用 `config.permissions.check`，在保存前或保存后显示生效的 allow/deny 决策。 |

使用 **Check access** 可在不保存的情况下预览某个特定用户和范围的生效决策——它运行与运行时相同的优先级解析。

## Channel context 能力

Channel instance 在 dashboard 和 API 中暴露已存的 context。基础 context 是 channel instance 本身；group context 来自已存的 channel contact。每个能力行结合该 context 的 MCP 与 Secure CLI 可见性——来源、启用状态、工具 allow/deny 列表，以及是否存在凭证。

Context 凭证行**绝不返回 secret 材料**。它们仅投影元数据，例如 `has_api_key`、`has_env`、`credential_source` 以及可用的 key 名称。写入受租户-admin 限制，运行时解析携带 `ChannelContextScope`，因此 grant 和凭证仅应用于匹配的 channel/group 范围。

### Channel-context 凭证优先级

当工具在 channel context 中运行时，GoClaw 按以下顺序解析凭证——第一个匹配项胜出：

1. 用户凭证。
2. Context 凭证 / grant。
3. Agent grant。
4. 全局默认值。

这与 git 适配器使用的类型化凭证优先级一致（见 [CLI 凭据](/cli-credentials)）。

## 安全说明

- 通配符 `user_id="*"` 应易于授予，但始终**在视觉上显式**——它会将访问扩展到范围内的每位成员。
- 合成 sender 对 group 文件/context 写入仍被拒绝，因此系统轮次不会从一个并非其本身的真实用户继承权限。
- permission-store 错误在 group 变更边界 **fail closed**。
- 后端校验在写入任何规则前拒绝未知的 config type 和 permission。
- 平台发送权限与 GoClaw 权限相互独立：即使 GoClaw 允许 agent 的操作，channel adapter 仍可拒绝投递。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| Zalo group context 写入被拒绝 | 确保消息有真实的 `sender_id`，并为 `group:zalo:<chatId>` 存在匹配的 `context_files`（或 `file_writer`）allow。 |
| 通配符 allow 未生效 | 个体 `deny` 胜过通配符 `allow`。移除 deny 或将其范围收窄。 |
| 计划运行无法写 group 文件 | 主动/系统运行对 group 受控写入被拒绝——配置显式规则或从 dashboard/admin context 运行。 |
| GoClaw 发送的回复从未送达 | channel adapter 拒绝了投递——GoClaw 权限与平台发送权限相互独立。 |

## 下一步

- [API Keys 与 RBAC](/api-keys-rbac) — 第 1 层：gateway-token 角色与 scope
- [共享与访问控制](/sharing-and-access) — agent 所有权与共享
- [CLI 凭据](/cli-credentials) — 类型化凭证与 channel-context 凭证优先级
- [安全加固](/deploy-security) — 完整的五层安全概览

<!-- goclaw-source: fabe86b3 | 更新: 2026-06-30 -->
