# Narrative Outline — Mã hội viên 20k, vì sao không chọn được?

- Slug: xanh-sm-bike-ma-hoi-vien
- Nguồn: research/xanh-sm-bike-ma-hoi-vien/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: Hidden Objective Function: Mã ưu đãi của bạn đang phục vụ ai?

## Hidden Objective Function Mapping

- Wrong belief: Mã khuyến mãi hội viên là tài sản cá nhân — người dùng toàn quyền chọn dùng mã nào, lúc nào, vì đã trả tiền mua.
- True objective: Hệ thống ưu đãi có thể vận hành theo một logic tự động không hiển thị rõ cho người dùng — quyền kiểm soát thực tế có thể không hoàn toàn nằm ở người dùng như họ tưởng. Cơ chế chính xác (bug hay thiết kế) vẫn là câu hỏi mở, chưa đủ bằng chứng để kết luận.
- Aha moment: Công ty tự có hẳn 1 mục FAQ riêng cho "không sử dụng được mã khuyến mãi" (thừa nhận gián tiếp vấn đề tồn tại) — nhưng cơ chế chọn mã cụ thể vẫn là hộp đen, không ai (kể cả video này) xác nhận được rõ ràng.

## Retention Arc

### Hook (0–5s) — narrative_function: pain_recognition
- Scene concept: Màn hình app đặt xe, 2 mã ưu đãi hiển thị — mã hội viên 20k nổi bật, mã mặc định giá trị thấp hơn. Ngón tay chạm liên tục vào mã 20k, không có phản hồi. Đi thẳng vào bí ẩn chưa giải mã, không dẫn dắt qua framing trừu tượng trước.
- Narration draft: "Mã 20k, chọn mãi không được."
- possible_scene_types: PhoneMockupScene, ScreenshotScene — cần xác nhận với vidgen scene nào hỗ trợ mock UI app đặt xe voucher

### Tension (5–20s) — narrative_function: escalation
- Scene concept: Countdown đồng hồ đếm ngược hạn dùng mã 20k, chạy song song với danh sách các chuyến đã đặt — mỗi chuyến đều bị áp mã mặc định giá trị thấp hơn thay vì mã 20k. Dùng số liệu minh hoạ hư cấu, ghi rõ on-screen "ví dụ minh hoạ", không dùng số thật của người quen user.
- Narration draft: "Mỗi chuyến, mã khác được áp. Mã 20k — vẫn nằm im, chờ hết hạn."
- possible_scene_types: CounterAnimScene, BatteryTimelineShot — cần xác nhận với vidgen scene countdown/timeline phù hợp nhất

### Reveal (20–55s) — narrative_function: reframe / mechanism / proof
- Scene concept (reframe): Bàn tay người dùng với tới nút chọn mã, nhưng một lớp hệ thống vô hình (hộp đen, không nhãn) chặn lại, tự động đẩy ra một lựa chọn khác — chuyển góc nhìn từ "người dùng chọn" sang "hệ thống chọn thay".
- Scene concept (mechanism): Cắt sang ảnh chụp trang FAQ chính thức GreenSM, mục "Tôi không sử dụng được mã khuyến mãi/mã ưu đãi" — công ty tự có mục riêng cho vấn đề này.
- Scene concept (proof): Bảng chia đôi màn hình "Đã xác thực / Chưa xác thực" — trái: FAQ tồn tại, quy trình nhập mã chuẩn. Phải: cơ chế chọn mã cụ thể, bug hay thiết kế, mức độ phổ biến.
- Narration draft: "Không phải người dùng chọn mã. Hệ thống chọn thay — theo cách không ai thấy được."
- Narration draft: "Xanh SM có hẳn một mục hỏi đáp cho lỗi này. Nghĩa là: họ biết vấn đề tồn tại."
- Narration draft: "Nhưng vì sao chọn mã thấp hơn — vẫn chưa có câu trả lời."
- possible_scene_types: DiagramFlowScene, SystemLayerScene, ScreenshotScene, SplitViewScene — cần xác nhận scene layout 2 cột đối chiếu và scene trích dẫn FAQ với vidgen
- Disclaimer cần giữ (từ angle-matrix.json → disclaimers): "Đây là 1 báo cáo cá nhân chưa xác thực quy mô, không đại diện cho trải nghiệm toàn bộ người dùng" và "Chưa xác định được đây là lỗi phần mềm hay giới hạn thiết kế cố ý" — cả hai PHẢI xuất hiện dưới dạng on-screen text hoặc câu narration trong beat này, không bỏ qua.

### Resolution (55–65s) — narrative_function: payoff
- Scene concept: Không chốt đúng/sai — chuyển sang nhận thức: hệ thống ưu đãi của các app quen thuộc phức tạp và ít minh bạch hơn người dùng tưởng.
- Narration draft: "Mã của bạn — có thật sự do bạn chọn? Câu trả lời, vẫn còn bỏ ngỏ."
- possible_scene_types: QuoteCalloutScene, ThesisTeaserShot — cần xác nhận scene phù hợp cho khoảnh khắc chốt luận điểm mở

### CTA (65–70s) — narrative_function: cta
- Scene concept: Lời mời khán giả để lại bình luận nếu từng gặp tình huống tương tự.
- Narration draft: "Bạn từng gặp chuyện này? Kể lại — bình luận bên dưới."
- possible_scene_types: CTAScene — cần xác nhận tên scene CTA chuẩn hiện có trong catalog với vidgen

## Ước lượng thời lượng
- Tổng số từ narration: 8 (Hook) + 14 (Tension) + 12 + 13 + 11 (Reveal, 3 câu) + 12 (Resolution) + 9 (CTA) = 79 từ → ước lượng ~79/4.2 ≈ 19s lời thoại thô. Đây chỉ là ước lượng cho outline — cần thêm narration mô tả/nối ý ở Reveal khi viết script.txt chính thức (Phase 2) để lấp đủ khung 20–55s mà không vi phạm "mỗi câu phải mang thông tin mới". `vidgen` Step 2 sẽ tính lại thời lượng khung hình chính xác theo TTS thật.

## Ghi chú bàn giao
- Series: Không phải series chính thức, nhưng có series_potential mở ("Hidden Objective Function của app gọi xe Việt Nam" — Grab, Be, ShopeeFood). Không cam kết phần 2 trong CTA, chỉ mời phản hồi.
- Điều cần `vidgen` xử lý tiếp: sinh JSON theo schema, chọn scene type cụ thể (đối chiếu catalog thật trong `remotion/src/scenes/`), chạy TTS, render, và GATE 1/GATE 2 quality audit.
- Directions to avoid (kế thừa từ research-brief.md mục 20): không khẳng định "Xanh SM cố tình lừa người dùng" (không có bằng chứng ý định cố ý); không trình bày 1 báo cáo cá nhân như "nhiều người dùng đang bị"; không bịa số liệu "X% người dùng gặp lỗi này".
