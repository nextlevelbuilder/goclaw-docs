> Ban dich tu [English version](../../channels/slack.md)

# Channel Slack

Tich hop Slack qua Socket Mode (WebSocket). Ho tro DM, @mention trong channel, tra loi theo thread, streaming, reaction, media, va message debouncing.

## Thiet lap

**Tao Slack App:**
1. Vao https://api.slack.com/apps?new_app=1
2. Chon "From scratch", dat ten app (vd: `GoClaw Bot`), chon workspace
3. Click **Create App**

**Bat Socket Mode:**
1. Thanh ben trai -> **Socket Mode** -> bat ON
2. Dat ten token (vd: `goclaw-socket`), them scope `connections:write`
3. Sao chep **App-Level Token** (`xapp-...`)

**Them Bot Scopes:**
1. Thanh ben trai -> **OAuth & Permissions**
2. Trong **Bot Token Scopes**, them:

| Scope | Muc dich |
|-------|---------|
| `app_mentions:read` | Nhan su kien @bot mention |
| `chat:write` | Gui va chinh sua tin nhan |
| `im:history` | Doc tin nhan DM |
| `im:read` | Xem danh sach DM channel |
| `im:write` | Mo DM voi user |
| `channels:history` | Doc tin nhan public channel |
| `groups:history` | Doc tin nhan private channel |
| `mpim:history` | Doc tin nhan multi-party DM |
| `reactions:write` | Them/xoa emoji reaction (tuy chon) |
| `reactions:read` | Doc emoji reaction (tuy chon) |
| `files:read` | Tai file gui den bot |
| `files:write` | Upload file tu agent |
| `users:read` | Lay ten hien thi user |

**Tap toi thieu** (chi DM, khong reaction/file): `chat:write`, `im:history`, `im:read`, `im:write`, `users:read`, `app_mentions:read`

**Bat Event:**
1. Thanh ben trai -> **Event Subscriptions** -> bat ON
2. Trong **Subscribe to bot events**, them:

| Event | Mo ta |
|-------|-------------|
| `message.im` | Tin nhan DM voi bot |
| `message.channels` | Tin nhan trong public channel |
| `message.groups` | Tin nhan trong private channel |
| `message.mpim` | Tin nhan multi-party DM |
| `app_mention` | Khi bot duoc @mention |

Khong can Request URL — Socket Mode xu ly event qua WebSocket.

**Cai dat & Lay Token:**
1. **OAuth & Permissions** -> **Install to Workspace** -> **Allow**
2. Sao chep **Bot User OAuth Token** (`xoxb-...`)

