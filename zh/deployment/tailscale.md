> 翻译自 [English version](#deploy-tailscale)

# Tailscale 集成

> 在 Tailscale 网络上安全暴露 GoClaw gateway——无需端口转发，无需公网 IP。

## 概览

GoClaw 可以作为命名节点加入你的 [Tailscale](https://tailscale.com) 网络，使 gateway 无需开放防火墙端口即可从任何设备访问。这对于希望从笔记本、手机或 CI runner 进行私有远程访问的自托管场景非常理想。

Tailscale 监听器与常规 HTTP 监听器**并行**运行在同一处理器上——你可以同时通过本地和 Tailscale 访问。

此功能为可选项，只有在构建时加入 `-tags tsnet` 才会编译进来。默认二进制没有任何 Tailscale 依赖。

## 工作原理

```mermaid
graph LR
    A[你的笔记本] -->|Tailscale 网络| B[goclaw-gateway 节点]
    C[你的手机] -->|Tailscale 网络| B
    B --> D[Gateway 处理器]
    E[本地网络] -->|端口 18790| D
```

当 `GOCLAW_TSNET_HOSTNAME` 被设置时，GoClaw 启动一个 `tsnet.Server` 连接到 Tailscale，并在端口 80（或使用 TLS 时 443）上监听。Tailscale 节点在你的 Tailscale 管理控制台中显示为普通设备。

## 构建时启用 Tailscale 支持

```bash
go build -tags tsnet -o goclaw .
```

或使用 Docker Compose 的提供 overlay：

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.tailscale.yml \
  up
```

Overlay 传入构建参数 `ENABLE_TSNET: "true"`，使二进制以 `-tags tsnet` 编译。

## 配置

### 必填

```bash
# 来自 https://login.tailscale.com/admin/settings/keys
# 长期部署建议使用可复用的 auth key
export GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
```

### 可选

```bash
# Tailscale 设备名（默认：goclaw-gateway）
export GOCLAW_TSNET_HOSTNAME=my-goclaw

# Tailscale 状态目录（跨重启持久化）
# 默认：操作系统用户配置目录
export GOCLAW_TSNET_DIR=/app/tsnet-state
```

或通过 `config.json`（auth key **永远不**存储在配置文件中——仅通过环境变量）：

```json
{
  "tailscale": {
    "hostname": "my-goclaw",
    "state_dir": "/app/tsnet-state",
    "ephemeral": false,
    "enable_tls": false
  }
}
```

| 字段 | 默认值 | 说明 |
|-------|---------|-------------|
| `hostname` | `goclaw-gateway` | Tailscale 设备名 |
| `state_dir` | 操作系统用户配置目录 | 跨重启持久化 Tailscale 身份 |
| `ephemeral` | `false` | 若为 true，GoClaw 停止时自动从 tailnet 移除节点——适用于 CI/CD 或短期容器 |
| `enable_tls` | `false` | 通过 Let's Encrypt 使用 Tailscale 托管的 HTTPS 证书（监听 `:443` 而非 `:80`） |

## Docker Compose 设置

`docker-compose.tailscale.yml` overlay 挂载命名卷保存 Tailscale 状态，使节点身份在容器重启后继续存在：

```yaml
# docker-compose.tailscale.yml（完整文件）
services:
  goclaw:
    build:
      args:
        ENABLE_TSNET: "true"
    environment:
      - GOCLAW_TSNET_HOSTNAME=${GOCLAW_TSNET_HOSTNAME:-goclaw-gateway}
      - GOCLAW_TSNET_AUTH_KEY=${GOCLAW_TSNET_AUTH_KEY}
    volumes:
      - tsnet-state:/app/tsnet-state

volumes:
  tsnet-state:
```

在 `.env` 中设置 auth key：

```bash
GOCLAW_TSNET_AUTH_KEY=tskey-auth-xxxxxxxxxxxxxxxx
GOCLAW_TSNET_HOSTNAME=my-goclaw
```

然后启动：

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.tailscale.yml up -d
```

## 访问 Gateway

启动后，你的 gateway 可通过以下地址访问：

```
http://my-goclaw.your-tailnet.ts.net     # HTTP（默认）
https://my-goclaw.your-tailnet.ts.net    # HTTPS（如果 enable_tls: true）
```

完整主机名可在 [Tailscale 管理控制台](https://login.tailscale.com/admin/machines) 中查看。

## 常见问题

| 问题 | 可能原因 | 解决方案 |
|-------|-------------|-----|
| 节点未出现在 Tailscale 控制台 | Auth key 无效或已过期 | 在 admin/settings/keys 生成新的可复用 key |
| Tailscale 监听器未启动 | 二进制构建时未加 `-tags tsnet` | 使用 `go build -tags tsnet` 重新构建 |
| `GOCLAW_TSNET_HOSTNAME` 被忽略 | 构建时缺少标签 | 检查 docker 构建参数中的 `ENABLE_TSNET: "true"` |
| 容器重启后状态丢失 | 缺少卷挂载 | 确保 `tsnet-state` 卷挂载到 `state_dir` |
| 来自 Tailscale 的连接被拒绝 | `enable_tls` 不匹配 | 检查是否使用 HTTP 或 HTTPS |

## 下一步

- [生产检查清单](#deploy-checklist) — 端到端保护你的部署
- [安全加固](#deploy-security) — CORS、速率限制和 token 鉴权
- [Docker Compose 设置](#deploy-docker-compose) — 完整 compose overlay 参考

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
