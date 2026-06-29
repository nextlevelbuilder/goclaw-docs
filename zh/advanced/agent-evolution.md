> 翻译自 [English version](/agent-evolution)

# Agent 进化

> 让预定义 agent 随时间精炼其沟通风格并构建可复用 skill — 自动完成，经过你的授权。

## 概述

GoClaw 包含三个子系统，允许预定义 agent 在对话中不断进化其行为。三者均为**可选开启**且**仅限预定义 agent** — open agent 不适用。

| 子系统 | 作用 | 配置键 |
|---|---|---|
| 自我进化 | Agent 通过 SOUL.md 优化语气风格，通过 CAPABILITIES.md 优化专业能力 | `self_evolve` |
| Skill 学习循环 | Agent 将可复用工作流捕获为 skill | `skill_evolve` |
| Skill 管理 | 创建、修补、删除和授权 skill | `skill_manage` tool |

`self_evolve` 和 `skill_evolve` 默认均为禁用。在 **Agent 设置 → Config 标签页**中按 agent 单独开启。

---

## 自我进化（SOUL.md + CAPABILITIES.md）

### 作用

启用 `self_evolve` 后，agent 可以在对话中更新自己的两个上下文文件：

- **`SOUL.md`** — 优化沟通风格（语气、嗓音、词汇、回复风格）
- **`CAPABILITIES.md`** — 优化专业知识、技术技能和专门能力

没有专用 tool — agent 使用标准的 `write_file` tool。上下文文件拦截器确保只有 `SOUL.md` 和 `CAPABILITIES.md` 可写；`IDENTITY.md` 和 `AGENTS.md` 无论如何都保持锁定。

变更是渐进式的。Agent 被引导为只在注意到用户反馈中出现明显规律时才更新，而非每轮都更新。

### 启用方式

| 设置 | 位置 | 默认值 |
|---|---|---|
| `self_evolve` | Agent 设置 → General 标签页 → Self-Evolution 开关 | `false` |

仅对预定义 agent 显示。该设置以 `self_evolve` 存储在 `agents.other_config` 中。

### Agent 可以和不可以修改的内容

`self_evolve=true` 时，GoClaw 向系统提示词注入以下引导内容（每次请求约 ~95 tokens）：

```
## Self-Evolution

You may update SOUL.md to refine communication style (tone, voice, vocabulary, response style).
You may update CAPABILITIES.md to refine domain expertise, technical skills, and specialized knowledge.
MUST NOT change: name, identity, contact info, core purpose, IDENTITY.md, or AGENTS.md.
Make changes incrementally based on clear user feedback patterns.
```

> 源码：`internal/agent/systemprompt.go` 中的 `buildSelfEvolveSection()`。

### 安全

| 层级 | 作用 |
|---|---|
| 系统提示词引导 | CAN/MUST NOT 规则限制范围 |
| 上下文文件拦截器 | 验证只有 SOUL.md 或 CAPABILITIES.md 被写入 |
| 文件锁定 | IDENTITY.md 和 AGENTS.md 始终为只读 |

---

## Skill 学习循环

### 作用

启用 `skill_evolve` 后，GoClaw 鼓励 agent 将复杂的多步骤流程捕获为可复用 skill。循环有三个触发点：

1. **系统提示词引导** — 在每次请求开始时注入，包含 SHOULD/SHOULD NOT 标准
2. **预算提示** — 在迭代预算达到 70% 和 90% 时注入的临时提醒
3. **后记建议** — 当发生足够多工具调用时追加到 agent 最终响应；需要用户明确同意

没有用户回复"save as skill"，skill 永远不会被创建。回复"skip"不做任何操作。

### 启用方式

| 设置 | 位置 | 默认值 |
|---|---|---|
| `skill_evolve` | Agent 设置 → Config 标签页 → Skill Learning 开关 | `false` |
| `skill_nudge_interval` | Config 标签页 → 间隔输入框 | `15` |

`skill_nudge_interval` 是触发后记所需的最少工具调用次数。设为 `0` 可在保留预算提示的同时完全禁用后记。

Open agent 无论数据库中如何设置，`skill_evolve` 始终为 `false` — 强制执行在 resolver 层完成。

### 循环流程

