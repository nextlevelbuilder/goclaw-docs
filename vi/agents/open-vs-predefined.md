> Bản dịch từ [English version](/open-vs-predefined)

# Open vs. Predefined Agent

> Hai kiến trúc agent: cô lập theo từng user (open) hay context dùng chung (predefined).

## Tổng quan

GoClaw hỗ trợ hai loại agent với mô hình cô lập context khác nhau. Chọn **open** khi mỗi user cần personality và bộ nhớ riêng hoàn chỉnh. Chọn **predefined** khi bạn muốn một cấu hình agent dùng chung với profile riêng cho từng user.

## Cây quyết định

```
Bạn có muốn mỗi user có:
- SOUL.md, IDENTITY.md, personality riêng?
- Bộ nhớ riêng biệt?
- Cấu hình tool riêng?
          |
          CÓ → Open Agent (mọi thứ theo từng user)
          |
          KHÔNG → Predefined Agent (context dùng chung + chỉ USER.md theo user)
```

## So sánh song song

| Khía cạnh | Open | Predefined |
|--------|------|-----------|
| **Context isolation** | Theo user: 5 file seeded + MEMORY.md (riêng) | Theo agent: 5 file dùng chung + USER.md theo user + BOOTSTRAP.md |
| **SOUL.md** | Theo user (seeded từ template khi chat lần đầu) | Theo agent (dùng chung cho tất cả user) |
| **IDENTITY.md** | Theo user (seeded từ template khi chat lần đầu) | Theo agent (dùng chung cho tất cả user) |
| **USER.md** | Theo user (seeded từ template khi chat lần đầu) | Theo user (seeded từ fallback cấp agent hoặc template) |
| **AGENTS.md** | Theo user (seeded từ template) | Theo agent (dùng chung) |
| **TOOLS.md** | Không seeded (load runtime từ workspace nếu có) | Không seeded (bỏ qua trong `SeedToStore`) |
| **MEMORY.md** | Theo user (lưu riêng, không thuộc seeding) | Theo user (lưu riêng, không thuộc seeding) |
| **BOOTSTRAP.md** | Theo user (nghi lễ lần đầu, seeded từ template) | Theo user (biến thể tập trung vào user `BOOTSTRAP_PREDEFINED.md`) |
| **USER_PREDEFINED.md** | Không có | Theo agent (quy tắc xử lý user cơ bản) |
| **Use case** | Personal assistant, agent theo từng user | Dịch vụ dùng chung: FAQ bot, support agent, shared tool |
| **Quy mô** | N user × 5 file seeded | 4 file agent + N user × 2 file |
| **Tuỳ chỉnh** | User có thể tuỳ chỉnh mọi thứ | User chỉ có thể tuỳ chỉnh USER.md |
| **Tính nhất quán personality** | Mỗi user có personality riêng | Tất cả user thấy cùng một personality |

## Open Agent

Phù hợp nhất cho: personal assistant, workspace theo từng user, agent thử nghiệm.

Khi user mới bắt đầu chat với open agent:

1. **AGENTS.md, SOUL.md, IDENTITY.md, USER.md, BOOTSTRAP.md** được seeded vào `user_context_files` từ template nhúng sẵn (TOOLS.md không seeded — load từ workspace lúc runtime nếu có)
2. **BOOTSTRAP.md** chạy như một nghi lễ lần đầu (thường hỏi "tôi là ai?" và "bạn là ai?")
3. User viết **IDENTITY.md, SOUL.md, USER.md** theo sở thích của họ
4. User đánh dấu **BOOTSTRAP.md** trống để báo hoàn thành
5. **MEMORY.md** (nếu có) được giữ nguyên qua các session

Context isolation:
- Cô lập personality hoàn toàn theo từng user
- User không thấy file của nhau
- Mỗi user định hình agent theo nhu cầu của mình

## Predefined Agent

Phù hợp nhất cho: dịch vụ dùng chung, FAQ bot, support agent của công ty, hệ thống multi-tenant.

Khi bạn tạo predefined agent:

1. **AGENTS.md, SOUL.md, IDENTITY.md** được seeded vào `agent_context_files` (USER.md và TOOLS.md bị bỏ qua — USER.md chỉ theo user, TOOLS.md load lúc runtime)
2. **USER_PREDEFINED.md** được seeded riêng (quy tắc xử lý user cơ bản)
3. Tuỳ chọn: "summoning" dùng LLM tạo **SOUL.md, IDENTITY.md, USER_PREDEFINED.md** từ mô tả của bạn. AGENTS.md và TOOLS.md luôn dùng template nhúng sẵn — không được tạo bởi summoning.
4. Tất cả user thấy cùng một personality và hướng dẫn

Khi user mới bắt đầu chat:

1. **USER.md, BOOTSTRAP.md** (biến thể tập trung vào user) được seeded vào `user_context_files`
2. User điền **USER.md** với profile của họ (tuỳ chọn)
3. Agent giữ personality nhất quán cho tất cả user

Context isolation:
- Personality agent bị khoá (dùng chung)
- Chỉ USER.md là theo từng user
- USER_PREDEFINED.md (cấp agent) có thể định nghĩa quy tắc xử lý user chung

## Ví dụ: Cá nhân vs. Dùng chung

### Open: Personal Researcher

