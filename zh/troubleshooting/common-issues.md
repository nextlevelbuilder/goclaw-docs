> 翻译自 [English version](/troubleshoot-common)

# 常见问题

> 运行 GoClaw 时最常见问题的修复方法。

## 概览

本页涵盖首次启动 GoClaw 或配置更改后可能遇到的问题。问题按阶段分组：启动、WebSocket 连接、agent 行为和资源使用。

## Gateway 无法启动

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `failed to load config` | 配置文件路径错误或 JSON5 格式不正确 | 检查 `GOCLAW_CONFIG` 环境变量；验证 JSON5 语法 |
| `No AI provider API key found` | API key 环境变量未加载 | 运行 `source .env.local && ./goclaw` 或重新运行 `./goclaw onboard` |
| `ping postgres: dial error` | PostgreSQL 未运行或 DSN 错误 | 验证 `GOCLAW_POSTGRES_DSN`；检查 Postgres 是否运行 |
| `open discord session` 错误 | Discord bot token 无效 | 重新检查环境变量中的 `GOCLAW_DISCORD_TOKEN` |
| `sandbox disabled: Docker not available` | 沙盒模式已设置但 Docker 未安装/未运行 | 安装 Docker 或在配置中设置 `sandbox.mode: "off"` |
| 端口已被占用 | 另一个进程占用相同端口 | 更改 `GOCLAW_PORT`（默认 `8080`）或终止冲突进程 |
| `database schema is outdated` | 二进制升级后未运行数据库迁移 | 运行 `./goclaw upgrade`（或设置 `GOCLAW_AUTO_UPGRADE=true`）|
| `database schema is dirty` | 之前的迁移中途失败 | 运行 `./goclaw migrate force <version-1>` 然后 `./goclaw upgrade` |
| `database schema is newer than this binary` | 在较新数据库上运行旧二进制 | 将 GoClaw 二进制升级到最新版本 |

**快速检查：** GoClaw 自动检测缺失的 provider 配置并打印有用消息：

```
No AI provider API key found. Did you forget to load your secrets?

  source .env.local && ./goclaw
```

## WebSocket 连接失败

WebSocket 端点为 `ws://localhost:8080/ws`。发送的第一帧**必须**是 `connect` 方法——任何其他方法都会返回 `ErrUnauthorized: first request must be 'connect'`。

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `first request must be 'connect'` | 帧顺序错误 | 首先发送 `{"type":"req","method":"connect","params":{...}}` |
| `invalid frame` / `malformed request` | JSON 格式错误 | 根据 `pkg/protocol` 线协议类型验证帧格式 |
| `websocket read error`（日志） | 客户端异常断开 | 浏览器标签关闭的正常现象；检查客户端重连逻辑 |
| 速率限制（无响应） | 每用户请求过多 | Gateway 强制执行每用户 token bucket 速率限制；退避后重试 |
| 浏览器中的 CORS 阻断 | 浏览器执行同源策略 | 在配置中将前端来源添加到 `gateway.allowed_origins` |
| 消息超过 512 KB | WebSocket 帧超过服务器限制 | 拆分大型载荷；超出时 GoClaw 以 `ErrReadLimit` 关闭连接 |

## Agent 不响应

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| Provider 返回 `HTTP 401` | API key 无效或过期 | 在仪表盘或数据库中更新 provider 的 API key |
| Provider 返回 `HTTP 429` | 上游速率限制 | GoClaw 自动重试（最多 3 次，指数退避）；如持续发生，减少请求量 |
| `HTTP 404` / 模型未找到 | 模型名称错误或不可用 | 对照 provider 当前模型列表检查 agent 配置中的模型名称 |
| Agent 返回空回复 | 系统提示问题或 token 限制 | 检查 `bootstrap/` 文件；在会话追踪中查看上下文窗口使用情况 |
| 工具调用未执行 | 工具注册缺失或沙盒配置错误 | 检查启动日志中的 `registered tool:` 行；如果启用了沙盒，验证 Docker |

GoClaw 在遇到 `429`、`500`、`502`、`503`、`504` 以及网络错误（连接重置、EOF、超时）时使用指数退避重试，起始延迟 300ms，上限 30s。

## 内存使用过高

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 内存随会话数增长 | 大量打开的会话缓存在内存中 | 会话由 Postgres 支持；检查配置中的会话清理间隔 |
| 大量 embedding 占用内存 | pgvector 索引加载 | 大型记忆集合的正常现象；确保在 Postgres 中设置了 `WORK_MEM` |
| 日志缓冲区增长 | `LogTee` 捕获所有日志用于 UI 流式传输 | 不是内存泄漏；按客户端有界。检查是否有卡住的 WebSocket 客户端 |

## 诊断

运行 `./goclaw doctor` 进行快速健康检查。它验证：

- 配置文件存在性和解析
- PostgreSQL 连接性和 schema 版本
- Provider API key（已脱敏）
- Channel 凭证
- 外部工具（Docker、curl、git）
- 工作区目录

```
./goclaw doctor
```

## 下一步

- [Channel 特定问题](/troubleshoot-channels)
- [Provider 特定问题](/troubleshoot-providers)
- [数据库问题](/troubleshoot-database)

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