```
管理员启用 skill_evolve
        ↓
系统提示词包含 Skill Creation 引导（每次请求）
        ↓
Agent 处理请求（思考 → 行动 → 观察）
        ↓
  迭代预算 ≥ 70%? → 临时提示（温和建议）
  迭代预算 ≥ 90%? → 临时提示（中等紧迫度）
        ↓
Agent 完成任务
        ↓
  totalToolCalls ≥ skill_nudge_interval?
    否  → 正常响应
    是  → 追加后记："Save as skill? or skip?"
              ↓
        用户回复"skip"          → 无操作
        用户回复"save as skill" → Agent 调用 skill_manage(create)
                                      ↓
                                  Skill 创建 + 自动授权
                                      ↓
                                  下一轮即可使用
```

### 系统提示词引导

`skill_evolve=true` 且 `skill_manage` tool 已注册时，GoClaw 注入以下块（每次请求约 ~135 tokens）：

```
### Skill Creation (recommended after complex tasks)

After completing a complex task (5+ tool calls), consider:
"Would this process be useful again in the future?"

SHOULD create skill when:
- Process is repeatable with different inputs
- Multiple steps that are easy to forget
- Domain-specific workflow others could benefit from

SHOULD NOT create skill when:
- One-time task specific to this user/context
- Debugging or troubleshooting (too context-dependent)
- Simple tasks (< 5 tool calls)
- User explicitly said "skip" or declined

Creating: skill_manage(action="create", content="---\nname: ...\n...")
Improving: skill_manage(action="patch", slug="...", find="...", replace="...")
Removing: skill_manage(action="delete", slug="...")

Constraints:
- You can only manage skills you created (not system or other users' skills)
- Quality over quantity — one excellent skill beats five mediocre ones
- Ask user before creating if unsure
```

### 预算提示

这些是注入到 agent 循环中的临时用户消息。它们**不会**持久化到会话历史，每次运行最多触发一次。

**迭代预算 70% 时（约 ~31 tokens）：**
```
[System] You are at 70% of your iteration budget. Consider whether any
patterns from this session would make a good skill.
```

**迭代预算 90% 时（约 ~48 tokens）：**
```
[System] You are at 90% of your iteration budget. If this session involved
reusable patterns, consider saving them as a skill before completing.
```

### 后记建议

当 `totalToolCalls >= skill_nudge_interval` 时，以下文本追加到 agent 最终响应（约 ~35 tokens，持久化到会话）：

```
---
_This task involved several steps. Want me to save the process as a
reusable skill? Reply "save as skill" or "skip"._
```

后记每次运行最多触发一次。后续运行会重置该标志。

### Tool 门控

`skill_evolve=false` 时，`skill_manage` tool 对 LLM 完全隐藏 — 在发送给 provider 之前从 tool 定义中过滤掉，并从系统提示词构建的 tool 名称中排除。Agent 对其毫无感知。

---

## Skill 管理

### skill_manage tool

`skill_manage` tool 在 `skill_evolve=true` 时对 agent 可用。支持三种操作：

| 操作 | 必填参数 | 作用 |
|---|---|---|
| `create` | `content` | 从 SKILL.md 内容字符串创建新 skill |
| `patch` | `slug`, `find`, `replace` | 对现有 skill 应用查找替换补丁 |
| `delete` | `slug` | 软删除 skill（移至 `.trash/`） |

**完整参数参考：**

| 参数 | 类型 | 适用操作 | 描述 |
|---|---|---|---|
| `action` | string | 所有 | `create`、`patch` 或 `delete` |
| `slug` | string | patch、delete | Skill 唯一标识符 |
| `content` | string | create | 包含 YAML frontmatter 的完整 SKILL.md |
| `find` | string | patch | 在当前 SKILL.md 中查找的精确文本 |
| `replace` | string | patch | 替换文本 |
| `files` | object | 可选（create、patch） | 按相对路径作为键的伴生文本文件（例如 `references/guide.md`）。每个文件限制为 **2 MB**；路径会被校验（不允许 `..`、绝对路径/Windows 路径、空字节、覆盖 `SKILL.md`、dotfile 或系统工件） |
| `visibility` | string | 可选（patch） | 仅元数据级别的可见性变更（`private` 或 `public`）— 在没有 `content`/`files` 变更时，更新谁可以发现该 skill 而不创建新版本 |

**示例 — 从对话创建 skill：**

```
skill_manage(
  action="create",
  content="---\nname: Deploy Checklist\ndescription: Steps to deploy the app safely.\n---\n\n## Steps\n1. Run tests\n2. Build image\n3. Push to registry\n4. Apply manifests\n5. Verify rollout"
)
```

**示例 — 修补现有 skill：**

```
skill_manage(
  action="patch",
  slug="deploy-checklist",
  find="5. Verify rollout",
  replace="5. Verify rollout\n6. Notify team in Slack"
)
```

