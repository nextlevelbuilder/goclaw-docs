> 翻译自 [English version](#deploy-checklist)

# 生产检查清单

> 将 GoClaw 从开发环境迁移到生产环境前需要验证的所有事项。

## 概览

本检查清单涵盖在生产环境中加固、保护和可靠运行 GoClaw gateway 的关键步骤。上线前请从上到下逐节执行。

---

## 1. 数据库

- [ ] PostgreSQL 15+ 已运行并安装了 **pgvector** 扩展
- [ ] `GOCLAW_POSTGRES_DSN` 通过环境变量设置——永远不写入 `config.json`
- [ ] 连接池大小适合预期并发量
- [ ] 数据库连接池使用 25 个最大连接 / 10 个最大空闲连接（硬编码）——确保 PostgreSQL 的 `max_connections` 能够支持此数量加上其他客户端
- [ ] 已配置自动备份（每日最少，每季度测试恢复）
- [ ] Schema 已是最新：`./goclaw upgrade --status` 显示 `UP TO DATE`

```bash
# 验证 schema 状态
./goclaw upgrade --status

# 应用所有待执行的迁移
./goclaw upgrade
```

---

## 2. 密钥与加密

- [ ] `GOCLAW_ENCRYPTION_KEY` 设为随机 32 字节十六进制字符串——**请备份**。丢失后存储在数据库中的所有加密 API key 将无法读取。
- [ ] `GOCLAW_GATEWAY_TOKEN` 设为强随机值——WebSocket 和 HTTP 鉴权必需
- [ ] 两个密钥均未出现在 `config.json`、git 历史或日志中
- [ ] 所有 provider API key 通过环境变量设置（`GOCLAW_ANTHROPIC_API_KEY` 等）或通过仪表盘添加（使用 AES-256-GCM 加密存储）

```bash
# 如果尚未运行 onboard/prepare-env.sh，手动生成密钥
export GOCLAW_ENCRYPTION_KEY=$(openssl rand -hex 32)
export GOCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
```

> 在密钥管理器中备份 `GOCLAW_ENCRYPTION_KEY`（如 AWS Secrets Manager、1Password、Vault）。轮换后，数据库中所有加密的 API key 将无法读取。

---

## 3. 网络与 TLS

- [ ] TLS 终止已就位（nginx、Caddy、Cloudflare 或负载均衡器）——GoClaw 标准模式下不终止 TLS
- [ ] Gateway **未**在没有 TLS 的情况下直接暴露在公网端口
- [ ] `gateway.allowed_origins` 设为实际的客户端来源（空 = 允许所有 WebSocket 来源）

```json
{
  "gateway": {
    "allowed_origins": ["https://your-dashboard.example.com"]
  }
}
```

---

## 4. 速率限制

- [ ] 已设置 `gateway.rate_limit_rpm`（默认：每用户每分钟 20 次请求，0 = 禁用）
- [ ] 已设置 `tools.rate_limit_per_hour`（默认：每会话每小时 150 次工具执行，0 = 禁用）
- [ ] Webhook 速率限制内置（每来源每 60 秒 30 次请求，最多追踪 4096 个来源）——无需配置

```json
{
  "gateway": {
    "rate_limit_rpm": 20
  },
  "tools": {
    "rate_limit_per_hour": 150
  }
}
```

---

## 5. 沙盒配置

如果 agent 需要执行代码，请检查沙盒设置：

- [ ] 已设置 `sandbox.mode`：`"off"`（无沙盒）、`"non-main"`（仅沙盒子 agent）或 `"all"`（全部沙盒）
- [ ] `sandbox.memory_mb` 和 `sandbox.cpus` 已根据工作负载调整（默认：512 MB、1 CPU）
- [ ] `sandbox.network_enabled` 为 `false`，除非 agent 明确需要网络访问
- [ ] `sandbox.read_only_root` 为 `true`（默认），使容器根文件系统不可变
- [ ] `sandbox.timeout_sec` 设为合理限制（默认：300 秒）
- [ ] `sandbox.idle_hours` 已调整（默认：24——超过此时间的空闲容器将被删除）
- [ ] `sandbox.max_age_days` 已设置（默认：7——超过此天数的容器将被删除）

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "memory_mb": 512,
        "cpus": 1.0,
        "network_enabled": false,
        "read_only_root": true,
        "timeout_sec": 120
      }
    }
  }
}
```

---

## 6. 安全设置

- [ ] `gateway.injection_action` 设为 `"warn"`（默认）或 `"block"`——生产环境绝不使用 `"off"`
- [ ] `tools.exec_approval.security` 为 `"full"`（默认）——阻止危险 shell 模式
- [ ] `agents.defaults.restrict_to_workspace` 为 `true`（默认）——防止路径遍历到工作区外
- [ ] 如果 agent 需要浏览网页，检查 `tools.web_fetch` 域名允许/拒绝列表

---

## 7. 监控与告警

- [ ] 日志输出已被收集（stdout/stderr）——GoClaw 通过 `slog` 使用结构化 JSON 日志
- [ ] 针对重复出现的 `slog.Warn("security.*")` 日志条目配置告警——这些表示被阻止的攻击或异常
- [ ] 针对 `tracing: span buffer full` 配置告警——表示 collector 在高负载下处理落后
- [ ] 已配置正常运行时间监控（如 ping `/health` 或 gateway 端口）
- [ ] 考虑启用 OTel 导出以获得 trace 级别的可见性——参见[可观测性](#deploy-observability)
- [ ] 交互式 API 文档可在 `/docs`（Swagger UI）和 `/v1/openapi.json` 获取，用于集成测试

---

## 8. 运维规范

- [ ] 如果写入文件，已配置日志轮换（使用 `logrotate` 或容器运行时的日志驱动）
- [ ] 仅在接受启动时自动执行 schema 迁移的情况下设置 `GOCLAW_AUTO_UPGRADE=true`；否则使用 `./goclaw upgrade` 显式升级
- [ ] 已有重启、回滚、DB 恢复和加密 key 轮换的操作手册
- [ ] 升级流程已记录并测试——参见[升级](#deploy-upgrading)

---

## 9. API Key 管理

- [ ] 考虑创建作用域 API key 而非共享 gateway token
- [ ] API key 支持细粒度作用域：`operator.admin`、`operator.read`、`operator.write`、`operator.approvals`、`operator.pairing`
- [ ] Key 在存储前使用 SHA-256 哈希——明文仅在创建时显示一次
- [ ] 建立 key 轮换策略——可单独吊销 key 而不影响其他 key

```json
// 示例：创建只读监控 key
// 通过仪表盘或 API
{
  "name": "monitoring-readonly",
  "scopes": ["operator.read"]
}
```

---

## 10. 并发调优

GoClaw 使用基于 lane 的调度来按类型限制并发 agent 运行：

| 环境变量 | 默认值 | 用途 |
|---------------------|---------|---------|
| `GOCLAW_LANE_MAIN` | `30` | 最大并发主 agent 运行数 |
| `GOCLAW_LANE_SUBAGENT` | `50` | 最大并发子 agent 运行数 |
| `GOCLAW_LANE_DELEGATE` | `100` | 最大并发委托运行数 |
| `GOCLAW_LANE_CRON` | `30` | 最大并发定时任务运行数 |

根据服务器资源和预期负载调整这些值。较低的值减少内存压力；较高的值提高吞吐量。

---

## 11. Gateway 调优

检查以下 gateway 设置：

| 设置 | 默认值 | 说明 |
|---------|---------|-------------|
| `gateway.owner_ids` | `[]` | 拥有 owner 级别访问权的用户 ID——保持最小化 |
| `gateway.max_message_chars` | `32000` | 截断前的最大用户消息大小 |
| `gateway.inbound_debounce_ms` | `1000` | 合并快速连续消息（毫秒） |
| `gateway.task_recovery_interval_sec` | `300` | 检查团队任务恢复的间隔 |

- [ ] `gateway.owner_ids` 只包含受信任的管理员用户 ID
- [ ] `gateway.max_message_chars` 适合你的使用场景（较低 = 较少 token 消耗）

---

## 快速验证

### 首次设置

对于新安装，`onboard` 命令以交互方式处理初始设置：

```bash
./goclaw onboard
```

它生成加密和 gateway token、运行数据库迁移，并引导你完成基本配置。也可运行 `prepare-env.sh` 进行非交互式密钥生成。

### 系统健康检查

`doctor` 命令对你的环境进行全面检查：

```bash
./goclaw doctor
```

验证内容：运行时信息、配置文件、数据库连接和 schema 版本、provider API key、channel 凭证、外部工具（docker、curl、git）和工作区目录。

```bash
# 检查 schema 和待执行的迁移
./goclaw upgrade --status

# 验证 gateway 启动并连接到 DB
./goclaw &
curl http://localhost:18790/health

# 确认密钥未出现在日志中
# 查找 "***" 掩码，而非原始 key 值
```

## 常见问题

| 问题 | 可能原因 | 解决方案 |
|-------|-------------|-----|
| Gateway 拒绝启动 | Schema 已过期 | 运行 `./goclaw upgrade` |
| 加密 API key 无法读取 | `GOCLAW_ENCRYPTION_KEY` 错误 | 从备份中恢复正确的 key |
| WebSocket 连接被拒绝 | `allowed_origins` 过于严格 | 将仪表盘来源添加到列表 |
| 速率限制过于激进 | 高流量场景下默认 20 RPM | 增大 `gateway.rate_limit_rpm` |
| Agent 逃出工作区 | `restrict_to_workspace` 被禁用 | 在配置中设为 `true` |

## 下一步

- [升级](#deploy-upgrading) — 安全升级 GoClaw
- [可观测性](#deploy-observability) — 设置链路追踪和告警
- [安全加固](#deploy-security) — 更深入的安全配置
- [Docker Compose 设置](#deploy-docker-compose) — 生产 compose 模式

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