```
User: Alice
├── SOUL.md: "I like sarcasm, bold opinions, fast answers"
├── IDENTITY.md: "I'm Alice's research partner, irreverent and brilliant"
├── USER.md: "Alice is a startup founder in biotech"
└── MEMORY.md: "Alice's key research projects, key contacts, funding status..."

User: Bob
├── SOUL.md: "I'm formal, thorough, conservative"
├── IDENTITY.md: "I'm Bob's trusted researcher, careful and methodical"
├── USER.md: "Bob is an academic in philosophy"
└── MEMORY.md: "Bob's papers, collaborators, dissertation status..."
```

Cùng một agent (`researcher`), hai personality hoàn toàn khác nhau. Mỗi user định hình agent theo nhu cầu của mình.

### Predefined: FAQ Bot (Dùng chung)

```
Agent: faq-bot (predefined)
├── SOUL.md: "Helpful, patient, empathetic support agent" (DÙNG CHUNG)
├── IDENTITY.md: "FAQ Assistant — always friendly" (DÙNG CHUNG)
├── AGENTS.md: "Answer questions from our knowledge base" (DÙNG CHUNG)

User: Alice → USER.md: "Alice is a premium customer, escalate complex issues"
User: Bob → USER.md: "Bob is a free-tier user, point to self-service docs"
User: Carol → USER.md: "Carol is a beta tester, gather feedback on new features"
```

Cùng một personality agent, context khác nhau theo từng user. Agent điều chỉnh phản hồi dựa trên người dùng là ai, nhưng vẫn giữ giọng điệu và hướng dẫn nhất quán.

## Khi nào chọn loại nào

### Chọn Open khi:
- Bạn đang xây dựng personal assistant (một user, một agent)
- Mỗi user muốn định hình personality của agent
- Bạn muốn cô lập bộ nhớ theo từng user
- Quyền truy cập tool khác biệt đáng kể giữa các user
- Bạn muốn user tuỳ chỉnh SOUL.md và IDENTITY.md

### Chọn Predefined khi:
- Bạn đang xây dựng dịch vụ dùng chung (FAQ bot, support agent, help desk)
- Bạn muốn personality nhất quán cho tất cả user
- Mỗi user chỉ có profile (tên, tier, sở thích)
- Hành vi cốt lõi của agent không thay đổi theo user
- Bạn muốn LLM tự tạo personality từ mô tả

## Chi tiết kỹ thuật

### Open: File theo từng User

Seeded vào `user_context_files` (`userSeedFilesOpen`):
```
AGENTS.md          — cách vận hành
SOUL.md            — personality (seeded từ template khi chat lần đầu)
IDENTITY.md        — bạn là ai (seeded từ template khi chat lần đầu)
USER.md            — về user (seeded từ template khi chat lần đầu)
BOOTSTRAP.md       — nghi lễ lần đầu (xoá khi trống)
```

**Không seeded:** TOOLS.md (load từ workspace lúc runtime), MEMORY.md (hệ thống bộ nhớ riêng)

### Predefined: File Agent + User

Cấp agent qua `SeedToStore()` — lặp `templateFiles` nhưng **bỏ qua USER.md và TOOLS.md**:
```
AGENTS.md          — cách vận hành
SOUL.md            — personality (tuỳ chọn tạo qua summoning)
CAPABILITIES.md    — kiến thức chuyên môn & kỹ năng (seeded từ template; backfilled khi khởi động cho agent cũ)
IDENTITY.md        — bạn là ai (tuỳ chọn tạo qua summoning)
USER_PREDEFINED.md — quy tắc xử lý user cơ bản (seeded riêng)
```

> **Capabilities backfill:** Khi khởi động, GoClaw chạy `BackfillCapabilities()` một lần để seed `CAPABILITIES.md` cho các agent hiện có chưa có file này. Quá trình này idempotent — agent đã có file sẽ không bị ảnh hưởng.

Theo user qua `SeedUserFiles()` (`userSeedFilesPredefined`):
```
USER.md            — về user này (ưu tiên USER.md cấp agent làm seed nếu có)
BOOTSTRAP.md       — onboarding tập trung vào user (dùng template BOOTSTRAP_PREDEFINED.md)
```

## Migration

Chưa quyết định? Bắt đầu với **open**. Bạn luôn có thể:
- Khoá SOUL.md và IDENTITY.md để tiến gần đến hành vi predefined
- Dùng AGENTS.md để định nghĩa hướng dẫn cứng

Hoặc chuyển sang **predefined** sau nếu agent vượt ra ngoài phạm vi single-user.

## Các vấn đề thường gặp

| Vấn đề | Giải pháp |
|---------|----------|
| Chỉnh sửa của user biến mất sau khi khởi động lại | Bạn đang dùng predefined mode — thay đổi của user trên SOUL.md bị ghi đè. Chuyển sang open mode hoặc dùng USER.md để tuỳ chỉnh theo user |
| Agent hành xử khác nhau theo từng user | Bình thường trong open mode — mỗi user có context file riêng. Dùng predefined nếu muốn hành vi nhất quán |
| Không tìm thấy context file trên đĩa | Context file nằm trong database (`agent_context_files` / `user_context_files`), không phải trên filesystem |

## Tiếp theo

- [Context Files](/context-files) — tìm hiểu sâu về từng file (SOUL.md, IDENTITY.md, v.v.)
- [Summoning & Bootstrap](/summoning-bootstrap) — cách personality được tạo ra cho predefined agent
- [Creating Agents](/creating-agents) — hướng dẫn tạo agent

<!-- goclaw-source: 050aafc9 | cập nhật: 2026-04-09 -->
