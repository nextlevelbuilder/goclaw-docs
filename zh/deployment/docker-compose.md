> 翻译自 [English version](/deploy-docker-compose)

# Docker Compose 部署

> GoClaw 提供 9 个 compose 文件——一个基础文件加 8 个可按需组合的 overlay。

> **启动时自动升级：** Docker 入口点在启动 gateway 前会自动运行 `goclaw upgrade`，应用待执行的数据库迁移，无需单独执行升级步骤。生产环境建议显式先运行 upgrade overlay。

## 概览

compose 配置是模块化的。始终以 `docker-compose.yml`（基础）为起点，通过 `-f` 叠加 overlay。每个 overlay 只扩展或覆盖必要的部分。

```
docker-compose.yml            # 基础：goclaw 二进制、端口、卷、安全加固
docker-compose.postgres.yml   # PostgreSQL 18 + pgvector
docker-compose.selfservice.yml # Web 仪表盘 UI（nginx + React，端口 3000）
docker-compose.sandbox.yml    # Docker-in-Docker 沙盒（用于 agent 代码执行）
docker-compose.browser.yml    # Headless Chrome sidecar（CDP，端口 9222）
docker-compose.otel.yml       # Jaeger（OpenTelemetry 链路追踪可视化）
docker-compose.tailscale.yml  # Tailscale tsnet（安全远程访问）
docker-compose.redis.yml      # Redis 7 缓存后端（可选）
docker-compose.upgrade.yml    # 一次性 DB 迁移运行器
```

---

## 使用方式

### 首次设置

运行环境准备脚本自动生成所需密钥：

```bash
./prepare-env.sh
```

此命令从 `.env.example` 创建 `.env`，并在未设置时生成 `GOCLAW_ENCRYPTION_KEY` 和 `GOCLAW_GATEWAY_TOKEN`。

可在 `.env` 中添加 LLM provider API key，或之后通过 Web 仪表盘添加：

```env
GOCLAW_OPENROUTER_API_KEY=sk-or-xxxxx
# 或 GOCLAW_ANTHROPIC_API_KEY=sk-ant-xxxxx
# 或其他 GOCLAW_*_API_KEY
```

> **Docker vs 裸机：** 在 Docker 中，通过 `.env` 或启动后的 Web 仪表盘配置 provider。`goclaw onboard` 向导仅适用于裸机——需要交互式终端，不在容器内运行。

### 必填与可选 `.env` 变量（Docker）

| 变量 | 是否必填 | 说明 |
|----------|----------|-------|
| `GOCLAW_GATEWAY_TOKEN` | 是 | 由 `prepare-env.sh` 自动生成 |
| `GOCLAW_ENCRYPTION_KEY` | 是 | 由 `prepare-env.sh` 自动生成 |
| `GOCLAW_*_API_KEY` | 否 | LLM provider key——在 `.env` 中设置或通过仪表盘添加。聊天前必须配置 |
| `GOCLAW_AUTO_UPGRADE` | 推荐 | 设为 `true` 以在启动时自动执行 DB 迁移 |
| `POSTGRES_USER` | 否 | 默认：`goclaw` |
| `POSTGRES_PASSWORD` | 否 | 默认：`goclaw`——**生产环境请修改** |

> **重要：** 所有 `GOCLAW_*` 环境变量必须写在 `.env` 文件中，不能作为 shell 前缀传入（例如 `GOCLAW_AUTO_UPGRADE=true docker compose …` **不起效**，因为 compose 从 `env_file` 读取）。

### 最小化——仅核心 + PostgreSQL

无仪表盘，无沙盒。适用于无头/仅 API 部署。

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

### 标准——+ 仪表盘 + 沙盒

大多数自托管场景的推荐起点。

```bash
# 1. 首先构建沙盒镜像（仅需一次）
docker build -t goclaw-sandbox:bookworm-slim -f Dockerfile.sandbox .

# 2. 启动服务栈
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  up -d --build
```

