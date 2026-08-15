# Narrative Outline — Ngưỡng Rating Vô Hình

- Slug: tai-xe-rating-oan
- Nguồn: input/research/tai-xe-rating-oan/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: Ngưỡng rating vô hình

## Hidden Objective Function Mapping

- Wrong belief: Đánh giá sao chỉ là phản hồi chất lượng phục vụ — tài xế phục vụ tốt thì không có gì phải lo.
- True objective: Rating là một ngưỡng vận hành ẩn — chỉ vài đánh giá xấu (oan hay không) đủ để một cơ chế tự động cắt quyền lợi ngay lập tức, không cảnh báo trước. Hệ thống được quảng bá như công cụ phản hồi công bằng hai chiều, nhưng vận hành như công tắc tự động một chiều: khách gần như không chịu hậu quả gì, tài xế có thể mất quyền lợi hoặc tài khoản trong vài ngày mà không được giải thích trước.
- Aha moment: Chính sách chính thức Grab (S006) chỉ nói tài xế phải duy trì rating theo "prevailing policy" — không công bố ngưỡng cụ thể. Tài xế qua báo Tuổi Trẻ (S007) tiết lộ chỉ cần 5-6/100 khách chấm 1 sao là đủ rớt ngưỡng 4,7 và bị khóa ngay. Khoảng trống minh bạch đó chính là "vạch đỏ ẩn" — người xem nhận ra ngưỡng tồn tại thật, nhưng không ai được biết trước nó nằm ở đâu.

## Retention Arc

### Hook (0–5s) — narrative_function: pain_recognition
- Scene concept: Tài xế nhận cuốc, hoàn thành, rồi một thông báo rating giảm xuất hiện không kèm lý do — khoảnh khắc quen thuộc với mọi tài xế công nghệ. Mock UI minh họa, gắn nhãn "TÌNH HUỐNG MINH HỌA", không dùng ảnh chụp thật từ app Grab/Be/Xanh SM.
- Narration draft: "Phục vụ tốt. Rating vẫn tụt."
- possible_scene_types: HookScene

### Tension (5–20s) — narrative_function: escalation (case Minh Khang làm ví dụ cụ thể mở rộng)
- Scene concept: Timeline case thật: Grab liên hệ tài xế 12–13/3/2026, khóa vĩnh viễn tài khoản 16/3/2026. Mốc ngày tháng, biểu tượng khóa. Ghi rõ trên màn hình đây là case liên quan vi phạm quyền riêng tư dữ liệu khách hàng — khác cơ chế rating tự động hàng ngày, chỉ dùng làm ví dụ cho thấy nền tảng có thể ra quyết định nhanh và dứt khoát.
- Narration draft: "Grab liên hệ ngày mười hai tháng ba. Khóa vĩnh viễn — chỉ sau bốn ngày."
- possible_scene_types: ExplanationScene hoặc scene timeline dạng mốc thời gian tuần tự — cần xác nhận với vidgen scene catalog nếu chưa có scene timeline chuyên dụng

### Reveal (20–55s) — narrative_function: mechanism, proof, reframe
Beat này tách thành 3 sub-beat để tránh 1 scene "đơ" quá lâu (khớp GATE 2 Dimension 4 — pacing).

**Reveal 1 — Mechanism**
- Scene concept: Đồng hồ đo rating với vạch đỏ ẩn — kim chỉ điểm trung bình giảm dần khi từng lượt 1 sao cộng vào, chạm vạch ẩn thì quyền lợi tắt ngay lập tức.
- Narration draft: "Chính sách chỉ ghi: duy trì rating theo quy định. Ngưỡng cụ thể — không công bố."
- possible_scene_types: ExplanationScene
- Disclaimer cần giữ: Không hiển thị con số 4,7 như số liệu chính thức đã xác thực.

**Reveal 2 — Proof (community observation, gắn nhãn rõ)**
- Scene concept: Vạch đỏ ẩn hiện dần ra dưới dạng "theo chia sẻ tài xế" — 5–6 trên 100 khách chấm 1 sao đủ kéo điểm xuống dưới ngưỡng.
- Narration draft: "Theo lời tài xế: năm, sáu trên trăm khách chấm một sao — đủ rớt ngưỡng."
- possible_scene_types: ExplanationScene
- Disclaimer cần giữ: Ghi rõ trên màn hình "Theo chia sẻ của tài xế qua báo chí, chưa xác thực chính thức từ nền tảng" — bắt buộc theo angle-matrix.json disclaimers, không được bỏ qua.

