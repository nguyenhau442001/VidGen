# Narrative Outline — Mỗi ngày marketer lại onboarding một AI intern mới

- Slug: ai-marketing-office-vietnam-p1
- Nguồn: research/ai-marketing-office-vietnam/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: Mỗi ngày marketer lại onboarding một AI intern mới

## Hidden Objective Function Mapping

- Wrong belief: AI chatbot tự động tiết kiệm thời gian ngay khi bắt đầu dùng — vấn đề chỉ
  là viết prompt cho hay.
- True objective: Thời gian thật sự bị mất nằm ở việc lặp lại brand voice/ngữ cảnh mỗi
  phiên — và đó là vấn đề cấu trúc quy trình, không phải vấn đề viết prompt hay hơn.
- Aha moment: Một "công thức brief" đóng gói lại một lần loại bỏ phần lớn công việc dạy
  lại AI lặp đi lặp lại mỗi phiên làm việc mới (new_belief ∩ proof_mechanism từ angle-matrix.json).

## Retention Arc

### Hook (0–5s) — pain_recognition
- Scene concept: Marketer mở AI chat mỗi sáng, gõ lại đoạn brand voice quen thuộc — cảnh
  lặp lại y hệt nhiều ngày liên tiếp.
- Narration draft: "Ngày nào cũng dạy lại AI."
- possible_scene_types: cần xác nhận với vidgen-scene-director — có thể tái sử dụng dạng
  scene UI chat lặp lại theo pattern PhoneShotZoomScene đã có trong repo.

### Tension (5–20s) — escalation
- Scene concept: Nhân rộng cảnh pain_recognition qua nhiều ngày trong tuần với nhiều loại
  task khác nhau (mail xin lỗi khách, biên bản họp, báo cáo tuần) — đúng nhịp mô tả thật
  từ cộng đồng marketer VN (source S006, research-brief mục 10).
- Narration draft: "Thứ hai mail xin lỗi khách. Thứ tư báo cáo tuần. Mỗi lần — viết lại từ đầu."
- possible_scene_types: cần xác nhận — có thể là dạng scene lịch tuần/timeline.

### Reveal (20–55s) — reframe / mechanism / proof

**Reframe**
- Scene concept: Chuyển góc nhìn — vấn đề không phải AI "quên", mà là chưa có nơi nào lưu
  lại "công thức brief"; hình ảnh một cuốn sổ tay xuất hiện thay thế việc gõ lại từ đầu.
- Narration draft: "Vấn đề không phải AI quên. Là chưa ai viết sổ tay cho nó."
- possible_scene_types: cần xác nhận — có thể là scene dạng before/after side-by-side.

**Mechanism**
- Scene concept: Giải thích ngắn gọn cấu trúc brief có tổ chức (vai trò, đối tượng, giọng
  văn mẫu — theo khung 7 thành phần từ nguồn S004) dùng lại nhiều lần thay vì viết lại.
- Narration draft: "Một bản brief đóng gói sẵn — vai trò, đối tượng, giọng văn. Dùng lại, không viết lại."
- possible_scene_types: cần xác nhận — có thể tái sử dụng dạng scene giải thích luồng dữ
  liệu như trong series grab_dispatch.

**Proof**
- Scene concept: So sánh trực quan số bước phải lặp lại: luồng cũ (dài, lặp lại brand
  voice mỗi lần) vs luồng mới (ngắn, một lần đóng gói).
- Narration draft: "Cách cũ: gõ lại mỗi lần. Cách mới: một lần, dùng mãi."
- possible_scene_types: cần xác nhận — dạng scene so sánh song song hoặc đếm số bước.
- Disclaimer cần giữ (từ angle-matrix.json → disclaimers, và video-opportunity.json →
  risk của visual opportunity "proof"): số bước minh họa trong scene này là ví dụ minh
  họa, KHÔNG phải số liệu đã đo thực tế — chưa có case study định lượng thật tại thời
  điểm nghiên cứu (xem Evidence Gaps, research-brief.md mục 18). Cần 1 dòng on-screen
  text nhỏ "*ví dụ minh họa" ở scene này.

### Resolution (55–65s) — payoff
- Scene concept: Khoảnh khắc marketer nhận ra vấn đề của họ không phải "không biết viết
  prompt hay" mà là "chưa ai chỉ cách đóng gói lại quy trình" — cảm giác nhẹ nhõm hơn.
- Narration draft: "Không phải bạn viết prompt dở. Chỉ là chưa ai chỉ cách đóng gói nó."
- possible_scene_types: cần xác nhận — scene payoff cảm xúc, có thể dùng lại pattern kết
  thúc đã có trong series khác.

### CTA (65–70s) — cta
- Scene concept: Mở open loop cho phần 2 — cách thực sự đóng gói một cấu trúc brief dùng
  lại được, dựa trên khung 7 thành phần đã tìm thấy trong nghiên cứu.
- Narration draft: "Phần sau: cách đóng gói bản brief đó — trong mười phút."
- possible_scene_types: cần xác nhận — CTAScene tiêu chuẩn nếu repo đã có.

## Ước lượng thời lượng
- Tổng số từ narration (draft, tất cả beat): ~62 từ → ước lượng ~15s ở riêng phần lời
  thoại đọc liên tục (~62 / 4.2s), phần còn lại của 60–70s tổng thời lượng là khoảng lặng
  hình ảnh/animation giữa các câu — con số cuối cùng do `vidgen` Step 2 tính lại chính xác
  theo audio TTS thật, đây chỉ là ước lượng cho outline.

## Ghi chú bàn giao
- Series: Part 1 of 3 (khớp với `series_potential` trong angle-matrix.json: "Phần 1: vấn
  đề. Phần 2: demo đóng gói công thức brief thành một hệ thống dùng lại được.")
- Điều cần `vidgen` xử lý tiếp: chọn scene type cụ thể theo catalog thật của repo (các mục
  "cần xác nhận" ở trên), sinh JSON, chạy TTS, render, và GATE 1/GATE 2 quality audit.
- Directions to avoid (kế thừa từ research-brief.md mục 20): không dùng số liệu "90% nhân
  viên dùng shadow AI" hay "51 ngày mất vì ma sát công nghệ" trong outline này hoặc phần
  sau của series cho tới khi xác minh được nguồn nghiên cứu MIT gốc.