**示例 — 删除 skill：**

```
skill_manage(action="delete", slug="deploy-checklist")
```

**示例 — 创建带伴生 reference 文件的 skill：**

```
skill_manage(
  action="create",
  content="---\nname: Deploy Checklist\ndescription: Steps to deploy the app safely.\n---\n\n## Steps\nSee {baseDir}/references/runbook.md",
  files={"references/runbook.md": "# Runbook\n1. Run tests\n2. Build image\n3. Push to registry"}
)
```

### publish_skill tool

`publish_skill` 是将整个本地目录注册为 skill 的替代路径。它始终作为内置 tool 开关可用（不受 `skill_evolve` 门控）。

```
publish_skill(path="./skills/my-skill")
```

目录必须包含带有 `name` frontmatter 的 `SKILL.md`。Skill 以 `private` 可见性启动，并自动授权给调用 agent。使用 Dashboard 或 API 将其授权给其他 agent。

**对比：**

| | `skill_manage` | `publish_skill` |
|---|---|---|
| 输入 | 内容字符串 | 目录路径 |
| 文件 | SKILL.md 加上直接伴生文本文件（`files=...`）；修补时将现有伴生文件复制到新版本 | 整个目录（脚本、资源等） |
| 门控方式 | `skill_evolve` 配置 | 内置 tool 开关（始终可用） |
| 引导 | 通过 skill_evolve 提示注入 | 使用 `skill-creator` 核心 skill |
| 自动授权 | 是 | 是 |

---

## 安全

每次 skill 变更都要经过四层验证才会写入磁盘。

### 第一层 — 内容守卫

对 SKILL.md 内容逐行进行正则扫描。任何匹配都会硬拒绝。25 条规则覆盖 6 个类别：

| 类别 | 示例 |
|---|---|
| 破坏性 shell | `rm -rf /`、fork bomb、`dd of=/dev/`、`mkfs`、`shred` |
| 代码注入 | `base64 -d \| sh`、`eval $(...)`、`curl \| bash`、`python -c exec()` |
| 凭据窃取 | `/etc/passwd`、`.ssh/id_rsa`、`AWS_SECRET_ACCESS_KEY`、`GOCLAW_DB_URL` |
| 路径穿越 | `../../../` 深度穿越 |
| SQL 注入 | `DROP TABLE`、`TRUNCATE TABLE`、`DROP DATABASE` |
| 提权 | `sudo`、全局可写 `chmod`、`chown root` |

这是纵深防御层 — 并非穷举。GoClaw 的 `exec` tool 有自己的运行时 shell 命令拒绝列表。

### 第二层 — 所有权执行

三层所有权检查覆盖所有变更路径：

| 层级 | 检查 |
|---|---|
| `skill_manage` tool | patch/delete 前执行 `GetSkillOwnerIDBySlug(slug)` |
| HTTP API | `GetSkillOwnerID(uuid)` + 管理员角色绕过 |
| WebSocket gateway | `skillOwnerGetter` 接口 + 管理员角色绕过 |

Agent 只能修改自己创建的 skill。管理员可以绕过所有权检查。系统 skill（`is_system=true`）无法通过任何路径修改。

### 第三层 — 系统 Skill 守卫

系统 skill 始终为只读。任何修补或删除 `is_system=true` skill 的尝试都会在到达文件系统前被拒绝。

### 第四层 — 文件系统安全

| 保护措施 | 详情 |
|---|---|
| 符号链接检测 | `filepath.WalkDir` 检查符号链接 — 发现即拒绝 |
| 路径穿越 | 拒绝包含 `..` 段的路径 |
| SKILL.md 大小限制 | 最大 100 KB |
| 伴生文件大小限制 | 最大总计 20 MB（脚本、资源等） |
| 软删除 | 文件移至 `.trash/`，从不硬删除 |

---

## 版本管理与存储

每次创建或修补都会生成一个新的不可变版本目录。GoClaw 始终使用编号最高的版本。

```
skills-store/
├── deploy-checklist/
│   ├── 1/
│   │   └── SKILL.md
│   └── 2/              ← 修补创建了此版本
│       └── SKILL.md
├── .trash/
│   └── old-skill.1710000000   ← 软删除
```

同一 skill 的并发版本创建通过 `pg_advisory_xact_lock`（基于 slug 的 FNV-64a hash）进行串行化。版本号在事务内使用 `COALESCE(MAX(version), 0) + 1` 计算。

---

## Token 成本

