# TOOLS.md Template

> A local notes file for environment-specific tool details — camera names, SSH hosts, TTS voices, device nicknames.

## Overview

`TOOLS.md` is your agent's **cheat sheet for your setup**. Skills define _how_ tools work in general; this file captures the specifics that are unique to your environment.

GoClaw loads this file in the **Project Context** section of the system prompt. It's also loaded in **minimal mode** (subagents, cron sessions) — so notes here are available to automated tasks too.

**Scope:**
- Open agents: per-user (environment-specific, private to each user)
- Predefined agents: agent-level (shared notes about tools common to all users of that agent)

The file is intentionally freeform — add whatever helps your agent do its job.

---

## Default Template

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

## Customized Example

A TOOLS.md for a home automation agent:

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

## Tips

- **Keep it current** — stale entries confuse the agent. Remove devices you no longer have.
- **Be specific** — "192.168.1.100, user: admin" is more useful than "home server"
- **Don't put secrets here** — SSH keys, passwords, API tokens belong in environment variables or a secrets manager, not in a plain markdown file
- **Subagents see this too** — notes here are available in cron jobs and spawned subagents, which is useful for automation tasks

---

## What's Next

- [Context Files](#context-files) — all 7 context files and their loading order
- [System Prompt Anatomy](#system-prompt-anatomy) — where TOOLS.md fits in the prompt (minimal mode included)
- [AGENTS.md Template](#template-agents) — operating instructions that reference tools

<!-- goclaw-source: 57754a5 | updated: 2026-03-18 -->
