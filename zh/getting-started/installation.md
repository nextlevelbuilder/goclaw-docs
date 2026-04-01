> 翻译自 [English version](/installation)

# 安装

> 几分钟内在你的机器上运行 GoClaw。四种方式：快速二进制安装、裸机安装、Docker（本地）或 VPS 上的 Docker。

## 概述

GoClaw 编译为单个静态二进制文件（~25 MB）。选择适合你的方式：

| 方式 | 适合场景 | 所需条件 |
|------|----------|----------|
| 快速安装（二进制） | Linux/macOS 上最快的单命令安装 | curl、PostgreSQL |
| 裸机安装 | 需要完全控制的开发者 | Go 1.26+、PostgreSQL 15+ 含 pgvector |
| **Docker（本地）⭐** | **通过 Docker Compose 运行所有内容（推荐）** | **Docker + Docker Compose，2 GB+ 内存** |
| VPS（生产环境） | 自托管生产部署 | VPS $5+、Docker、2 GB+ 内存 |

---

## 方式一：快速安装（二进制）

一条命令下载并安装最新预构建的 GoClaw 二进制文件，无需 Go 工具链。

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash
```

**支持平台：** Linux 和 macOS，`amd64` 和 `arm64` 均支持。

**选项：**

```bash
# 安装特定版本
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --version v1.30.0

# 安装到自定义目录（默认：/usr/local/bin）
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash -s -- --dir /opt/goclaw
```

脚本自动检测你的操作系统和架构，从 GitHub 下载对应的发布包，并安装二进制文件。如果目标目录不可写，会自动使用 `sudo`。

### 安装后：设置 PostgreSQL

```bash
# 启动带 pgvector 的 PostgreSQL 实例（Docker 是最简单的方式）
docker run -d --name goclaw-pg \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=goclaw \
  pgvector/pgvector:pg18
```

### 运行设置向导

```bash
export GOCLAW_POSTGRES_DSN='postgres://postgres:goclaw@localhost:5432/postgres?sslmode=disable'
goclaw onboard
```

向导会运行迁移、生成密钥，并将所有内容保存到 `.env.local`。

```bash
source .env.local && goclaw
```

### 打开 Dashboard

预构建二进制文件已内嵌 Web UI——dashboard 直接在 gateway 端口提供服务，无需单独运行 UI 进程。

打开 `http://localhost:18790` 并登录：
- **用户 ID：** `system`
- **Gateway Token：** 在 `.env.local` 中查找（找 `GOCLAW_GATEWAY_TOKEN`）

登录后，按照[快速开始](/quick-start)指南添加 LLM provider、创建第一个 agent 并开始聊天。

<details>
<summary><strong>替代方案：单独运行 dashboard UI</strong></summary>

如果需要将 dashboard 作为独立开发服务器运行（例如进行 UI 开发），克隆仓库并运行：

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw/ui/web
cp .env.example .env    # 必须——配置后端连接
pnpm install
pnpm dev
```

Dashboard 将在 `http://localhost:5173` 可用。

</details>

