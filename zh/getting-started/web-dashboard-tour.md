> 翻译自 [English version](/dashboard-tour)

# Web Dashboard 导览

> GoClaw 管理 dashboard 的可视化指南。

## 概述

Web dashboard 提供了点击式界面，涵盖所有可通过配置文件完成的操作。它基于 React 构建，连接到 GoClaw 的 HTTP API。

## 访问 Dashboard

### 使用 Docker Compose

如果你使用 self-service overlay 启动，dashboard 已在运行：

```bash
docker compose -f docker-compose.yml \
  -f docker-compose.postgres.yml \
  -f docker-compose.selfservice.yml up -d --build
```

在浏览器中打开 `http://localhost:3000`。

### 从源码构建

```bash
cd ui/web
pnpm install
pnpm dev
# Dashboard 运行在 http://localhost:5173
```

生产环境：

```bash
pnpm build
# 用任意静态文件服务器提供 dist/ 目录
```

## Dashboard 侧边栏

Dashboard 在侧边栏中将功能分组组织。

### Core（核心）

#### Overview（概览）

全系统 dashboard，一目了然的关键指标。

#### Chat（聊天）

测试聊天界面——直接在浏览器中与任意 agent 交互。

#### Agents（Agent）

创建、编辑和删除 agent。每个 agent 卡片显示：
- 名称和模型
- Provider 和 temperature
- 工具访问权限
- 活跃 session 数量

点击 agent 打开其详情页，包含以下标签：
- **General** — Agent 元数据和基本信息
- **Config** — 模型、temperature、系统提示词、工具权限
- **Files** — 上下文文件（IDENTITY.md、USER.md 等）
- **Shares** — 跨租户共享 agent
- **Links** — 配置该 agent 可委托的其他 agent（权限、并发限制、交接规则）
- **Skills** — Agent 专属 skill 分配
- **Instances** — 预定义 agent 实例（仅限预定义 agent）

#### Agent Teams（Agent 团队）

创建 agent 团队以完成协作任务。团队列表支持卡片/列表视图切换。

<!-- TODO: Screenshot — 带任务卡片的团队看板 -->

点击团队查看**看板**，支持拖放任务管理：
- **Board** — 可视化任务板，按状态分列（pending、in_progress、in_review、completed、failed、cancelled、blocked、stale）
- **Members** — 为团队分配 agent，查看含 agent 元数据和 emoji 的成员详情
- **Tasks** — 任务列表视图，支持过滤、审批工作流（批准/拒绝）和阻塞上报
- **Workspace** — 共享文件工作空间，支持懒加载文件夹 UI 和存储深度控制
- **Settings** — 团队配置、阻塞上报、上报模式、工作空间范围

### Conversations（对话）

#### Sessions（Session）

查看活跃和历史 session。按用户、agent、channel 查看对话历史。

#### Pending Messages（待处理消息）

等待 agent 响应的未处理用户消息队列。

#### Contacts（联系人）

管理所有 channel 的用户联系人。

### Connectivity（连接）

#### Channels（渠道）

启用和配置消息 channel：
- **Telegram** — Bot token、允许的用户/群组
- **Discord** — Bot token、guild 设置
- **WhatsApp** — 连接 QR 码
- **Zalo** — 应用凭证
- **Zalo Personal** — 个人 Zalo 账号集成
- **Feishu / Lark** — App ID 和 secret
- **Slack** — Bot token、工作区设置

#### Nodes（节点）

Gateway 节点配对和管理。使用 8 位配对码将浏览器 session 与 gateway 实例配对。显示待配对数量徽章。

### Capabilities（能力）

#### Skills

上传 agent 可以发现和使用的 `SKILL.md` 文件。Skills 支持语义匹配搜索——agent 根据用户的提问找到合适的 skill。

#### Custom Tools（自定义工具）

创建和管理自定义工具，包含命令模板、环境变量和拒绝模式阻断。

#### Builtin Tools（内置工具）

浏览 GoClaw 自带的 50+ 内置工具。启用/禁用单个工具并配置其设置（包括知识图谱、媒体 provider 链和网页抓取提取链设置）。

#### MCP Servers（MCP 服务器）

连接 Model Context Protocol 服务器，扩展 agent 能力。

**示例：** 如果你运行本地知识库服务器，可以通过 MCP 连接，让 GoClaw agent 自动查询你的私有文档。

添加服务器 URL、查看可用工具并测试连接。

#### TTS（文字转语音）

配置 TTS 服务。支持的 provider：OpenAI、ElevenLabs、Edge、MiniMax。

#### Cron Jobs（定时任务）

<!-- TODO: Screenshot — 重新设计的带 Markdown 渲染的 cron 详情页 -->

通过重新设计的详情页（支持 Markdown）安排任务。填写名称、选择 agent、选择调度类型，并编写告知 agent 要做什么的消息。三种调度类型：
- **Every** — 按固定间隔运行（秒）
- **Cron** — 按 cron 表达式运行（如 `0 9 * * *`）
- **Once** — 短暂延迟后运行一次

**示例：**
- **名称：** `daily-feedback`
- **Agent ID：** 你的助手 agent
- **调度类型：** Cron — `0 9 * * *`
- **消息：** "Summarize yesterday's customer feedback and email it to me."

### Data（数据）

#### Memory（记忆）

基于 pgvector 的向量记忆文档管理。存储、搜索和管理 agent 可通过语义搜索检索的文档。

#### Knowledge Graph（知识图谱）

知识图谱管理——查看和管理 agent 在对话中构建的实体关系。

