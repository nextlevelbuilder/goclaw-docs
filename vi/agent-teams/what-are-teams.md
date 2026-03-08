> Bản dịch từ [English version](../../agent-teams/what-are-teams.md)

# Agent Team là gì?

Agent team cho phép nhiều agent cùng cộng tác trên các task chung. Một agent **lead** điều phối công việc, trong khi các **member** thực thi task độc lập và báo cáo kết quả lại.

## Mô hình Team

Một team bao gồm:
- **Lead Agent**: Điều phối công việc, tạo task, phân công cho member, tổng hợp kết quả
- **Member Agents**: Nhận task từ board chung, thực thi độc lập, tự động thông báo kết quả
- **Shared Task Board**: Theo dõi công việc, phụ thuộc, mức độ ưu tiên, trạng thái
- **Team Mailbox**: Tin nhắn trực tiếp giữa các member, broadcast đến tất cả

```mermaid
flowchart TD
    subgraph Team["Agent Team"]
        LEAD["Lead Agent<br/>Điều phối công việc, tạo task,<br/>phân công cho member, tổng hợp kết quả"]
        M1["Member A<br/>Nhận và thực thi task"]
        M2["Member B<br/>Nhận và thực thi task"]
        M3["Member C<br/>Nhận và thực thi task"]
    end

    subgraph Shared["Tài nguyên dùng chung"]
        TB["Task Board<br/>Tạo, nhận, hoàn thành task"]
        MB["Mailbox<br/>Tin nhắn trực tiếp, broadcast"]
    end

    USER["Người dùng"] -->|tin nhắn| LEAD
    LEAD -->|tạo task + phân công| M1 & M2 & M3
    M1 & M2 & M3 -->|kết quả tự động thông báo| LEAD
    LEAD -->|phản hồi tổng hợp| USER

    LEAD & M1 & M2 & M3 <--> TB
    LEAD & M1 & M2 & M3 <--> MB
```

## Nguyên tắc Thiết kế Cốt lõi

**Lead là trung tâm**: Lead nhận toàn bộ `TEAM.md` với hướng dẫn điều phối trong system prompt. Member chỉ nhận context team tối giản (tên team, vai trò của họ, các tool có sẵn) — không lãng phí token vào các agent đang rảnh.

**Bắt buộc theo dõi task**: Mọi delegation phải liên kết với một task trên board. Hệ thống bắt buộc điều này — delegation không có `team_task_id` sẽ bị từ chối.

**Tự động hoàn thành**: Khi một delegation kết thúc, task liên kết của nó được tự động đánh dấu hoàn thành. Không cần ghi chép thủ công.

**Xử lý song song**: Khi nhiều member làm việc đồng thời, kết quả được thu thập trong một lần thông báo duy nhất đến lead.

## Ví dụ Thực tế

**Tình huống**: Người dùng yêu cầu lead phân tích một bài nghiên cứu và viết tóm tắt.

1. Lead nhận yêu cầu
2. Lead tạo hai task: "Trích xuất điểm chính" và "Viết tóm tắt"
3. Lead giao task đầu tiên cho member Researcher
4. Researcher làm việc, hoàn thành task
5. Lead giao task thứ hai cho member Writer cùng với kết quả từ Researcher
6. Writer hoàn thành, kết quả tự động thông báo đến lead
7. Lead tổng hợp và gửi phản hồi cuối cùng cho người dùng

## Team so với các Mô hình Delegation Khác

| Khía cạnh | Agent Team | Delegation Đơn giản | Agent Link |
|--------|-----------|-------------------|-----------|
| **Điều phối** | Lead điều phối qua task board | Parent chờ kết quả | Ngang hàng trực tiếp |
| **Theo dõi Task** | Task board chung, phụ thuộc, ưu tiên | Không theo dõi | Không theo dõi |
| **Nhắn tin** | Mailbox cho giao tiếp nội bộ | Chỉ với parent | Chỉ với parent |
| **Khả năng mở rộng** | Thiết kế cho 3–10 member | Parent-child đơn giản | Liên kết 1-1 |
| **Context TEAM.md** | Lead có đầy đủ; member có tối giản | Không áp dụng | Không áp dụng |
| **Trường hợp dùng** | Nghiên cứu song song, review nội dung, phân tích | Delegate nhanh & chờ | Chuyển giao hội thoại |

**Dùng Team khi**:
- 3+ agent cần làm việc cùng nhau
- Task có phụ thuộc hoặc ưu tiên
- Member cần giao tiếp với nhau
- Kết quả cần xử lý song song

**Dùng Delegation Đơn giản khi**:
- Một parent delegate cho một child
- Cần kết quả đồng bộ nhanh
- Không cần giao tiếp giữa các agent

**Dùng Agent Link khi**:
- Hội thoại cần chuyển giao giữa các agent
- Không cần task board hay điều phối