仪表盘：[http://localhost:3000](http://localhost:3000)

### 标准 + 浏览器自动化

添加 headless Chrome sidecar 用于浏览器工具。

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.browser.yml \
  up -d --build
```

### 完整——包含 OTel 链路追踪

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  -f docker-compose.sandbox.yml \
  -f docker-compose.otel.yml \
  up -d --build
```

Jaeger UI：[http://localhost:16686](http://localhost:16686)

---

## Overlay 参考

### `docker-compose.postgres.yml`

启动 `pgvector/pgvector:pg18` 并自动配置 `GOCLAW_POSTGRES_DSN`。GoClaw 在健康检查通过后才启动。

环境变量（在 `.env` 或 shell 中设置）：

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `POSTGRES_USER` | `goclaw` | 数据库用户 |
| `POSTGRES_PASSWORD` | `goclaw` | 数据库密码——**生产环境请修改** |
| `POSTGRES_DB` | `goclaw` | 数据库名 |
| `POSTGRES_PORT` | `5432` | 对外暴露的主机端口 |

### `docker-compose.selfservice.yml`

从 `ui/web/` 构建 React SPA，通过 nginx 在端口 3000 提供服务。

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `GOCLAW_UI_PORT` | `3000` | 仪表盘主机端口 |

### `docker-compose.sandbox.yml`

挂载 `/var/run/docker.sock`，使 GoClaw 能为 agent shell 执行启动隔离容器。需先构建沙盒镜像。

> **安全注意：** 挂载 Docker socket 使容器可以控制宿主机 Docker。仅在可信环境中使用。

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `GOCLAW_SANDBOX_MODE` | `all` | `off`、`non-main` 或 `all` |
| `GOCLAW_SANDBOX_IMAGE` | `goclaw-sandbox:bookworm-slim` | 沙盒容器使用的镜像 |
| `GOCLAW_SANDBOX_WORKSPACE_ACCESS` | `rw` | `none`、`ro` 或 `rw` |
| `GOCLAW_SANDBOX_SCOPE` | `session` | `session`、`agent` 或 `shared` |
| `GOCLAW_SANDBOX_MEMORY_MB` | `512` | 每个沙盒容器的内存限制 |
| `GOCLAW_SANDBOX_CPUS` | `1.0` | 每个沙盒容器的 CPU 限制 |
| `GOCLAW_SANDBOX_TIMEOUT_SEC` | `300` | 最大执行时间（秒） |
| `GOCLAW_SANDBOX_NETWORK` | `false` | 是否允许沙盒访问网络 |
| `DOCKER_GID` | `999` | 宿主机 `docker` 组的 GID |

### `docker-compose.browser.yml`

启动 `zenika/alpine-chrome:124`，在端口 9222 启用 CDP。GoClaw 通过 `GOCLAW_BROWSER_REMOTE_URL=ws://chrome:9222` 连接。

### `docker-compose.otel.yml`

启动 Jaeger（`jaegertracing/all-in-one:1.68.0`），并使用构建参数 `ENABLE_OTEL=true` 重新构建 GoClaw 以包含 OTel exporter。

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `GOCLAW_TELEMETRY_ENABLED` | `true` | 启用 OTel 导出 |
| `GOCLAW_TELEMETRY_ENDPOINT` | `jaeger:4317` | OTLP gRPC 端点 |
| `GOCLAW_TELEMETRY_PROTOCOL` | `grpc` | `grpc` 或 `http` |
| `GOCLAW_TELEMETRY_SERVICE_NAME` | `goclaw-gateway` | 链路追踪中的服务名 |

### `docker-compose.tailscale.yml`

使用 `ENABLE_TSNET=true` 重新构建，将 Tailscale 直接内嵌到二进制中（无需 sidecar）。

| 变量 | 是否必填 | 说明 |
|----------|----------|-------------|
| `GOCLAW_TSNET_AUTH_KEY` | 是 | 来自管理控制台的 Tailscale auth key |
| `GOCLAW_TSNET_HOSTNAME` | 否（默认：`goclaw-gateway`） | tailnet 上的设备名 |

### `docker-compose.redis.yml`

使用 `ENABLE_REDIS=true` 重新构建 GoClaw，并启动启用了 AOF 持久化的 Redis 7 Alpine 实例。

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `GOCLAW_REDIS_DSN` | `redis://redis:6379/0` | Redis 连接字符串（自动设置） |

构建参数：`ENABLE_REDIS=true`——编译时内置 Redis 缓存后端。

卷：`redis-data` → `/data`（AOF 持久化）。

### `docker-compose.upgrade.yml`

一次性服务，运行 `goclaw upgrade` 后退出。用于在不停机的情况下应用数据库迁移。

```bash
# 预览将要发生的变更（dry-run）
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --dry-run

# 执行升级
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# 查看迁移状态
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade --status
```

---

## 构建参数

这些是 `docker build` 时传入的编译时标志，每个标志启用一个可选依赖。

| 构建参数 | 默认值 | 效果 |
|-----------|---------|--------|
| `ENABLE_OTEL` | `false` | OpenTelemetry span exporter |
| `ENABLE_TSNET` | `false` | Tailscale 网络 |
| `ENABLE_REDIS` | `false` | Redis 缓存后端 |
| `ENABLE_SANDBOX` | `false` | 容器内 Docker CLI（用于沙盒） |
| `ENABLE_PYTHON` | `false` | Python 3 运行时（用于 skill） |
| `ENABLE_NODE` | `false` | Node.js 运行时（用于 skill） |
| `ENABLE_FULL_SKILLS` | `false` | 预安装 skill 依赖（pandas、pypdf 等） |
| `VERSION` | `dev` | 语义化版本字符串 |

---

## 卷

| 卷 | 挂载路径 | 内容 |
|--------|-----------|----------|
| `goclaw-data` | `/app/data` | `config.json` 和运行时数据 |
| `goclaw-workspace` | `/app/workspace` 或 `/app/.goclaw` | Agent 工作区 |
| `goclaw-skills` | `/app/skills` | Skill 文件 |
| `postgres-data` | `/var/lib/postgresql` | PostgreSQL 数据 |
| `tsnet-state` | `/app/tsnet-state` | Tailscale 节点状态 |
| `redis-data` | `/data` | Redis AOF 持久化 |

---

## 基础容器安全加固

基础 `docker-compose.yml` 为 `goclaw` 服务应用以下安全设置：

```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
read_only: true
tmpfs:
  - /tmp:rw,noexec,nosuid,size=256m
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '2.0'
      pids: 200
```

> sandbox overlay（`docker-compose.sandbox.yml`）会覆盖 `cap_drop` 和 `security_opt`，因为 Docker socket 访问需要放宽能力限制。

---

## 更新/升级流程

```bash
# 1. 拉取最新镜像/重建代码
docker compose -f docker-compose.yml -f docker-compose.postgres.yml pull

# 2. 在启动新二进制前执行 DB 迁移
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml \
  run --rm upgrade

# 3. 重启服务栈
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build
```

---

## 其他安装方式

### 二进制安装器（无 Docker）

直接下载最新二进制：

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash

# 指定版本
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --version v1.19.1

# 自定义目录
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --dir /opt/goclaw
```

支持 Linux 和 macOS（amd64 和 arm64）。

### 交互式 Docker 设置

安装脚本生成 `.env` 并构建合适的 compose 命令：

```bash
./scripts/setup-docker.sh              # 交互模式
./scripts/setup-docker.sh --variant full --with-ui   # 非交互模式
```

变体：`alpine`（基础）、`node`、`python`、`full`。添加 `--with-ui` 启用仪表盘，`--dev` 启用带热重载的开发模式。

---

## 预构建 Docker 镜像

官方多架构镜像（amd64 + arm64）在每次发布时同步推送到两个镜像仓库：

| 镜像仓库 | Gateway | Web 仪表盘 |
|----------|---------|--------------|
| Docker Hub | `digitop/goclaw` | `digitop/goclaw-web` |
| GHCR | `ghcr.io/nextlevelbuilder/goclaw` | `ghcr.io/nextlevelbuilder/goclaw-web` |

### 标签变体

镜像分为**运行时变体**（预装内容）和**构建标签变体**（编译特性）：

**运行时变体：**

| 标签 | Node.js | Python | Skill 依赖 | 适用场景 |
|-----|---------|--------|------------|----------|
| `latest` / `vX.Y.Z` | — | — | — | 最小基础（约 50 MB） |
| `node` / `vX.Y.Z-node` | ✓ | — | — | JS/TS skill |
| `python` / `vX.Y.Z-python` | — | ✓ | — | Python skill |
| `full` / `vX.Y.Z-full` | ✓ | ✓ | ✓ | 预装所有 skill 依赖 |

**构建标签变体：**

| 标签 | OTel | Tailscale | Redis | 适用场景 |
|-----|------|-----------|-------|----------|
| `otel` / `vX.Y.Z-otel` | ✓ | — | — | OpenTelemetry 链路追踪 |
| `tsnet` / `vX.Y.Z-tsnet` | — | ✓ | — | Tailscale 远程访问 |
| `redis` / `vX.Y.Z-redis` | — | — | ✓ | Redis 缓存 |

> **提示：** 运行时变体和构建标签变体相互独立。如需 Python + OTel，请使用 `ENABLE_PYTHON=true` 和 `ENABLE_OTEL=true` 在本地构建。

拉取示例：

```bash
# 最小基础镜像
docker pull digitop/goclaw:latest

# 带 Python 运行时
docker pull digitop/goclaw:python

# 完整运行时（Node + Python + 所有依赖）
docker pull digitop/goclaw:full

# 带 OTel 链路追踪
docker pull ghcr.io/nextlevelbuilder/goclaw:otel
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|---------|-------|-----|
| `goclaw` 启动后立即退出 | PostgreSQL 未就绪 | postgres overlay 添加了健康检查依赖；确保包含该 overlay |
| 沙盒容器无法启动 | Docker socket 未挂载或 GID 不匹配 | 添加 sandbox overlay 并将 `DOCKER_GID` 设为 `stat -c %g /var/run/docker.sock` 的值 |
| 仪表盘返回 502 | `goclaw` 服务尚未健康 | 检查 `docker compose logs goclaw`；仪表盘依赖 `goclaw` 正常运行 |
| OTel 链路追踪未出现在 Jaeger | 二进制构建时未添加 `ENABLE_OTEL=true` | 使用 otel overlay 时添加 `--build` 标志重新构建 |
| 端口 5432 已被占用 | 本地 Postgres 正在运行 | 在 `.env` 中设置 `POSTGRES_PORT=5433` |
| `database schema is outdated` | 更新后未执行迁移 | 将 `GOCLAW_AUTO_UPGRADE=true` 添加到 `.env` **文件**（不能作为 shell 前缀——compose 从 `env_file` 读取），或在启动前运行 upgrade overlay |
| `network goclaw-net … incorrect label` | 已存在标签冲突的 `goclaw-net` Docker 网络 | 运行 `docker network rm goclaw-net` 后重试——Compose 会自动创建 `goclaw-net` 网络 |

---

## 下一步

- [数据库设置](/deploy-database) — 手动 PostgreSQL 设置与迁移
- [安全加固](/deploy-security) — 五层安全防护概览
- [可观测性](/deploy-observability) — OpenTelemetry 和 Jaeger 配置
- [Tailscale](/deploy-tailscale) — 通过 Tailscale 实现安全远程访问

<!-- goclaw-source: 4d31fe0 | 更新: 2026-03-26 -->