> **提示：** 若想要最简单的一体化体验（gateway + 数据库 + dashboard），考虑使用[方式三：Docker（本地）](#方式三docker本地)。

---

## 方式二：裸机安装

直接在你的机器上安装 GoClaw。你自己管理 Go、PostgreSQL 和二进制文件。

### 第一步：安装 PostgreSQL + pgvector

GoClaw 需要 **PostgreSQL 15+** 和 **pgvector** 扩展（用于记忆和 skills 中的向量相似度搜索）。Docker 部署使用 **PostgreSQL 18** 含 pgvector（`pgvector/pgvector:pg18` 镜像）。

<details>
<summary><strong>Ubuntu 24.04+ / Debian 12+</strong></summary>

```bash
sudo apt update
sudo apt install -y postgresql postgresql-common

# 安装 pgvector（将 17 替换为你的 PG 版本——通过 pg_config --version 查看）
sudo apt install -y postgresql-17-pgvector

# 创建数据库并启用扩展
sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> **注意：** Ubuntu 22.04 及更早版本自带 PostgreSQL 14，不受支持。请升级到 Ubuntu 24.04+ 或使用 Docker 安装方式。

</details>

<details>
<summary><strong>macOS（Homebrew）</strong></summary>

```bash
brew install postgresql pgvector
brew services start postgresql
createdb goclaw
psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

<details>
<summary><strong>Fedora / RHEL</strong></summary>

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo dnf install -y postgresql-devel git make gcc
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

sudo -u postgres createdb goclaw
sudo -u postgres psql -d goclaw -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

</details>

**验证安装：**

```bash
psql -d goclaw -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
# 应显示：vector | 0.x.x
```

> 在 Linux 上，如果你的用户没有直接数据库访问权限，请在命令前加 `sudo -u postgres`。

### 第二步：克隆并构建

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw
go build -o goclaw .
./goclaw version
```

> **Python 运行时（可选）：** 部分内置 skills 需要 Python 3。如需使用这些 skills，可通过 `sudo apt install -y python3 python3-pip`（Ubuntu/Debian）或 `brew install python`（macOS）安装。

**构建标签（可选）：** 在编译时启用额外功能：

```bash
go build -tags embedui -o goclaw .           # 将 Web UI 内嵌到二进制文件（在 gateway 端口提供 dashboard）
go build -tags otel -o goclaw .              # OpenTelemetry tracing
go build -tags tsnet -o goclaw .             # Tailscale 网络
go build -tags redis -o goclaw .             # Redis 缓存
go build -tags "otel,tsnet" -o goclaw .      # 组合多个
```

### 第三步：运行设置向导

```bash
./goclaw onboard
```

向导引导你完成：
1. **数据库连接** — 输入主机、端口、数据库名、用户名、密码（典型本地 PostgreSQL 默认值可直接使用）
2. **连接测试** — 验证 PostgreSQL 可访问
3. **迁移** — 自动创建所有必需的表
4. **密钥生成** — 自动生成 `GOCLAW_GATEWAY_TOKEN` 和 `GOCLAW_ENCRYPTION_KEY`
5. **保存密钥** — 将所有内容写入 `.env.local`

### 第四步：启动 Gateway

```bash
source .env.local && ./goclaw
```

### 第五步：打开 Dashboard

如果使用 `embedui` 标签构建，dashboard 直接在 `http://localhost:18790` 提供服务。登录凭据：
- **用户 ID：** `system`
- **Gateway Token：** 在 `.env.local` 中查找（找 `GOCLAW_GATEWAY_TOKEN`）

未使用 `embedui` 时，在新终端中将 dashboard 作为独立 React 开发服务器运行：

```bash
cd ui/web
cp .env.example .env    # 必须——配置后端连接
pnpm install
pnpm dev
```

打开 `http://localhost:5173`，使用上述相同凭据登录。

登录后，按照[快速开始](/quick-start)指南添加 LLM provider、创建第一个 agent 并开始聊天。

---

## 方式三：Docker（本地）

使用 Docker Compose 运行 GoClaw——包含 PostgreSQL 和 Web dashboard。这是**大多数用户的推荐方式**。

> **注意：** 此方式通过 `docker-compose.postgres.yml` 自动包含 PostgreSQL，无需单独安装。

> **最低内存：** 2 GB。Gateway、PostgreSQL 和 dashboard 容器空闲时合计使用约 1.2 GB。

### 第一步：克隆并配置

```bash
git clone https://github.com/nextlevelbuilder/goclaw.git
cd goclaw

# 自动生成加密密钥和 gateway token
./prepare-env.sh
```

可以现在在 `.env` 中添加 LLM provider API key（也可以稍后通过 dashboard 添加）：

```env
GOCLAW_OPENROUTER_API_KEY=sk-or-xxxxx
# 或 GOCLAW_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

> **注意：** Docker 方式**无需**运行 `goclaw onboard`——onboard 向导仅用于裸机安装。Docker 从 `.env` 读取所有配置，并在启动时自动运行迁移。

### 第二步：启动服务

GoClaw 使用模块化的 Docker Compose 文件：
- `docker-compose.yml` — 核心 GoClaw gateway 和 API 服务器（默认已内嵌 Web UI）
- `docker-compose.postgres.yml` — 带 pgvector 扩展的 PostgreSQL 数据库
- `docker-compose.selfservice.yml` — 可选：nginx 反向代理 + 独立 UI 容器（端口 3000）

默认 `docker-compose.yml` 设置 `ENABLE_EMBEDUI: true`，dashboard 直接在 gateway 端口（`http://localhost:18790`）提供服务。完整本地设置只需两个文件：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

这将启动：
- **GoClaw gateway + 内嵌 dashboard** — `http://localhost:18790`
- **PostgreSQL** 含 pgvector — 端口 `5432`

GoClaw 每次启动时自动运行待处理的数据库迁移，无需手动运行 `goclaw onboard` 或 `goclaw migrate`。

打开 `http://localhost:18790` 并登录：
- **用户 ID：** `system`
- **Gateway Token：** 在 `.env` 中查找（找 `GOCLAW_GATEWAY_TOKEN`）

登录后，按照[快速开始](/quick-start)指南添加 LLM provider、创建第一个 agent 并开始聊天。

<details>
<summary><strong>可选：nginx + 独立 UI（selfservice）</strong></summary>

如果需要在端口 3000 运行独立 UI 容器（例如使用 nginx 反向代理并分离 UI 端口），添加 selfservice overlay：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml \
  up -d --build
```

Dashboard 将在 `http://localhost:3000` 可用。

</details>

### 可选附加组件

通过 Docker Compose overlay 文件添加更多功能：

| Overlay 文件 | 功能 |
|---|---|
| `docker-compose.sandbox.yml` | 用于隔离脚本执行的代码沙箱 |
| `docker-compose.tailscale.yml` | 通过 Tailscale 进行安全远程访问 |
| `docker-compose.otel.yml` | OpenTelemetry tracing（Jaeger UI 在 `:16686`） |
| `docker-compose.redis.yml` | Redis 缓存层 |
| `docker-compose.browser.yml` | 浏览器自动化（Chrome sidecar） |
| `docker-compose.upgrade.yml` | 数据库升级服务 |

启动服务时用 `-f` 追加任意 overlay：

```bash
# 示例：添加 Redis 缓存
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.redis.yml \
  up -d --build
```

> **注意：** Redis 和 OTel overlay 需要使用对应的构建参数重新构建 GoClaw 镜像（`ENABLE_REDIS=true`、`ENABLE_OTEL=true`）。设置 `ENABLE_EMBEDUI=false` 可禁用内嵌 UI（例如使用 selfservice nginx overlay 时）。详见各 overlay 文件。

> **Python 运行时：** 默认 `docker-compose.yml` 使用 `ENABLE_PYTHON: "true"` 构建 GoClaw，因此基于 Python 的 skills 在 Docker 中开箱即用。

---

## 方式四：VPS（生产环境）

在 VPS 上使用 Docker 部署 GoClaw，适合长期在线、可互联网访问的场景。

> **注意：** PostgreSQL 运行在 Docker 内部，compose 文件处理设置——无需在 VPS 系统上安装 PostgreSQL。

### 需求

- **VPS**：1 vCPU，**最低 2 GB 内存**（$6 套餐）。较重负载推荐 2 vCPU / 4 GB。
- **操作系统**：Ubuntu 24.04+ 或 Debian 12+
- **域名**（可选）：通过反向代理配置 HTTPS/SSL

### 第一步：服务器设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker（官方脚本——包含 Compose 插件）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 注销并重新登录以使组变更生效
```

### 第二步：防火墙

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable
```

### 第三步：创建工作目录并克隆

```bash
sudo mkdir -p /opt/goclaw
sudo chown $(whoami):$(whoami) /opt/goclaw
git clone https://github.com/nextlevelbuilder/goclaw.git /opt/goclaw
cd /opt/goclaw

# 自动生成密钥
./prepare-env.sh
```

### 第四步：启动服务

默认 compose 已内嵌 Web UI，生产环境完整部署只需两个文件：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

GoClaw 每次启动时自动运行待处理的数据库迁移，无需手动运行 `goclaw onboard` 或 `goclaw migrate`。

Dashboard 在 `http://localhost:18790` 可用。

> **可选：** 如需使用 nginx + 独立 UI 容器（端口 3000），添加 `-f docker-compose.selfservice.yml`。详见方式三的[可选：nginx + 独立 UI](#可选nginx--独立-ui-selfservice)部分。

### 第四步（附）：验证服务已启动

设置反向代理前，确认所有服务正在运行：

```bash
docker compose ps
# 所有服务应显示为 "Up"

docker compose logs goclaw | grep "gateway starting"
# 应看到：goclaw gateway starting
```

### 第五步：配置反向代理和 SSL

**DNS 设置：** 创建 A 记录指向你的 VPS IP：

| 记录 | 类型 | 值 |
|------|------|-----|
| `yourdomain.com` | A | `YOUR_VPS_IP` |

**Caddy（推荐）：**

```bash
sudo apt install -y caddy
```

创建 `/etc/caddy/Caddyfile`：

```
yourdomain.com {
    reverse_proxy localhost:18790
}
```

> **注意：** 默认启用 `ENABLE_EMBEDUI: true` 时，dashboard 和 API/WebSocket 均通过同一端口（`18790`）提供服务。如果使用 `docker-compose.selfservice.yml`，将 dashboard 域名指向 `localhost:3000`。

```bash
sudo systemctl reload caddy
```

Caddy 通过 Let's Encrypt 自动申请 SSL 证书。

**Nginx：**

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

创建 `/etc/nginx/sites-available/goclaw`：

```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

> **注意：** 默认启用 `ENABLE_EMBEDUI: true` 时，所有流量（dashboard + API + WebSocket）均通过同一 gateway 端口。如果使用 `docker-compose.selfservice.yml`，需为 UI 单独配置指向 `localhost:3000` 的 server block，WebSocket gateway 仍指向 `localhost:18790`。

```bash
sudo ln -s /etc/nginx/sites-available/goclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

### 第六步：备份（推荐）

添加每日 PostgreSQL 备份 cron 任务：

```bash
sudo mkdir -p /backup
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/goclaw && docker compose -f docker-compose.yml -f docker-compose.postgres.yml exec -T postgres pg_dump -U goclaw goclaw | gzip > /backup/goclaw-\$(date +\%Y\%m\%d).sql.gz") | crontab -
```

---

## 更新到最新版本

已经在运行 GoClaw 并想升级？按照你的安装方式执行相应步骤。

### 方式一：快速安装（二进制）

重新运行安装脚本——它会下载最新版本并覆盖现有二进制文件：

```bash
curl -fsSL https://raw.githubusercontent.com/nextlevelbuilder/goclaw/main/scripts/install.sh | bash
```

然后升级数据库 schema：

```bash
source .env.local && goclaw upgrade
```

> **提示：** 先运行 `goclaw upgrade --status` 检查是否需要升级 schema，或 `goclaw upgrade --dry-run` 预览变更。

### 方式二：裸机安装

```bash
cd goclaw
git pull origin main
go build -o goclaw .
./goclaw upgrade
```

`goclaw upgrade` 命令执行待处理的 SQL 迁移和 data hooks。可安全多次运行（幂等）。

### 方式三和四：Docker（本地 / VPS）

```bash
cd /path/to/goclaw     # VPS 上为 /opt/goclaw
git pull origin main
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  up -d --build
```

GoClaw 启动时自动运行待处理的迁移——无需手动执行 `goclaw upgrade`。

**替代方案：使用 upgrade overlay** 在不重启 gateway 的情况下一次性升级数据库：

```bash
# 预览变更
docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml run --rm upgrade --dry-run

# 执行升级
docker compose -f docker-compose.yml -f docker-compose.postgres.yml \
  -f docker-compose.upgrade.yml run --rm upgrade
```

### 启动时自动升级

设置 `GOCLAW_AUTO_UPGRADE` 环境变量，在 gateway 启动时自动运行迁移——适用于 CI/CD 和 Docker 部署：

```bash
# .env 或 .env.local
GOCLAW_AUTO_UPGRADE=true
```

启用后，GoClaw 在启动过程中自动执行待处理的 SQL 迁移和 data hooks。如果你希望手动控制，不设置此变量，自行运行 `goclaw upgrade`。

### 升级故障排除

| 问题 | 解决方案 |
|------|----------|
| `database schema is dirty` | 之前的迁移失败。运行 `goclaw migrate force <version-1>` 然后 `goclaw upgrade` |
| `schema is newer than this binary` | 二进制文件比数据库旧，先更新二进制文件 |
| 启动 gateway 时显示 `UPGRADE NEEDED` | 运行 `goclaw upgrade` 或设置 `GOCLAW_AUTO_UPGRADE=true` |

---

## 验证安装

适用于所有方式：

```bash
# 健康检查
curl http://localhost:18790/health
# 预期：{"status":"ok"}

# Docker 日志（Docker/VPS 方式）
docker compose logs goclaw
# 查找：goclaw gateway starting

# 诊断检查（裸机）
./goclaw doctor
```

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `go: module requires Go >= 1.26` | 更新 Go：`go install golang.org/dl/go1.26@latest` |
| `pgvector extension not found` | 在你的 goclaw 数据库中运行 `CREATE EXTENSION vector;` |
| 端口 18790 已被占用 | 在 `.env`（Docker）或 `.env.local`（裸机）中设置 `GOCLAW_PORT=18791` |
| ARM Mac 上 Docker 构建失败 | 在 Docker Desktop 设置中启用 Rosetta |
| `no provider API key found` | 通过 Dashboard 添加 LLM provider 和 API key |
| `encryption key not set` | 运行 `./goclaw onboard`（裸机）或 `./prepare-env.sh`（Docker） |
| `Cannot connect to the Docker daemon` | 先启动 Docker Desktop：`open -a Docker`（macOS）或 `sudo systemctl start docker`（Linux） |

## 下一步

- [快速开始](/quick-start) — 运行你的第一个 agent
- [配置](/configuration) — 自定义 GoClaw 设置

<!-- goclaw-source: c388364d | 更新: 2026-04-01 -->
