# Narrative Outline — Mỗi ngày marketer lại onboarding một AI intern mới

- Slug: ai-marketing-office-vietnam-p1
- Nguồn: research/ai-marketing-office-vietnam/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: Mỗi ngày marketer lại onboarding một AI intern mới

## Hidden Objective Function Mapping

- Wrong belief: AI chatbot tự động tiết kiệm thời gian ngay khi bắt đầu dùng — vấn đề chỉ
  là viết prompt cho hay (video-opportunity.json → `viewer_belief_before`).
- True objective: Thời gian thật sự bị mất nằm ở việc lặp lại brand voice/ngữ cảnh mỗi
  phiên làm việc mới — đó là vấn đề cấu trúc quy trình, không phải vấn đề viết prompt hay
  hơn (`viewer_belief_after` + `core_argument`).
- Aha moment: Một "công thức brief" đóng gói lại một lần có thể loại bỏ phần lớn công việc
  dạy lại AI lặp đi lặp lại mỗi phiên (angle-matrix.json → `new_belief` giao với
  `proof_mechanism`).

## Retention Arc

### Hook (0–5s) — pain_recognition
- Scene concept: Marketer mở AI chat sáng thứ Hai, gõ lại đoạn brand voice quen thuộc
  trước khi vào việc thật — đúng concept `pain_recognition` trong video-opportunity.json.
- Narration draft: "Ngày nào cũng dạy lại AI."
- possible_scene_types: cần xác nhận với `vidgen` — video-opportunity.json gợi ý tái sử
  dụng dạng scene UI chat lặp lại (pattern PhoneShotZoomScene đã có trong repo).

