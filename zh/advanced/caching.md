> 翻译自 [English version](/caching)

# 缓存

> 使用内存或 Redis 缓存频繁访问的数据，减少数据库查询。

## 概述

GoClaw 使用通用缓存层来减少重复的数据库查询。启动时创建三个缓存实例：

| 缓存实例 | Key 前缀 | 存储内容 |
|----------------|------------|----------------|
| `ctx:agent` | Agent 级上下文文件 | 每个 agent 的 `SOUL.md`、`IDENTITY.md` 等 |
| `ctx:user` | 用户级上下文文件 | 以 `agentID:userID` 为键的用户上下文文件 |
| `grp:writers` | 群组文件写入者列表 | 以 `agentID:groupID` 为键的写入权限列表 |

三个实例共享相同的 TTL：**5 分钟**。

两种后端可选：

| 后端 | 适用场景 |
|---------|-------------|
| **内存**（默认） | 单实例、开发环境、小型部署 |
| **Redis** | 多实例生产环境、跨副本共享缓存 |

两种后端均为**故障开放** — 缓存错误记录为警告，但不阻塞操作。缓存未命中仅意味着操作继续进行新的数据库查询。

---

## 内存缓存

默认缓存 — 无需任何配置。使用带有基于 TTL 过期的线程安全 `sync.Map`。

- 读取时检查条目；过期条目在访问时惰性删除
- 无后台清理 goroutine — 清理仅在 `Get` 和 `Delete` 调用时发生
- 重启时缓存丢失

适合不需要缓存持久化的单实例部署。

---

## Redis 缓存

使用 `redis` 构建标签编译 GoClaw 并设置 `GOCLAW_REDIS_DSN` 来启用 Redis 缓存。

```bash
go build -tags redis ./...
export GOCLAW_REDIS_DSN="redis://localhost:6379/0"
```

如果 `GOCLAW_REDIS_DSN` 未设置或启动时连接失败，GoClaw 自动回退到内存缓存。

**Key 格式：** `goclaw:{prefix}:{key}`

例如，agent 上下文文件条目存储为 `goclaw:ctx:agent:<agentUUID>`。

**连接设置：**
- 连接池大小：10
- 最小空闲连接：2
- 连接超时：5s
- 读取超时：3s
- 写入超时：3s
- 健康检查：启动时 PING

**DSN 格式：**
```
redis://localhost:6379/0
redis://:password@redis.example.com:6379/1
```

值以 JSON 序列化。模式删除使用 SCAN，每次迭代批量处理 100 个 key。

---

## 权限缓存

GoClaw 包含一个专用的 `PermissionCache`，用于每次请求都会发生的热点权限查询。与 context 文件缓存不同，权限缓存始终在内存中——不使用 Redis。

| 缓存 | TTL | Key 格式 | 缓存内容 |
|---|---|---|---|
| `tenantRole` | 30s | `tenantID:userID` | 用户在 tenant 中的角色 |
| `agentAccess` | 30s | `agentID:userID` | 用户是否可以访问某 agent 及其角色 |
| `teamAccess` | 30s | `teamID:userID` | 用户是否可以访问某 team |

**通过 pubsub 失效**：当用户权限发生变化时（如角色更新、agent 访问被撤销），GoClaw 在内部总线上发布 `CacheInvalidate` 事件。权限缓存处理这些事件：

- `CacheKindTenantUsers` — 清除所有 tenant 角色条目（短 TTL 使完全清除可接受）
- `CacheKindAgentAccess` — 删除该 `agentID` 前缀的所有条目
- `CacheKindTeamAccess` — 删除该 `teamID` 前缀的所有条目

权限变更最多在 30 秒内生效，写入路径上立即失效。

---

## 缓存行为

两种后端实现相同的接口：

| 操作 | 行为 |
|-----------|----------|
| `Get` | 返回值和是否找到的标志；对于内存缓存，读取时删除过期条目 |
| `Set` | 以 TTL 存储值；TTL 为 `0` 表示条目永不过期 |
| `Delete` | 删除单个 key |
| `DeleteByPrefix` | 删除匹配前缀的所有 key（内存：范围扫描；Redis：SCAN + DEL） |
| `Clear` | 删除缓存实例 key 前缀下的所有条目 |

**错误处理：** 所有 Redis 错误视为缓存未命中。连接失败、序列化错误和超时均被记录但不传播给调用者。

---

## 下一步

- [数据库设置](/deploy-database) — PostgreSQL 配置
- [生产部署清单](/deploy-checklist) — 自信部署

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