| 组件 | 激活条件 | 约计 tokens | 是否持久化 |
|---|---|---|---|
| Self-evolve 块 | `self_evolve=true` | ~95 | 每次请求 |
| Skill 创建引导 | `skill_evolve=true` | ~135 | 每次请求 |
| `skill_manage` tool 定义 | `skill_evolve=true` | ~290 | 每次请求 |
| 预算提示 70% | 迭代 ≥ 最大值的 70% | ~31 | 否（临时） |
| 预算提示 90% | 迭代 ≥ 最大值的 90% | ~48 | 否（临时） |
| 后记 | toolCalls ≥ 间隔 | ~35 | 是 |

两个功能均启用时每次运行的最大额外开销：skill 学习约 ~305 tokens（约为 128K 上下文的 1.5%）。两者均禁用时（默认），token 额外开销为零。

---

## v3：进化指标与建议引擎

v3 为预定义 agent 新增自动化、基于指标的进化。该系统独立于上述手动 skill 学习循环运行。

### 工作原理

```
运行期间收集指标（7 天滚动窗口）
    ↓
SuggestionEngine.Analyze() — 每日通过 cron 运行
    ├─ LowRetrievalUsageRule  (avg recall < 阈值)
    ├─ ToolFailureRule         (单个 tool 失败率 > 20%)
    └─ RepeatedToolRule        (tool 连续调用 5+ 次)
    ↓
创建状态为"pending"的建议
    ↓
管理员审核 → approve / reject / rollback
```

### 指标类型

| 类型 | 跟踪内容 | 示例 |
|------|---------|------|
| `tool` | 每个 tool 的性能 | invocation_count, success_rate, failure_count |
| `retrieval` | 知识检索质量 | recall_rate, precision, relevance_score |
| `feedback` | 用户满意度信号 | rating, sentiment, effectiveness_score |

### 建议类型

| 类型 | 触发条件 | 建议 |
|------|---------|------|
| `low_retrieval_usage` | 7 天内 avg recall 低于阈值 | 降低 `retrieval_threshold` ≤ 0.1 |
| `tool_failure` | 单个 tool 失败率 > 20% | 检查 tool 配置或添加 fallback |
| `repeated_tool` | 同一 tool 连续调用 5+ 次 | 将工作流提取为 skill |

### 自动适应护栏

| 护栏 | 默认值 | 用途 |
|------|-------|------|
| `max_delta_per_cycle` | 0.1 | 每个应用周期的最大参数变化 |
| `min_data_points` | 100 | 应用前所需的最少指标数 |
| `rollback_on_drop_pct` | 20.0 | 应用后质量下降 >20% 则自动回滚 |
| `locked_params` | `[]` | 不可自动更改的参数 |

### 进化 Cron 配置

```json
{
  "evolution_enabled": true,
  "evolution_cron_schedule": "every day at 02:00",
  "evolution_guardrails": {
    "max_delta_per_cycle": 0.1,
    "min_data_points": 100,
    "rollback_on_drop_pct": 20.0,
    "locked_params": []
  }
}
```

### HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/v1/agents/{id}/evolution/metrics` | 查询指标 |
| `GET` | `/v1/agents/{id}/evolution/suggestions` | 列出建议 |
| `PATCH` | `/v1/agents/{id}/evolution/suggestions/{sid}` | Approve / reject / rollback |

---

## Skill 自我进化（按 skill 的指标）

这是一个**独立于**上述"v3 进化指标"的子系统。agent 级进化调整的是 *agent* 的参数，而 skill 自我进化跟踪每个**现有 skill** 随时间的表现，并为该 skill 本身提议改进。它也不同于 `skill_evolve` 学习循环 —— 后者教 agent *何时* 应创建或修补可复用 skill。

### 运行时记录

usage 会在 agent 使用 skill 时自动记录 —— **没有公开的 usage 端点**：

- `use_skill` tool 调用以租户范围记录 usage，状态为 `succeeded` 或 `failed`，并附带 duration、session key、run/trace ID、agent ID 和 user 范围。
- 斜杠命令激活（`/<slug>` 或 `/use <skill>`）在解析到某个 skill 时记录一个 `started` 事件。
- usage 写入**仅限内部**。v1 有意不提供公开的 `POST /v1/skills/{id}/usage` 端点，因此客户端无法伪造成功率。

### 持久化表

| 表 | 用途 |
|---|---|
| `skill_evolution_settings` | 按租户、按 skill 的 `enabled` 标志和 `mode` |
| `skill_usage_metrics` | 运行时 usage 事件和状态计数 |
| `skill_improvement_suggestions` | 按 skill 的改进建议，附带证据和草稿补丁 |
| `skill_versions` | 不可变的已应用版本记录，关联到已变更文件和来源建议 |