#### Storage（存储）

Agent 或用户上传文件的文件和存储管理。

### Monitoring（监控）

#### Traces（追踪）

LLM 调用历史，包含：
- Token 用量和成本追踪
- 请求/响应对
- 工具调用序列
- 延迟指标

#### Activity（活动）

Agent 生命周期历史——显示 agent 创建、更新或删除的时间，含时间戳和操作者信息。

#### Events（事件）

实时事件流——实时监控 agent 活动、工具调用和系统事件。

#### Usage（使用量）

使用指标和成本追踪——监控每个 agent/channel 的 token 消耗、API 调用和成本。通过 Overview 页面的 **Usage** 标签访问，不是独立的侧边栏项目。

#### Logs（日志）

用于调试和监控 gateway 操作的系统日志。

### System（系统）

#### Providers（Provider）

<!-- TODO: Screenshot — 重新设计的 provider 详情页 -->

管理 LLM provider，采用重新设计的现代详情页。创建、配置和验证 provider。支持 Anthropic（原生）、OpenAI、带 Foundry headers 的 Azure OpenAI 以及 20+ 其他 provider。侧边栏连接状态显示服务器版本。

#### Config（配置）

编辑 gateway 配置。与 JSON5 配置文件相同的设置，但提供可视化编辑器。

#### Approvals（审批）

管理 Exec Approval 工作流——查看并批准/拒绝需要人工确认的工具执行请求。

#### CLI Credentials（CLI 凭证）

管理用于安全命令行访问 GoClaw 的 CLI 凭证。

#### API Keys（API 密钥）

管理编程访问的 API key——创建、撤销并为 key 分配角色。Key 使用 `goclaw_` 前缀格式，支持基于角色的权限范围（admin、operator、viewer）。

#### Tenants（租户，多租户模式）

<!-- TODO: Screenshot — 租户管理页 -->

在 SaaS 部署模式下管理租户——创建租户、分配用户、为每个租户配置 provider、工具、skills 和 MCP 服务器的覆盖设置。仅在多租户模式下运行时可见。

## 桌面版

桌面版是用 Wails 构建的原生应用，将完整 dashboard 包装在独立窗口中，包含 Web 版不具备的额外功能。

### 版本显示

侧边栏标题在 GoClaw logo 旁以等宽字体显示当前版本（如 `v1.2.3`）。点击 **Lite** 徽章打开版本对比弹窗。

### 检查更新

版本号旁有一个刷新按钮（↻）：

- 点击检查是否有新版本可用
- 检查中，按钮显示 `...`
- 发现更新时，显示新版本号（如 `v1.3.0`）
- 已是最新时，显示 `✓`
- 检查失败时，显示 `✗`

Lite 版支持最多 5 个 agent。达到限制时，"New agent" 按钮禁用。

### 更新横幅

当后台事件自动检测到新版本时，应用顶部出现横幅：

- **Available（可用）** — 显示新版本，含 "Update Now" 按钮，点击下载安装
- **Downloading（下载中）** — 更新下载时显示加载动画
- **Done（完成）** — 显示 "Restart Now" 按钮，点击应用更新
- **Error（错误）** — 显示 "Retry" 按钮，横幅可用 X 按钮关闭

### 团队设置弹窗

从 Agent Teams 视图打开团队设置。弹窗分三个部分：

**Team Info（团队信息）**
- 编辑团队名称和描述
- 查看当前状态和负责人 agent

**Members（成员）**
- 所有团队成员及其角色列表（lead、reviewer、member）
- 通过组合框搜索 agent 添加新成员
- 移除非负责人成员（悬停显示移除按钮）

**Notifications（通知）**
按事件类型开关通知：
- `dispatched` — 任务派发给 agent
- `progress` — 任务进度更新
- `failed` — 任务失败
- `completed` — 任务完成
- `new_task` — 新任务加入团队

通知模式：
- **Direct** — 所有团队成员接收通知
- **Leader** — 仅负责人 agent 接收通知

### 任务详情弹窗

点击任意任务卡片打开任务详情弹窗，显示：

- **Identifier** — 简短任务 ID（等宽徽章）
- **Status badge** — 带颜色编码的当前状态；任务执行中时显示动态 "Running" 徽章
- **Progress bar** — 显示百分比和当前步骤（任务进行中时）
- **Metadata grid** — 优先级、负责人 agent、任务类型、创建/更新时间戳
- **Blocked by** — 阻塞任务 ID 列表，以橙色徽章显示
- **Description** — 可折叠区域，支持 Markdown 渲染
- **Result** — 可折叠区域，支持 Markdown 渲染（任务完成时）
- **Attachments** — 可折叠区域，列出附件文件；每条显示文件名、大小和下载按钮

底部操作：
- **Assign to** — 组合框，将任务重新分配给其他团队成员（仅非终态任务显示）
- **Delete** — 仅对已完成/失败/已取消的任务显示；删除前触发确认对话框

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| Dashboard 无法加载 | 检查 self-service 容器是否在运行：`docker compose ps` |
| 无法连接到 API | 确认 `GOCLAW_GATEWAY_TOKEN` 设置正确 |
| 更改未生效 | 强制刷新浏览器（Ctrl+Shift+R） |

## 下一步

- [配置](/configuration) — 通过配置文件编辑设置
- [GoClaw 工作原理](/how-goclaw-works) — 了解架构
- [Agent 详解](/agents-explained) — 了解 agent 类型

<!-- goclaw-source: 231bc968 | 更新: 2026-03-27 -->
