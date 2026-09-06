# Narrative Outline — Giải Mã Màu Biển Số Xe

- Slug: bien-so-xe-mau-sac
- Nguồn: research/bien-so-xe-mau-sac/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: Giải mã màu biển số xe — sự thật đằng sau hệ thống bạn nhìn thấy mỗi ngày

## Hidden Objective Function Mapping

- Wrong belief: Màu biển số xe là ngẫu nhiên hoặc chỉ hiểu mơ hồ/sai — ví dụ nhầm biển đỏ
  là "xe cơ quan chính phủ" thay vì quân đội.
- True objective: Màu biển số là một hệ thống phân loại chủ xe có căn cứ pháp luật rõ ràng
  (trắng=tư nhân, xanh=nhà nước, đỏ=quân đội, vàng=kinh doanh vận tải, NG=ngoại giao), và
  biển quân đội còn mã hóa cả đơn vị quản lý qua 2 chữ cái đầu.
- Aha moment: 2 chữ cái đầu trên biển đỏ không phải ngẫu nhiên — AA nghĩa là Quân đoàn 1,
  cả hệ thống 64 ký hiệu này có căn cứ pháp lý thật (Thông tư 169/2021/TT-BQP, Phụ lục III).

## Retention Arc

### Hook (0–5s) — narrative_function: pain_recognition
- Scene concept: Biển số xe nhiều màu lướt qua nhanh (minh họa cách điệu, không dùng ảnh
  biển thật của xe cá nhân), tạo cảm giác "cái này bạn thấy mỗi ngày".
- Narration draft: "Biển số mỗi ngày, không hiểu."
- possible_scene_types: hook scene tái dùng pattern HookVisual (kế thừa từ RtoOwnershipScene) — cần xác nhận với vidgen.

### Tension (5–15s) — narrative_function: escalation
- Scene concept: Đặt câu hỏi ngược — nếu bị hỏi đột ngột, người xem có chắc phân biệt được
  màu nào là gì không? Gợi lại chính lỗi nhận thức phổ biến (kể cả người viết outline ban
  đầu của video này cũng nhầm xanh với đỏ) để tạo đồng cảm thay vì cảm giác "bị dạy đời".
- Narration draft: "Biển xanh, biển đỏ — bạn có chắc mình phân biệt đúng không?"
- possible_scene_types: reframe/question scene — cần xác nhận với vidgen.

### Reveal (15–65s) — narrative_function: mechanism / proof
Đây là beat dài nhất, tách thành 5 sub-beat theo từng màu (đúng cấu trúc user yêu cầu qua
`/goal`), mỗi sub-beat mang đúng 1 thông tin mới, không lặp lại beat trước.

**Sub-beat 1 — Biển trắng**
- Scene concept: Card biển trắng, icon xe cá nhân/doanh nghiệp.
- Narration draft: "Trắng, chữ đen — xe cá nhân, doanh nghiệp tư nhân. Loại bạn gặp nhiều nhất."
- Nguồn: S002 (Wikipedia/Thông tư 79/2024/TT-BCA).

**Sub-beat 2 — Biển xanh**
- Scene concept: Card biển xanh, icon tòa nhà cơ quan/công an.
- Narration draft: "Xanh, chữ trắng — cơ quan nhà nước, công an. Không phải màu đỏ như nhiều người tưởng."
- Nguồn: S001, S002. Câu này chủ động đối chiếu lại đúng lỗi nhận thức đã nêu ở Tension.

**Sub-beat 3 — Biển đỏ + aha moment quân đội**
- Scene concept: Card biển đỏ, icon quân đội; sau đó zoom vào 2 chữ cái đầu, hiệu ứng "giải
  mã" hiện ra tên đơn vị.
- Narration draft: "Đỏ, chữ trắng — xe quân đội. Và hai chữ cái đầu tiết lộ luôn đơn vị quản lý — AA là Quân đoàn 1."
- Nguồn: S002 (màu), S003 (Thông tư 169/2021/TT-BQP, Phụ lục III — hệ thống 64 ký hiệu).
- Đây là aha moment chính của video — giữ nguyên mức độ chắc chắn "fact" vì có căn cứ pháp lý xác thực.

**Sub-beat 4 — Biển vàng**
- Scene concept: Card biển vàng, icon nhóm xe kinh doanh vận tải (taxi, xe khách, xe tải).
- Narration draft: "Vàng, chữ đen — xe kinh doanh vận tải. Taxi, xe khách, xe tải chở thuê, không chỉ taxi."
- Nguồn: S002, S005.

**Sub-beat 5 — Biển NG (twist cuối)**
- Scene concept: Card biển trắng chữ NG đỏ, kèm 2 dòng song song "quyền miễn trừ" và "ngoại
  lệ" (tái dùng pattern 2-cột đã dùng ở lockout_timeline của video RTO trước).