**Bat Slack trong GoClaw:**

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "bot_token": "xoxb-YOUR-BOT-TOKEN",
      "app_token": "xapp-YOUR-APP-LEVEL-TOKEN",
      "dm_policy": "pairing",
      "group_policy": "open",
      "require_mention": true
    }
  }
}
```

Hoac qua bien moi truong:

```bash
GOCLAW_SLACK_BOT_TOKEN=xoxb-...
GOCLAW_SLACK_APP_TOKEN=xapp-...
# Tu dong bat Slack khi ca hai duoc thiet lap
```

**Moi Bot vao Channel:**
- Public: `/invite @GoClaw Bot` trong channel
- Private: Ten channel -> **Integrations** -> **Add an App**
- DM: Nhan tin truc tiep cho bot

## Cau hinh

Tat ca config key nam trong `channels.slack`:

| Key | Kieu | Mac dinh | Mo ta |
|-----|------|---------|-------------|
| `enabled` | bool | false | Bat/tat channel |
| `bot_token` | string | bat buoc | Bot User OAuth Token (`xoxb-...`) |
| `app_token` | string | bat buoc | App-Level Token cho Socket Mode (`xapp-...`) |
| `user_token` | string | -- | User OAuth Token cho dinh danh tuy chinh (`xoxp-...`) |
| `allow_from` | list | -- | Danh sach trang user ID hoac channel ID |
| `dm_policy` | string | `"pairing"` | `pairing`, `allowlist`, `open`, `disabled` |
| `group_policy` | string | `"open"` | `open`, `pairing`, `allowlist`, `disabled` |
| `require_mention` | bool | true | Yeu cau @bot mention trong channel |
| `history_limit` | int | 50 | Tin nhan cho toi da moi channel cho context (0=tat) |
| `dm_stream` | bool | false | Bat streaming cho DM |
| `group_stream` | bool | false | Bat streaming cho group |
| `native_stream` | bool | false | Dung Slack ChatStreamer API neu co |
| `reaction_level` | string | `"off"` | `off`, `minimal`, `full` |
| `block_reply` | bool | -- | Ghi de block_reply cua gateway (nil=ke thua) |
| `debounce_delay` | int | 300 | Mili giay truoc khi gui cac tin nhan nhanh (0=tat) |
| `thread_ttl` | int | 24 | Gio truoc khi thread participation het han (0=tat) |
| `media_max_bytes` | int | 20MB | Kich thuoc file tai toi da |

## Loai Token

| Token | Tien to | Bat buoc | Muc dich |
|-------|--------|----------|---------|
| Bot Token | `xoxb-` | Co | API chinh: tin nhan, reaction, file, thong tin user |
| App-Level Token | `xapp-` | Co | Ket noi WebSocket Socket Mode |
| User Token | `xoxp-` | Khong | Dinh danh bot tuy chinh (ten/icon) |

Tien to token duoc kiem tra khi khoi dong — token sai se bao loi ro rang.

## Tinh nang

### Socket Mode

Dung WebSocket thay vi HTTP webhook. Khong can URL cong khai hoac ingress — ly tuong cho trien khai tu quan ly. Event duoc xac nhan trong 3 giay theo yeu cau cua Slack.

Phan loai dead socket phat hien loi auth khong the thu lai (`invalid_auth`, `token_revoked`, `missing_scope`) va dung channel thay vi thu lai vo han.

### Mention Gating

Trong channel, bot chi phan hoi khi duoc @mention (mac dinh `require_mention: true`). Tin nhan khong mention duoc luu vao bo dem lich su va duoc dua vao lam context khi bot duoc mention tiep theo.

```mermaid
flowchart TD
    MSG["User dang trong channel"] --> MENTION{"Bot duoc @mention<br/>hoac trong thread da tham gia?"}
    MENTION -->|Khong| BUFFER["Them vao lich su cho<br/>(toi da 50 tin nhan)"]
    MENTION -->|Co| PROCESS["Xu ly ngay<br/>Bao gom lich su lam context"]
    BUFFER --> NEXT["Mention tiep theo:<br/>lich su duoc bao gom"]
```

### Thread Participation

Sau khi bot tra loi trong thread, bot tu dong tra loi cac tin nhan tiep theo trong thread do ma khong can @mention. Participation het han sau `thread_ttl` gio (mac dinh 24). Dat `thread_ttl: 0` de tat (luon yeu cau @mention).

### Message Debouncing

Cac tin nhan nhanh tu cung thread duoc gom lai thanh mot lan gui. Delay mac dinh: 300ms (cau hinh qua `debounce_delay`). Cac batch dang cho duoc flush khi shutdown.

### Dinh dang tin nhan

Markdown tu LLM duoc chuyen sang Slack mrkdwn:

```
Markdown -> Slack mrkdwn
**bold**  -> *bold*
_italic_  -> _italic_
~~strike~~ -> ~strike~
# Header  -> *Header*
[text](url) -> <url|text>
```

Bang duoc render dang code block. Slack token (`<@U123>`, `<#C456>`, URL) duoc bao toan qua qua trinh chuyen doi. Tin nhan vuot qua 4,000 ky tu duoc tach tai ranh gioi xuong dong.

