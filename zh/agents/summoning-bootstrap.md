> 翻译自 [English version](/summoning-bootstrap)

# Summoning & Bootstrap

> Agent 创建和首次使用时如何自动生成 personality 文件。

## 概述

GoClaw 使用两种机制来填充 context 文件：

1. **Summoning** — 创建 predefined agent 时，LLM 根据自然语言描述生成 personality 文件（SOUL.md、IDENTITY.md）
2. **Bootstrap** — Open agent 的首次运行仪式，询问"我是谁？"并完成个性化配置

本页介绍这两种机制，重点说明其内部运作原理。

## Summoning：为 Predefined Agent 自动生成

当你**创建带有描述的 predefined agent** 时，summoning 开始：

```bash
curl -X POST /v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agent_key": "support-bot",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "A patient support agent that helps customers troubleshoot product issues. Warm, clear, escalates complex problems. Answers in customer'\''s language."
    }
  }'
```

系统会：

1. 以 `"summoning"` 状态创建 agent
2. 启动后台 LLM 调用生成：
   - **SOUL.md** — personality（语调、边界、专业能力、风格）
   - **IDENTITY.md** — 名称、形态、emoji、目的
   - **USER_PREDEFINED.md**（可选）— 若描述提到所有者/创建者信息，则生成用户处理规则

3. 通过 WebSocket 事件轮询 agent 状态，直到状态变为 `"active"`（或 `"summon_failed"`）

### 超时时间

Summoning 使用两个超时值：
- **单次调用超时：300 秒** — 乐观的一次性 LLM 调用必须在此时间内完成
- **总超时：600 秒** — 涵盖单次调用和回退顺序调用的总预算

若单次调用超时，剩余预算用于回退的两阶段方式。

### 两阶段 LLM 生成

Summoning 首先尝试乐观的单次 LLM 调用（300 秒超时）。若超时，在 600 秒总预算内回退到顺序调用：

**阶段 1：生成 SOUL.md**
- 输入：描述 + SOUL.md 模板
- 输出：包含专业能力摘要的个性化 SOUL.md

**阶段 2：生成 IDENTITY.md + USER_PREDEFINED.md**
- 输入：描述 + 已生成的 SOUL.md context
- 输出：IDENTITY.md 以及可选的 USER_PREDEFINED.md

若单次调用成功：两个文件在一次请求中生成。
若超时：回退方式分别处理每个阶段。

### 生成内容

Summoning 最多生成四个文件：

| 文件 | 是否生成 | 内容 |
|------|:-------:|------|
| `SOUL.md` | 始终 | Personality、tone、边界、专业能力 |
| `IDENTITY.md` | 始终 | 名称、creature、emoji、目的 |
| `CAPABILITIES.md` | 始终 | 领域专业知识和技术技能（v3） |
| `USER_PREDEFINED.md` | 若描述提到用户/策略 | 跨所有用户的基线用户处理规则 |

**SOUL.md：**
```markdown
# SOUL.md - Who You Are

## Core Truths
(通用 personality 特征——保留自模板)

## Boundaries
(若描述中提到具体约束则自定义)

## Vibe
(从描述中提取的沟通风格)

## Style
- Tone: (根据描述推导)
- Humor: (根据 personality 确定级别)
- Emoji: (根据气质确定频率)
...

## Expertise
(从描述中提取的领域知识)
```

**IDENTITY.md：**
```markdown
# IDENTITY.md - Who Am I?

- **Name:** (根据描述生成)
- **Creature:** (从描述 + SOUL.md 推断)
- **Purpose:** (从描述提取的使命陈述)
- **Vibe:** (personality 描述词)
- **Emoji:** (与 personality 匹配的选择)
```

**CAPABILITIES.md**（v3）：
将领域专业知识与 personality 分离。SOUL.md 描述*你是谁*；CAPABILITIES.md 描述*你知道什么*——技术技能、工具、方法论。当 `self_evolve=true` 时，agent 可随时间更新此文件，就像 SOUL.md 一样。

**USER_PREDEFINED.md**（可选）：
仅当描述中提到所有者/创建者、用户/群组或沟通策略时生成。包含跨所有用户共享的基础用户处理规则。

### Regenerate vs. Resummon

这是两个不同的操作，不要混淆：

| | `regenerate` | `resummon` |
|---|---|---|
| **接口** | `POST /v1/agents/{id}/regenerate` | `POST /v1/agents/{id}/resummon` |
| **用途** | 用新指令编辑 personality | 从头重试 summoning |
| **必填** | `"prompt"` 字段（必填） | `other_config` 中的原始 `description` |
| **使用时机** | 想要修改 agent personality | 初始 summoning 失败或结果不理想 |

