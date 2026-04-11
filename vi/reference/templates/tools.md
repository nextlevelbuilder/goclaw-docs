> Bản dịch từ [English version](/template-tools)

# TOOLS.md Template

> File ghi chú local cho chi tiết tool theo môi trường — tên camera, SSH host, TTS voice, biệt danh thiết bị.

## Tổng quan

`TOOLS.md` là **cheat sheet** của agent cho setup của bạn. Skills định nghĩa _cách_ tool hoạt động nói chung; file này lưu những đặc thù riêng của môi trường bạn.

GoClaw load file này vào phần **Project Context** của system prompt. Nó cũng được load ở **minimal mode** (subagent, cron session) — vì vậy ghi chú ở đây cũng có sẵn cho các tác vụ tự động.

**Phạm vi:**
- Open agent: per-user (đặc thù môi trường, riêng tư cho mỗi user)
- Predefined agent: cấp agent (ghi chú chia sẻ về tool dùng chung cho tất cả user của agent đó)

File có dạng tự do có chủ ý — thêm bất cứ gì giúp agent làm việc tốt hơn.

---

## Template Mặc định

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

## Ví dụ tùy chỉnh

TOOLS.md cho home automation agent:

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

## Mẹo

- **Giữ cập nhật** — thông tin cũ gây nhầm lẫn cho agent. Xóa thiết bị bạn không còn dùng.
- **Cụ thể hóa** — "192.168.1.100, user: admin" hữu ích hơn "home server"
- **Không đặt secrets ở đây** — SSH key, mật khẩu, API token thuộc về biến môi trường hoặc secrets manager, không phải file markdown thường
- **Subagent cũng thấy file này** — ghi chú ở đây có sẵn trong cron job và spawned subagent, rất hữu ích cho tác vụ tự động

---

## Tiếp theo

- [Context Files](../../../agents/context-files.md) — tất cả 7 context file và thứ tự load
- [System Prompt Anatomy](/system-prompt-anatomy) — vị trí của TOOLS.md trong prompt (bao gồm minimal mode)
- [AGENTS.md Template](/template-agents) — hướng dẫn vận hành tham chiếu tool

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