### Streaming

Bat cap nhat phan hoi truc tiep qua `chat.update` (sua tai cho):

- **DM** (`dm_stream`): Sua placeholder "Thinking..." khi chunk den
- **Group** (`group_stream`): Tuong tu, trong thread

Cap nhat duoc gioi han 1 lan/giay de tranh rate limit Slack. Dat `native_stream: true` de dung Slack ChatStreamer API khi co.

### Reaction

Hien thi emoji trang thai tren tin nhan user. Dat `reaction_level`:

- `off` — Khong reaction (mac dinh)
- `minimal` — Chi thinking va done
- `full` — Tat ca trang thai: thinking, tool use, done, error, stall

| Trang thai | Emoji |
|--------|-------|
| Thinking | :thinking_face: |
| Tool use | :hammer_and_wrench: |
| Done | :white_check_mark: |
| Error | :x: |
| Stall | :hourglass_flowing_sand: |

Reaction duoc debounce 700ms de tranh spam API.

### Xu ly Media

**Nhan file:** File dinh kem duoc tai xuong voi bao ve SSRF (danh sach host cho phep: `*.slack.com`, `*.slack-edge.com`, `*.slack-files.com`). Auth token bi xoa khi redirect. File vuot `media_max_bytes` (mac dinh 20MB) bi bo qua.

**Gui file:** File tu agent duoc upload qua Slack file upload API. Upload that bai hien thi loi inline.

**Trich xuat tai lieu:** File tai lieu (PDF, text) duoc trich xuat noi dung va them vao tin nhan de agent xu ly.

### Dinh danh Bot Tuy chinh

Voi User Token (`xoxp-`) tuy chon, bot co the dang voi ten va icon tuy chinh:

1. Trong **OAuth & Permissions** -> **User Token Scopes** -> them `chat:write.customize`
2. Cai lai app
3. Them `user_token` vao config

### Group Policy: Pairing

Slack ho tro pairing cap group. Khi `group_policy: "pairing"`:
- Admin phe duyet channel qua CLI: `goclaw pairing approve <code>`
- Hoac qua GoClaw web UI (phan Pairing)
- Ma pairing cho group **khong** hien thi trong channel (bao mat: tat ca thanh vien deu thay)

Danh sach `allow_from` ho tro ca user ID va Slack channel ID cho allowlist cap group.

## Xu ly su co

| Van de | Giai phap |
|-------|----------|
| `invalid_auth` khi khoi dong | Token sai hoac bi thu hoi. Tao lai token trong Slack app settings. |
| Loi `missing_scope` | Scope can thiet chua duoc them. Them scope trong OAuth & Permissions, cai lai app. |
| Bot khong phan hoi trong channel | Bot chua duoc moi vao channel. Chay `/invite @BotName`. |
| Bot khong phan hoi DM | DM policy la `disabled` hoac can pairing. Kiem tra config `dm_policy`. |
| Socket Mode khong ket noi | App-Level Token (`xapp-`) thieu hoac sai. Kiem tra trang Basic Information. |
| Bot phan hoi khong co ten rieng | User Token chua cau hinh. Them `user_token` voi scope `chat:write.customize`. |
| Tin nhan bi xu ly hai lan | Dedup Socket Mode co san. Neu van xay ra, kiem tra duplicate app_mention + message event — hanh vi binh thuong, dedup xu ly. |
| Tin nhan nhanh gui rieng le | Tang `debounce_delay` (mac dinh 300ms). |
| Thread tu dong tra loi dung | Thread participation het han (`thread_ttl`, mac dinh 24h). Mention bot lai. |

## Tiep theo

- [Tong quan](./overview.md) — Khai niem va chinh sach channel
- [Telegram](./telegram.md) — Thiet lap Telegram bot
- [Discord](./discord.md) — Thiet lap Discord bot
- [Browser Pairing](./browser-pairing.md) — Luong pairing
