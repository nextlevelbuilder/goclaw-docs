> 翻译自 [English version](/troubleshoot-mcp)

# MCP 问题

> MCP（Model Context Protocol）server 连接、工具注册和执行的故障排除。

## 概览

GoClaw 将外部 MCP server 桥接到 agent 工具注册表。每个 server 作为独立进程（stdio）或远程服务（SSE / streamable-HTTP）运行。连接错误、工具名称冲突和超时是最常见的故障模式。

检查启动日志中的 MCP 事件——关键日志键：`mcp.server.connected`、`mcp.server.connect_failed`、`mcp.server.health_failed`、`mcp.server.reconnect_exhausted`。

## Server 连接

### 配置文件 server（`mcp_servers` 块）

GoClaw 在启动时连接所有已启用的配置文件 server。失败的 server 以警告形式记录日志；GoClaw 继续运行——**不会**阻断启动。

```
WARN mcp.server.connect_failed server=postgres error=create client: ...
```

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `create client: ...` | `transport` 或 `command` 路径错误 | 验证 `transport`（`stdio`、`sse`、`streamable-http`）以及二进制/URL 是否可达 |
| `start transport: ...`（SSE/HTTP）| server URL 不可达或 TLS 错误 | 检查 `url` 是否正确；验证网络、防火墙和 TLS 证书 |
| `initialize: ...` | MCP 握手失败 | 确认 server 实现了 MCP 协议；检查 server 日志 |
| `list tools: ...` | server 已连接但未返回工具 | server 可能在启动时崩溃；检查 server 日志 |
| server 未出现在仪表盘中 | 配置中 `enabled: false` | 设置 `enabled: true` 或省略该字段（默认为 true）|

### 重连

GoClaw 每 30 秒通过 ping 进行健康检查。失败时使用指数退避（初始 2 秒，最大 60 秒）重试最多 **10 次**。10 次失败后，server 被标记为永久断开。

```
WARN mcp.server.health_failed server=postgres error=...
INFO mcp.server.reconnecting  server=postgres attempt=3 backoff=8s
ERROR mcp.server.reconnect_exhausted server=postgres
```

如果看到 `reconnect_exhausted`，说明 server 进程很可能已崩溃。重启 MCP server，然后通过仪表盘触发重连或重启 GoClaw。

## 工具注册

工具以 `{prefix}__{tool_name}` 名称注册。前缀默认为 `mcp_{server_name}`（连字符转换为下划线）。可以在 server 配置中用 `tool_prefix` 覆盖。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 日志中出现 `mcp.tool.name_collision`，工具被跳过 | 两个 server 暴露了解析为相同注册名的工具 | 在配置中为每个 server 设置唯一的 `tool_prefix` |
| 工具对 agent 不可见 | server 已连接但 agent 无权限授权 | 在仪表盘中向 agent 授权该 server（Agents → MCP 标签）|
| 超过 40 个工具 → 只有 `mcp_tool_search` 可见 | 超过 40 工具阈值时自动激活搜索模式 | 使用 `mcp_tool_search` 按需查找和激活工具；这是预期行为 |

## 传输错误

### stdio

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `exec: command not found` | 二进制不在 PATH 中或 `command` 值错误 | 在 `command` 中使用绝对路径；验证二进制已安装 |
| 进程立即退出 | server 启动时崩溃 | 在终端中手动运行命令以查看错误输出 |
| 环境变量未传递 | `env` 映射中缺少条目 | 在 server 配置块的 `env` 下添加所需变量 |

### SSE / streamable-HTTP

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `connection refused` | server 未运行或端口错误 | 启动 server；验证 `url` 与监听地址匹配 |
| `401 Unauthorized` | 缺少或错误的认证头 | 在 `headers` 下添加 token（如 `Authorization: Bearer <token>`）|
| TLS 证书错误 | 自签名或过期证书 | 使用有效证书，或将 MCP server 放在受信任的反向代理后面 |

## 工具执行

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `MCP server "X" is disconnected` | 初始连接后 server 下线 | 检查 server 进程；GoClaw 自动重试重连 |
| `MCP tool "X" timeout after Ns` | 工具调用超过 `timeout_sec`（默认 60 秒）| 在 server 配置中增大 `timeout_sec`；默认为 60 秒 |
| `MCP tool "X" error: ...` | server 在执行期间返回错误 | 检查 MCP server 日志以找到根本原因 |
| 工具返回 `[non-text content: ...]` | server 返回了图片/音频而非文本 | 非文本工具的预期行为；结果中注明了内容类型 |

## 下一步

- [常见问题](/troubleshoot-common) — 一般启动和连接问题
- [仪表盘导览](/dashboard-tour) — 在 UI 中管理 MCP server 和授权

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