#### Regenerate：编辑 Personality

使用 `regenerate` 以新指令修改 agent 现有文件：

```bash
curl -X POST /v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Change the tone to more formal and technical. Add expertise in machine learning."
  }'
```

系统会：
1. 读取当前 SOUL.md、IDENTITY.md、USER_PREDEFINED.md
2. 将其与编辑指令一起发送给 LLM
3. 仅重新生成有变化的文件
4. 若 IDENTITY.md 被重新生成，更新 display_name 和 frontmatter
5. 完成后将状态设为 `"active"`

未在 prompt 中提及的文件不会发送给 LLM，避免不必要的重新生成。

#### Resummon：从原始描述重试

当初始 summoning 失败（如模型错误、超时）且你想从原始描述重试时，使用 `resummon`：

```bash
curl -X POST /v1/agents/{agent-id}/resummon \
  -H "Authorization: Bearer $TOKEN"
```

无需请求体。系统重新读取 `other_config` 中的原始 `description` 并再次执行完整 summoning。

> **前提条件：** 若 agent 的 `other_config` 中没有 `description`，`resummon` 将返回错误。确保创建 agent 时包含了描述字段。

## Bootstrap：Open Agent 的首次运行仪式

当新用户**首次**与 **open agent** 开始对话时：

1. 系统从模板初始化 BOOTSTRAP.md：
   ```markdown
   # BOOTSTRAP.md - Hello, World

   You just woke up. Time to figure out who you are.

   Start with: "Hey. I just came online. Who am I? Who are you?"
   ```

2. Agent 发起对话：
   > "Hey. I just came online. Who am I? Who are you?"

3. 用户与 agent 协作填写：
   - **IDENTITY.md** — agent 的名称、形态、目的、气质、emoji
   - **USER.md** — 用户的姓名、时区、语言、备注
   - **SOUL.md** — personality、语调、边界、专业能力

4. 用户通过写入空内容标记 bootstrap 完成：
   ```go
   write_file("BOOTSTRAP.md", "")
   ```

5. 下次对话时，BOOTSTRAP.md 被跳过（为空），personality 已锁定。

### Bootstrap vs. Summoning

| 方面 | Bootstrap（Open） | Summoning（Predefined） |
|------|------------------|----------------------|
| **触发方式** | 新用户首次对话 | 创建带描述的 agent |
| **由谁决定 personality** | 用户（通过对话） | LLM 根据描述 |
| **文件范围** | 每用户 | Agent 级 |
| **生成的文件** | SOUL.md、IDENTITY.md、USER.md | SOUL.md、IDENTITY.md、USER_PREDEFINED.md |
| **耗时** | 1-2 次对话（用户节奏） | 后台，1-2 分钟（LLM 节奏） |
| **结果** | 每用户独特的 personality | 所有用户一致的 personality |

## 实际示例

### 示例 1：Summon 一个 Research Agent

创建带 LLM summoning 的 predefined agent：

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: admin" \
  -d '{
    "agent_key": "research",
    "agent_type": "predefined",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "other_config": {
      "description": "Research assistant that helps users gather and synthesize information from multiple sources. Bold, opinioned, tries novel connections. Prefers academic sources. Answers in the user'\''s language."
    }
  }'
```

**时间线：**
- T=0：Agent 创建，状态 → `"summoning"`
- T=0-2s：AGENTS.md 和 TOOLS.md 模板初始化到 agent_context_files
- T=1-10s：LLM 生成 SOUL.md（第一次调用）
- T=1-15s：LLM 生成 IDENTITY.md + USER_PREDEFINED.md（第二次调用或第一次的一部分）
- T=15s：文件存储，状态 → `"active"`，事件广播

**结果：**
```
agent_context_files:
├── AGENTS.md (template)
├── SOUL.md (generated: "Bold, opinioned, academic focus")
├── IDENTITY.md (generated: "Name: Researcher, Emoji: 🔍")
├── USER_PREDEFINED.md (generated: "Prefer academic sources")
```

首个与 agent 对话的用户的 USER.md 会初始化到 user_context_files，personality 已就绪。

### 示例 2：Bootstrap 一个 Open 个人助理

创建 open agent（无 summoning）：

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Authorization: Bearer token" \
  -H "X-GoClaw-User-Id: alice" \
  -d '{
    "agent_key": "alice-assistant",
    "agent_type": "open",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }'
```

