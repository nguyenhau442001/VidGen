# Research Framework — 7 Phase

Tài liệu này mở rộng quy trình 7 phase nêu trong `SKILL.md`. Đọc song song với
`audience-pain-framework.md`, `source-hierarchy.md`, `viral-angle-framework.md`,
`visual-opportunity-framework.md` khi thực hiện phase tương ứng.

---

## Phase 1 — Frame the Topic

**Mục tiêu:** biến một chủ đề chung chung thành một câu hỏi nghiên cứu có thể trả lời được.

Trả lời trước khi đi tiếp:
- Chủ đề chính là gì?
- Vấn đề thực tế đứng sau chủ đề là gì (không phải chỉ tên công nghệ)?
- Công cụ / công nghệ nào liên quan trực tiếp?
- Nhóm người nào thực sự có khả năng quan tâm — không phải "mọi người"?
- Điều audience hiện đã biết là gì?
- Điều họ đang hiểu sai hoặc chưa biết là gì?
- Video này muốn tạo ra outcome/thay đổi nhận thức gì ở người xem?

**Output của phase này:** một câu hỏi nghiên cứu, không phải một tiêu đề video.

Ví dụ chuyển đổi:

| Chủ đề chung | Câu hỏi nghiên cứu |
|---|---|
| "Claude Skills cho marketing" | "Marketer đang lặp lại những công việc hướng dẫn AI nào, và phần nào có thể đóng gói thành Claude Skills mà không thay thế phán đoán chuyên môn của marketer?" |
| "AI trong tuyển dụng" | "HR đang dùng AI để lọc CV ở bước nào, và ứng viên mất niềm tin vào bước nào nhất?" |
| "Grab giao đồ ăn chậm" | "Vì sao đơn hàng gần nhà hàng vẫn giao chậm hơn đơn xa — hệ thống batch/dispatch đang tối ưu cho cái gì?" |

Nếu không thể viết một câu hỏi nghiên cứu rõ ràng sau Phase 1, quay lại hỏi người dùng
để thu hẹp phạm vi — đừng đoán.

---

## Phase 2 — Build Audience Hypotheses

Xem chi tiết đầy đủ tại `audience-pain-framework.md`. Tóm tắt: tối đa 3 segment, mỗi
segment mô tả bằng hành vi/công việc/áp lực/quyết định — không tạo persona hư cấu có
tên tuổi sở thích không liên quan.

---

## Phase 3 — Collect Evidence

Xem `source-hierarchy.md` cho thứ tự ưu tiên nguồn và `evidence-quality.md` cho cách
phân loại độ tin cậy. Nguyên tắc cốt lõi: community discussion chỉ dùng để phát hiện
ngôn ngữ, giả thuyết pain, objection, và câu hỏi phổ biến — không dùng để kết luận về
toàn ngành.

Mỗi nguồn phải log đủ: title, organization/author, URL, publish date, access date (nếu
có), source type, claim được hỗ trợ, reliability level, limitations. Dùng
`templates/source-log.template.md`.

---

## Phase 4 — Extract Marketing Intelligence

Phân tích dữ liệu thu thập được qua các khung sau (định nghĩa đầy đủ ở
`marketing-fundamentals.md`):

- **Jobs to Be Done**: functional job / emotional job / social job.
- **Pain analysis**: frequency, severity, cost of inaction, workaround hiện tại, vì sao
  giải pháp hiện tại thất bại.
- **Trigger events**: chuyện gì xảy ra ngay trước khi người dùng bắt đầu tìm giải pháp
  (deadline, brief mới, campaign thất bại, manager feedback, output AI thiếu nhất quán,
  dữ liệu quá tải…).
- **Objections**: quá kỹ thuật, tốn thời gian setup, không đáng tin, không hiểu thương
  hiệu, lo lắng về dữ liệu, không khác gì prompt thông thường, khó duy trì.
- **Customer language**: giữ nguyên cụm từ audience thực sự dùng — chưa vội biến thành
  jargon marketing.
- **Alternatives**: làm thủ công, prompt template, custom instructions, project
  knowledge, thuê freelancer, dùng công cụ khác, hoặc không giải quyết vấn đề gì cả.

---

## Phase 5 — Find the Core Tension

Mỗi video tốt xoay quanh **một** mâu thuẫn trung tâm, ví dụ:

- AI được mua để tiết kiệm thời gian, nhưng người dùng lại mất thời gian hướng dẫn nó
  lặp đi lặp lại.
- Marketer có rất nhiều dữ liệu khách hàng nhưng không có thời gian đọc.
- AI viết rất nhanh nhưng content vẫn sai giọng thương hiệu.
- Công cụ sản xuất nhanh hơn nhưng chất lượng ý tưởng không tăng tương ứng.
- Nội dung tạo ra nhiều hơn nhưng hiểu khách hàng ít hơn.

Core tension hợp lệ khi đồng thời:
1. Liên quan trực tiếp đến audience đã xác định ở Phase 2.
2. Hiểu được trong vài giây, không cần giải thích dài.
3. Không phụ thuộc vào jargon.
4. Có tiềm năng visual (xem `visual-opportunity-framework.md`).
5. Có thể chứng minh bằng bằng chứng đã thu thập.
6. Không bóp méo sự thật để tạo kịch tính.

---

## Phase 6 — Generate Content Angles

Sinh 5–8 angle khác biệt — khác nhau về góc nhìn, không chỉ khác cách viết hook. Chi
tiết cấu trúc từng angle, cách chấm điểm và trade-off, xem `viral-angle-framework.md`.

---

## Phase 7 — Evaluate VidGen Opportunities

Với mỗi angle đủ mạnh (điểm trung bình cao và exaggeration_risk thấp), xác định tiềm
năng visual — không viết JSON. Chi tiết đầy đủ ở `visual-opportunity-framework.md`.

---

## Lỗi thường gặp cần tránh xuyên suốt 7 phase

- Nhảy thẳng vào Phase 6 (angle) khi chưa có evidence thật ở Phase 3 → angle sẽ dựa
  trên phỏng đoán và dễ vi phạm nguyên tắc "không bịa số liệu".
- Audience segment quá rộng ("tất cả marketer") → pain phân tích sẽ vô nghĩa vì không
  cụ thể được trigger event hay objection.
- Core tension đúng nhưng không liên quan gì đến audience đã chọn — kiểm tra chéo lại
  Phase 2 và Phase 5 trước khi sang Phase 6.
- Angle hay nhưng không thể visual hóa được trong VidGen — vẫn đưa vào angle-matrix
  nhưng ghi rõ `vidgen_fit` thấp, đừng chọn làm `recommended_angle`.