**Reveal 3 — Reframe**
- Scene concept: Chuyển góc nhìn: từ "rating là phản hồi dịch vụ" sang "rating là công tắc vận hành" — icon ngôi sao tách lớp lộ ra công tắc/cầu dao bên trong.
- Narration draft: "Ngôi sao không chỉ là phản hồi. Nó là công tắc — tắt lúc nào không báo."
- possible_scene_types: ExplanationScene hoặc QuoteCalloutScene cho headline lật ý

### Resolution (55–65s) — narrative_function: payoff
- Scene concept: Hai cột đặt cạnh nhau: "KHÁCH ĐÁNH GIÁ 1 SAO" (hậu quả: không có cơ chế tương xứng được biết đến công khai) vs "TÀI XẾ NHẬN 1 SAO" (hậu quả: có thể mất quyền lợi ngay lập tức). Dùng ngôn ngữ có chừa mực, tránh cực đoan "khách không bao giờ chịu hậu quả gì".
- Narration draft: "Khách chấm sao — gần như không hậu quả. Tài xế nhận sao — có thể mất quyền lợi ngay."
- possible_scene_types: SplitViewScene

### CTA (65–70s) — narrative_function: cta
- Scene concept: Câu hỏi mở mời tài xế chia sẻ trải nghiệm thật, giữ tinh thần "video điều tra mở" — không kết luận thay người xem.
- Narration draft: "Ngưỡng rating của bạn là bao nhiêu? Từng bị oan chưa?"
- possible_scene_types: CTAScene

## Ước lượng thời lượng
- Tổng số từ narration: Hook 5 + Tension 11 + Reveal1 11 + Reveal2 11 + Reveal3 10 + Resolution 12 + CTA 8 = 68 từ → ước lượng 68/4.2 ≈ 16.2 giây lời thoại thuần.
  Lưu ý: đây là narration draft rút gọn theo checklist tốc độ; `vidgen` Step 2 sẽ cần viết narration đầy đủ hơn (câu văn hoàn chỉnh, nối các ý bằng dấu phẩy/em-dash) khi chuyển outline này thành JSON, để đạt tổng 60–75s theo chuẩn pipeline — outline này chỉ định hình ý và nhịp, không phải bản narration cuối cùng đưa thẳng vào TTS.

## Ghi chú bàn giao
- Series: Không phải series độc lập, nhưng series_potential ghi nhận trong angle-matrix.json: có thể mở rộng thành phần 2 so sánh ngưỡng Grab/Be/Xanh SM nếu có thêm nguồn.
- Điều cần `vidgen` xử lý tiếp: viết narration TXT đầy đủ (câu hoàn chỉnh, đúng tốc độ 4.2 từ/giây, đạt tổng 60–75s) dựa trên ý outline này, đưa qua chủ sở hữu duyệt trước khi sinh JSON, chọn scene type cụ thể theo schema thật, chạy TTS, render, và GATE 1/GATE 2 quality audit. Xác nhận scene timeline chuyên dụng có tồn tại chưa (Tension beat) trước khi generate JSON — nếu chưa có, dùng ExplanationScene với props mốc thời gian thay thế, không tự tạo scene mới (đang trong giai đoạn Scene Library Freeze theo CLAUDE.md).
- Directions to avoid (kế thừa từ research-brief.md mục 20):
  - Không khẳng định các nền tảng "cố tình" thiết kế ngưỡng rating để bóc lột tài xế.
  - Không dùng con số "4,7" hoặc "5-6/100" như số liệu chính thức đã kiểm chứng — luôn gắn nhãn "theo chia sẻ tài xế".
  - Không mở rộng case Minh Khang thành "tất cả tài xế đều bị khóa như vậy" — case này liên quan vi phạm quyền riêng tư dữ liệu khách hàng, khác cơ chế rating tự động.
  - Không bỏ qua objection hợp lý của nền tảng (quyền đặt luật chơi, tài xế đã đồng ý điều khoản) — cần cân bằng để giữ credibility.