### 模式与状态

| 字段 | 取值 | 备注 |
|---|---|---|
| 设置 `mode` | `suggest_only`（默认）、`auto_analyze` | v1 不会自动 *修补* —— `auto_analyze` 仅自动生成建议 |
| usage `status` | `started`、`succeeded`、`failed`、`abandoned` | 按每次 skill 调用记录 |
| 建议 `status` | `pending`、`approved`、`rejected`、`applied` | 改进建议的生命周期 |

### 应用建议

建议由管理员审核并应用。将建议应用到**自定义** skill 时：

1. 将当前 skill 目录复制到新版本。
2. 校验目标路径（与 `skill_manage` 伴生文件规则相同）。
3. 当 SKILL.md 变更时运行 SKILL.md 内容守卫扫描器。
4. 更新当前活动 skill 并记录一条新的 `skill_versions` 行。
5. 写入一条 activity 日志条目。

**系统/内置 skill 的变更会被拒绝** —— 对任何 `is_system = true` 的 skill，应用路径在触及文件系统之前返回 `403`。

### 需要管理员权限的界面

查看界面经过脱敏。失败证据、草稿补丁、actor ID 和 activity 详情需要**管理员**可见性 —— 非管理员仅能看到汇总的、不敏感的数据。

### HTTP API

| 方法 | 路径 | 访问权限 |
|---|---|---|
| `GET` | `/v1/skills/{id}/evolution` | 读取自我进化设置 |
| `PATCH` | `/v1/skills/{id}/evolution` | 设置 `enabled` / `mode`（租户管理员） |
| `GET` | `/v1/skills/{id}/metrics` | usage 指标（total / started / succeeded / failed / abandoned / 成功率） |
| `GET` | `/v1/skills/{id}/activity` | 最近的自我进化 activity（仅管理员） |
| `GET` | `/v1/skills/{id}/evolution/suggestions` | 列出该 skill 的建议 |
| `POST` | `/v1/skills/{id}/evolution/suggestions/{sid}/approve` | 批准一条建议（租户管理员） |
| `POST` | `/v1/skills/{id}/evolution/suggestions/{sid}/reject` | 拒绝一条建议（租户管理员） |
| `POST` | `/v1/skills/{id}/evolution/suggestions/{sid}/apply` | 应用一条已批准的建议（租户管理员） |

对应的 CLI 命令是 `goclaw skills evolve`、`goclaw skills metrics`、`goclaw skills suggestions` 和 `goclaw skills activity`。Dashboard 在 skill 详情的 **Evolution** 标签页中展示上述全部内容。

---

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| Self-Evolution 开关不可见 | Agent 不是预定义类型 | 自我进化仅适用于预定义 agent |
| 后记后 skill 未保存 | 用户未回复"save as skill" | 后记需要明确同意 — 回复精确短语 |
| Agent 无法使用 `skill_manage` | `skill_evolve=false` 或 agent 是 open 类型 | 在 Config 标签页启用 `skill_evolve`；验证 agent 是预定义类型 |
| 修补失败提示"not owner" | Agent 尝试修补其他 agent 的 skill | 每个 agent 只能修改自己创建的 skill |
| 修补失败提示"system skill" | 尝试修改内置系统 skill | 系统 skill 始终为只读 |
| Skill 内容被拒绝 | 内容匹配 guard.go 中的安全规则 | 移除标记的模式；参见上方第一层类别 |
| 伴生文件被 `skill_manage` 拒绝 | 路径使用了 `..`、绝对路径/Windows 路径、dotfile 或系统工件；或文件超过 2 MB | 在 skill 根目录下使用干净的相对路径，并将每个文本文件保持在 2 MB 以下 |
| 无法应用 skill 建议 | 目标是系统/内置 skill，或建议尚未处于 `approved` 状态 | 系统 skill 为只读；先批准建议再应用 |
| Skill 指标无数据 | 尚未记录任何 `use_skill`/斜杠命令激活，或自我进化已禁用 | usage 会在 agent 使用 skill 时内部记录；在该 skill 的 Evolution 标签页启用自我进化 |

---

## 下一步

- [Skills](/skills) — skill 格式、层级结构和热重载
- [预定义 Agent](#predefined-agents) — 预定义 agent 与 open agent 的区别
- [publish_skill](#skill-publishing) — 基于目录的 skill 发布

<!-- goclaw-source: fabe86b3 | 更新: 2026-06-30 -->