**首次对话（alice）：**
- Agent："Hey. I just came online. Who am I? Who are you?"
- Alice："You're my research assistant. I'm Alice. I like concise answers and bold opinions."
- Agent：更新 IDENTITY.md、SOUL.md、USER.md
- Alice：输入 `write_file("BOOTSTRAP.md", "")`
- Bootstrap 完成——下次对话 BOOTSTRAP.md 为空/跳过

**第二个用户（bob）：**
- 独立的 BOOTSTRAP.md、SOUL.md、IDENTITY.md、USER.md
- Bob 有自己的 personality（不是 alice 的）
- Bob 独立完成 bootstrap

### 示例 3：Regenerate 以更改 Personality

Summoning 后发现 agent 应更正式。使用 `regenerate`（而非 `resummon`）——这是在编辑 personality，不是重试失败的 summon：

```bash
curl -X POST http://localhost:8080/v1/agents/{agent-id}/regenerate \
  -H "Authorization: Bearer token" \
  -d '{
    "prompt": "Make the tone formal and professional. Remove humor. Add expertise in technical support."
  }'
```

**流程：**
1. 状态 → `"summoning"`
2. LLM 读取当前 SOUL.md、IDENTITY.md
3. LLM 应用编辑指令
4. 文件更新，状态 → `"active"`
5. 现有用户的 USER.md 文件保留（不重新生成）

## 内部机制

### 状态流转

```
open agent：
create → "active"

predefined agent（无描述）：
create → "active"

predefined agent（有描述）：
create → "summoning" → (LLM 调用) → "active" | "summon_failed"

regenerate（用 prompt 编辑）：
"active" → "summoning" → (LLM 调用) → "active" | "summon_failed"

resummon（从原始描述重试）：
"active" → "summoning" → (LLM 调用) → "active" | "summon_failed"
```

### 广播的事件

Summoning 期间，WebSocket 客户端会收到进度事件：

```json
{
  "name": "agent.summoning",
  "payload": {
    "type": "started",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "file_generated",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "file": "SOUL.md"
  }
}

{
  "name": "agent.summoning",
  "payload": {
    "type": "completed",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

可用这些事件实时更新 dashboard。

### 文件初始化

Summoning 和 bootstrap 都依赖 `SeedUserFiles()` 和 `SeedToStore()`：

**Agent 创建时：**
- Open：尚未初始化（在用户首次对话时懒加载）
- Predefined：AGENTS.md、SOUL.md（模板）、IDENTITY.md（模板）等 → agent_context_files

**用户首次对话时：**
- Open：所有模板 → user_context_files（SOUL.md、IDENTITY.md、USER.md、BOOTSTRAP.md、AGENTS.md、AGENTS_CORE.md、AGENTS_TASK.md、CAPABILITIES.md、TOOLS.md）
- Predefined：USER.md + `BOOTSTRAP_PREDEFINED.md` → user_context_files

`BOOTSTRAP_PREDEFINED.md` 是预定义 agent 的面向用户的 onboarding 脚本（与 open agent 的 `BOOTSTRAP.md` 不同——更为克制，因为 agent 的 personality 已在 agent 级设置）。
- Agent 级文件（SOUL.md、IDENTITY.md）已从 agent_context_files 加载

**Predefined 带预配置 USER.md：**
若在用户首次对话前手动在 agent 级设置了 USER.md，它将作为所有用户 USER.md 的种子（然后每个用户获得自己的副本可自定义）。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| Summoning 反复超时 | 检查 provider 连接和模型可用性。回退（两阶段方式）应仍可完成。 |
| 生成的 SOUL.md 过于通用 | 描述过于模糊。用更具体的细节重新 summon：领域、语调、使用场景。 |
| 用户无法自定义（predefined agent） | 这是设计预期——只有 USER.md 是每用户的。使用 re-summon 或手动编辑来修改 agent 级的 SOUL.md/IDENTITY.md。 |
| Bootstrap 未启动 | 检查 BOOTSTRAP.md 是否已初始化。对于 open agent，仅在用户首次对话时初始化。 |
| Bootstrap 后 personality 不符 | 用户可能跳过了 SOUL.md 自定义。SOUL.md 默认为英文模板。重新 regenerate 或手动编辑。 |

## 下一步

- [Context Files](./context-files.md) — 每个文件的详细参考
- [Open vs. Predefined](/open-vs-predefined) — 了解何时使用每种类型
- [Creating Agents](/creating-agents) — 分步创建 agent

<!-- goclaw-source: 050aafc9 | 更新: 2026-04-09 -->
