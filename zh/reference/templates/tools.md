> 翻译自 [English version](/template-tools)

# TOOLS.md 模板

> 用于环境特定工具详情的本地笔记文件——摄像头名称、SSH 主机、TTS 声音、设备昵称。

## 概览

`TOOLS.md` 是你的 agent 的**你的设置备忘单**。技能定义工具_通常_如何工作；此文件记录你环境独有的具体信息。

GoClaw 在系统提示的**项目上下文**部分加载此文件。它也在**最小模式**（子 agent、cron 会话）中加载——所以这里的笔记对自动化任务也可用。

**范围：**
- Open agent：按用户（环境特定，每个用户私有）
- 预定义 agent：agent 级别（关于该 agent 所有用户共用工具的共享笔记）

此文件故意是自由格式的——添加任何有助于 agent 完成工作的内容。

---

## 默认模板

```markdown
# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics —
the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can
update skills without losing your notes, and share skills without leaking
your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
```

---

## 自定义示例

家庭自动化 agent 的 TOOLS.md：

```markdown
# TOOLS.md - Local Notes

## Cameras

- living-room → 192.168.1.50, wide angle, covers couch + TV area
- front-door → 192.168.1.51, motion-triggered, 1080p
- garage → 192.168.1.52, offline Mon nights (maintenance window)

## SSH Hosts

- home-server → 192.168.1.100, user: admin, key: ~/.ssh/home.pem
- nas → 192.168.1.200, user: pi, Samba share at /mnt/data
- vps → 45.67.89.100, user: ubuntu (public-facing services)

## TTS

- Preferred voice: "Nova"
- Living room speaker: "HomePod Living Room"
- Bedroom speaker: "HomePod Mini Bedroom"

## Device Nicknames

- "my laptop" → MacBook Pro M3, hostname: thieunv-mbp
- "my phone" → iPhone 15 Pro
- "the TV" → Samsung Frame 65", controllable via exec + cec-client

## Smart Home

- Lights: use `exec hass-cli` with entity IDs from Home Assistant
- Thermostat entity: climate.ecobee_main
- Presence sensor: binary_sensor.thieunv_home
```

---

## 使用建议

- **保持更新** — 过时的条目会让 agent 困惑。删除不再拥有的设备。
- **具体一点** — "192.168.1.100, user: admin" 比 "home server" 更有用
- **不要在这里放密钥** — SSH key、密码、API token 应放在环境变量或密钥管理器中，而不是纯文本 markdown 文件
- **子 agent 也能看到** — 这里的笔记在 cron 任务和派生的子 agent 中也可用，对自动化任务很有用

---

## 下一步

- [上下文文件](/context-files) — 全部 7 个上下文文件及其加载顺序
- [系统提示结构](/system-prompt-anatomy) — TOOLS.md 在提示中的位置（包含最小模式）
- [AGENTS.md 模板](/template-agents) — 引用工具的操作指令

<!-- goclaw-source: 57754a5 | 更新: 2026-03-18 -->
