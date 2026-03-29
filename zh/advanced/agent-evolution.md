> 翻译自 [English version](/agent-evolution)

# Agent 进化

> 让预定义 agent 随时间精炼其沟通风格并构建可复用 skill — 自动完成，经过你的授权。

## 概述

GoClaw 包含三个子系统，允许预定义 agent 在对话中不断进化其行为。三者均为**可选开启**且**仅限预定义 agent** — open agent 不适用。

| 子系统 | 作用 | 配置键 |
|---|---|---|
| 自我进化 | Agent 通过 SOUL.md 优化自身语气和风格 | `self_evolve` |
| Skill 学习循环 | Agent 将可复用工作流捕获为 skill | `skill_evolve` |
| Skill 管理 | 创建、修补、删除和授权 skill | `skill_manage` tool |

`self_evolve` 和 `skill_evolve` 默认均为禁用。在 **Agent 设置 → Config 标签页**中按 agent 单独开启。

---

## 自我进化（SOUL.md）

### 作用

启用 `self_evolve` 后，agent 可以在对话中更新自己的 `SOUL.md` 文件，以优化沟通方式。没有专用 tool — agent 使用标准的 `write_file` tool。上下文文件拦截器确保只有 `SOUL.md` 可写；`IDENTITY.md` 和 `AGENTS.md` 无论如何都保持锁定。

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

You have self-evolution enabled. You may update your SOUL.md file to
refine your communication style over time.

What you CAN evolve in SOUL.md:
- Tone, voice, and manner of speaking
- Response style and formatting preferences
- Vocabulary and phrasing patterns
- Interaction patterns based on user feedback

What you MUST NOT change:
- Your name, identity, or contact information
- Your core purpose or role
- Any content in IDENTITY.md or AGENTS.md (these remain locked)

Make changes incrementally. Only update SOUL.md when you notice clear
patterns in user feedback or interaction style preferences.
```

### 安全

| 层级 | 作用 |
|---|---|
| 系统提示词引导 | CAN/MUST NOT 规则限制范围 |
| 上下文文件拦截器 | 验证只有 SOUL.md 被写入 |
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
| 文件 | 仅 SKILL.md（修补时复制伴生文件） | 整个目录（脚本、资源等） |
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

## 常见问题

| 问题 | 原因 | 解决方法 |
|---|---|---|
| Self-Evolution 开关不可见 | Agent 不是预定义类型 | 自我进化仅适用于预定义 agent |
| 后记后 skill 未保存 | 用户未回复"save as skill" | 后记需要明确同意 — 回复精确短语 |
| Agent 无法使用 `skill_manage` | `skill_evolve=false` 或 agent 是 open 类型 | 在 Config 标签页启用 `skill_evolve`；验证 agent 是预定义类型 |
| 修补失败提示"not owner" | Agent 尝试修补其他 agent 的 skill | 每个 agent 只能修改自己创建的 skill |
| 修补失败提示"system skill" | 尝试修改内置系统 skill | 系统 skill 始终为只读 |
| Skill 内容被拒绝 | 内容匹配 guard.go 中的安全规则 | 移除标记的模式；参见上方第一层类别 |

---

## 下一步

- [Skills](/skills) — skill 格式、层级结构和热重载
- [预定义 Agent](#predefined-agents) — 预定义 agent 与 open agent 的区别
- [publish_skill](#skill-publishing) — 基于目录的 skill 发布

<!-- goclaw-source: b9d8754 | 更新: 2026-03-23 -->