- Narration draft: "Trắng, chữ NG đỏ — xe ngoại giao, được miễn trừ theo công ước quốc tế. Nhưng công dân Việt Nam lái xe này vẫn bị xử lý bình thường."
- Nguồn: S004 (Công ước Viên 1961, Thông tư liên bộ 01/1988).
- Disclaimer bắt buộc giữ (từ angle-matrix.json → disclaimers): câu thứ hai "công dân Việt
  Nam... xử lý bình thường" PHẢI xuất hiện — không được rút gọn chỉ còn vế miễn trừ, tránh
  bị hiểu là "đặc quyền tuyệt đối né luật".

- possible_scene_types (chung cho cả 5 sub-beat): metric-card reveal pattern, tái dùng cấu
  trúc CostBreakdownVisual/ProcessStepsVisual đã có trong RtoOwnershipScene.tsx — cần xác
  nhận với vidgen liệu dùng lại đúng component hay cần scene type mới riêng cho chủ đề này.

### Resolution (65–75s) — narrative_function: payoff
- Scene concept: Chốt lại bằng 1 câu chuyện thật, đã xác thực, thay cho kicker gốc của user
  (kicker gốc "sắp thống nhất biển trắng" đã bị research phủ định — không dùng). Dùng sự
  kiện thật 2020-2021: xe kinh doanh vận tải từng bị bắt buộc đổi biển trắng sang vàng.
- Narration draft: "Luật này từng đổi thật — năm 2021, xe chạy dịch vụ bị bắt buộc đổi sang biển vàng."
- possible_scene_types: before/after card đổi màu biển, mốc thời gian — cần xác nhận với vidgen.
- Nguồn: S005 (Thông tư 58/2020/TT-BCA, hạn chót 2021-12-31).

### CTA (75–85s) — narrative_function: cta
- Scene concept: CTA chuẩn, follow prompt — không thêm bất kỳ claim dự đoán tương lai nào
  chưa xác thực (khác với kicker gốc của user).
- Narration draft: "Nhìn biển số lần sau — giờ bạn đọc được rồi. Follow để giải mã ký hiệu tiếp theo."
- possible_scene_types: CTA scene chuẩn — cần xác nhận với vidgen.

## Ước lượng thời lượng
- Tổng narration: Hook (9 từ) + Tension (10 từ) + Reveal 5 sub-beat (~19+18+22+17+24 = 100
  từ) + Resolution (14 từ) + CTA (14 từ) ≈ 147 từ → ước lượng 147/4.2 ≈ 35s lời thoại thuần.
- Cộng khoảng lặng giữa scene (~0.5-0.6s × 8 scene ≈ 4-5s) và nhịp đọc thực tế chậm hơn ước
  lượng lý thuyết (kinh nghiệm từ video RTO trước: TTS thực tế dài hơn ước lượng ~1.3-1.5
  lần) → thời lượng thực tế dự kiến rơi vào khoảng 70-85s, khớp mục tiêu user đặt qua `/goal`
  (thân bài 3-70s + kicker/CTA 70-90s). `vidgen` Step 2 sẽ tính lại chính xác theo TTS thật;
  có thể cần bump `duration_frames` một vài sub-beat như đã từng làm ở video RTO.

## Ghi chú bàn giao
- Series: Không phải series (nhưng series_potential trong angle-matrix.json ghi nhận "Cao"
  — có thể làm phần 2 về các ký hiệu ẩn khác nếu video này hiệu quả).
- Điều cần `vidgen` xử lý tiếp: sinh JSON theo schema, chọn scene type cụ thể (khả năng cao
  cần thêm mode/scene mới cho "plate color reveal" nếu không tái dùng được RtoOwnershipScene
  nguyên trạng — do nội dung khác domain), chạy TTS, render, và GATE 1/GATE 2 quality audit.
- Directions to avoid (kế thừa từ research-brief.md):
  - Không dùng kicker "sắp thống nhất biển trắng" — đã bị phủ định bởi S005, thay bằng sự
    kiện có thật 2020-2021.
  - Không liệt kê toàn bộ 64 ký hiệu quân đội — chỉ giữ 1 ví dụ chính (AA = Quân đoàn 1) để
    tránh biến video thành danh sách khô khan.
  - Không mô tả miễn trừ biển NG như đặc quyền tuyệt đối — luôn giữ câu ngoại lệ đi kèm.
  - Không dùng ảnh chụp biển số thật của xe cá nhân ngoài đường (rủi ro riêng tư) — dùng
    minh họa cách điệu đúng màu chuẩn theo S002.
- Lưu ý riêng: câu hook gốc của user có số liệu "90% người Việt không biết" — không có
  nguồn nào xác thực con số này, đã được thay bằng phiên bản không số liệu cụ thể trong
  outline này để tránh trình bày một ước đoán như thể đã khảo sát thật.