### Tension (5–20s) — escalation
- Scene concept: Nhân rộng cảnh pain_recognition qua nhiều ngày trong tuần với nhiều loại
  task khác nhau (mail xin lỗi khách, biên bản họp, báo cáo tuần) — đúng nhịp mô tả thật
  từ cộng đồng marketer VN (nguồn S006, source-log.md; research-brief.md mục 10 "Customer
  Language").
- Narration draft: "Thứ hai mail xin lỗi khách. Thứ tư báo cáo tuần. Mỗi lần — brief lại từ đầu."
- possible_scene_types: cần xác nhận — video-opportunity.json gợi ý dạng scene lịch
  tuần/timeline; risk ghi trong đó: không kéo dài quá 1 cảnh để tránh lặp ý với Hook.

### Reveal (20–55s) — reframe / mechanism / proof

**Reframe**
- Scene concept: Chuyển góc nhìn — vấn đề không phải AI "quên" như người, mà là chưa có
  nơi nào lưu lại "công thức brief"; hình ảnh một cuốn sổ tay xuất hiện thay cho việc gõ
  lại từ đầu.
- Narration draft: "Vấn đề không phải AI quên. Là chưa ai viết sổ tay cho nó."
- possible_scene_types: cần xác nhận — video-opportunity.json gợi ý dạng before/after
  side-by-side.
- Disclaimer cần giữ (angle-matrix.json → `disclaimers`): ẩn dụ "intern"/"sổ tay" chỉ để
  dễ hình dung cơ chế lưu ngữ cảnh — không phải AI có trí nhớ như người. Nên có 1 câu
  narration hoặc on-screen note làm rõ điều này ngay tại scene reframe, trước khi sang
  mechanism.

**Mechanism**
- Scene concept: Giải thích ngắn gọn cấu trúc brief có tổ chức (vai trò, đối tượng, giọng
  văn mẫu — theo khung 7 thành phần từ nguồn S004, expert_opinion) dùng lại nhiều lần thay
  vì viết lại mỗi phiên.
- Narration draft: "Một bản brief đóng gói sẵn — vai trò, đối tượng, giọng văn. Dùng lại, không viết lại."
- possible_scene_types: cần xác nhận — video-opportunity.json gợi ý tái sử dụng dạng scene
  giải thích luồng dữ liệu như trong series grab_dispatch; risk ghi trong đó: giữ ở mức
  khái niệm, KHÔNG dùng thuật ngữ "skill"/"system prompt" nếu chưa giải thích trước.

**Proof**
- Scene concept: So sánh trực quan số bước phải lặp lại: luồng cũ (dài, lặp lại brand
  voice mỗi lần) vs luồng mới (ngắn, một lần đóng gói).
- Narration draft: "Cách cũ: gõ lại mỗi lần. Cách mới: một lần, dùng mãi."
- possible_scene_types: cần xác nhận — video-opportunity.json gợi ý dạng scene so sánh
  song song hoặc đếm số bước.
- Disclaimer cần giữ (angle-matrix.json → `disclaimers`, và video-opportunity.json → risk
  của visual opportunity "proof"): số bước minh họa trong scene này là ví dụ minh họa,
  KHÔNG phải số liệu đã đo thực tế — chưa có case study định lượng thật tại thời điểm
  nghiên cứu (xem research-brief.md mục 18 "Evidence Gaps"). Bắt buộc 1 dòng on-screen
  text nhỏ kiểu "*ví dụ minh họa" ở scene này.

### Resolution (55–65s) — payoff
- Scene concept: Khoảnh khắc marketer nhận ra vấn đề của họ không phải "không biết viết
  prompt hay" mà là "chưa ai chỉ cách đóng gói lại quy trình" — cảm giác nhẹ nhõm, tự tin
  hơn.
- Narration draft: "Không phải bạn viết prompt dở. Chỉ là chưa ai chỉ cách đóng gói nó."
- possible_scene_types: cần xác nhận — video-opportunity.json gợi ý scene payoff cảm xúc,
  có thể dùng lại pattern kết thúc đã có trong series khác; risk ghi trong đó: giữ đúng
  mức, tránh nghe như quảng cáo giải pháp cụ thể thay vì insight.

### CTA (65–70s) — cta
- Scene concept: Mở open loop cho Phần 2 — cách thực sự đóng gói một cấu trúc brief dùng
  lại được, dựa trên khung 7 thành phần đã tìm thấy trong nghiên cứu.
- Narration draft: "Phần sau: cách đóng gói bản brief đó — trong mười phút."
- possible_scene_types: cần xác nhận — CTAScene tiêu chuẩn nếu repo đã có; risk ghi trong
  đó: CTA cần tự nhiên, không desperate.

## Ước lượng thời lượng
- Tổng số từ narration (draft, tất cả beat): ~62 từ → ước lượng ~15s ở riêng phần lời
  thoại đọc liên tục (~62 / 4.2s); phần còn lại của 60–70s tổng thời lượng là khoảng lặng
  hình ảnh/animation giữa các câu và các beat mở rộng (đặc biệt Reveal, beat dài nhất theo
  retention-arc-framework.md). Con số cuối cùng do `vidgen` Step 2 tính lại chính xác theo
  audio TTS thật — đây chỉ là ước lượng cho outline.

## Ghi chú bàn giao
- Series: Part 1 of 2 (khớp với `series_potential` trong angle-matrix.json: "Phần 1: vấn
  đề (angle này). Phần 2: demo đóng gói công thức brief thành một hệ thống dùng lại được.").
- Điều cần `vidgen` xử lý tiếp: chọn scene type cụ thể theo catalog thật của repo (các mục
  "cần xác nhận" ở trên), sinh JSON theo schema, chạy TTS, render, và GATE 1/GATE 2 quality
  audit.
- Directions to avoid (kế thừa từ research-brief.md mục 20): không dùng số liệu "90% nhân
  viên dùng shadow AI", "51 ngày mất vì ma sát công nghệ", hay "61% lo mất việc" trong
  outline này hoặc phần sau của series cho tới khi xác minh được nguồn nghiên cứu gốc
  (MIT/TopCV/ILO).
