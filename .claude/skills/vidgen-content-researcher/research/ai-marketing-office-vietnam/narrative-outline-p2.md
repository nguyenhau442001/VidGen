# Narrative Outline — Cách đóng gói sổ tay cho AI (Phần 2/2)

- Slug: ai-marketing-office-vietnam-p2 (video_id dự kiến: ai_intern_marketing_p2)
- Nguồn: research/ai-marketing-office-vietnam/ (research-brief.md, angle-matrix.json,
  video-opportunity.json, source-log.md)
- Angle: Mỗi ngày marketer lại onboarding một AI intern mới (tiếp nối Phần 1, cùng angle,
  không đổi sang angle khác)

**Lưu ý bàn giao quan trọng:** `angle-matrix.json` → `reasoning` gợi ý ban đầu là Phần 2
nên đổi sang angle "78% tổ chức Dẫn đầu AI..." (audience quản lý/lead). Nhưng Phần 1 đã
render và CHỐT công khai một lời hứa cụ thể khác ngay trong CTA đã lên sóng: *"Phần sau:
cách đóng gói bản brief đó... cùng xem cách viết ra công thức đó, từng bước một"*
(`content/text/ai_intern_marketing_p1.txt`, Cảnh 11). Vì lời hứa này đã public, outline
này đi theo đúng cam kết của Phần 1 (demo cụ thể cách đóng gói) thay vì pivot sang angle
quản lý/lead — không bịa thêm audience/pain mới, chỉ đào sâu narrative_function "mechanism"
mà Phần 1 mới giới thiệu ở mức khái niệm (Cảnh 7–8), dùng lại đúng evidence đã có (S004,
S006). visual_opportunities trong video-opportunity.json đã được Phần 1 dùng hết ở mức
khái niệm — outline này KHÔNG thêm pain/audience mới, chỉ mở rộng chi tiết hành động của
mechanism đã có sẵn căn cứ.

## Hidden Objective Function Mapping

- Wrong belief (điểm khởi đầu riêng của Phần 2, từ research-brief.md mục 8 "Objections"):
  "Đóng gói một hệ thống nghe phức tạp — chắc phải biết code/kỹ thuật mới làm được."
- True objective: Chỉ cần đúng cấu trúc thông tin (không phải công cụ/code), làm một lần,
  dán lại nhiều lần — đúng new_belief Phần 1 đã mở, giờ Phần 2 chỉ ra CÁCH LÀM cụ thể.
- Aha moment: Bốn ô cố định (vai trò, ngữ cảnh, đối tượng, giọng văn mẫu — S004) biến việc
  "brief lại từ đầu" thành "dán một bản, thêm một dòng."

## Retention Arc

### Hook (0–5s) — pain_recognition (tiếp nối, không giới thiệu lại)
- Scene concept: Cuốn sổ tay từ cảnh cuối Phần 1 xuất hiện lại, còn đóng — câu hỏi mở loop
  cụ thể hơn thay vì nhắc lại vấn đề "AI mất trí nhớ".
- Narration draft: "Sổ tay đó viết gì?"
- On-screen headline gợi ý (≤5 từ): "BÊN TRONG SỔ TAY CÓ GÌ?"
- possible_scene_types: cần xác nhận với `vidgen` — có thể tái sử dụng `conversation` hoặc
  một biến thể "reveal" mở cuốn sổ, tiếp nối hình ảnh Cảnh 11 Phần 1.

### Tension (5–20s) — failed_solution (2 sub-beat)

**Tension A — cách "sửa nhanh" phổ biến nhất vẫn không đủ**
- Scene concept: Marketer đã thử lưu sẵn 1 đoạn mô tả thương hiệu (research-brief.md mục 9
  "Current Alternatives" #1), dán vào đầu mỗi chat mới — nhưng dùng y hệt cho một bản
  proposal và một caption Instagram thì AI vẫn trả lời chung chung, không phân biệt việc.
- Narration draft: "Nhiều người đã thử lưu sẵn một đoạn mô tả thương hiệu, dán vào đầu mỗi lần chat mới."
- Narration draft: "Nhưng dùng cho việc nào cũng như nhau — AI vẫn trả lời chung chung."
- possible_scene_types: cần xác nhận — `comparison` hoặc `conversation` (demo 1 đoạn blob
  dán vào 2 việc khác nhau, cùng 1 kiểu output chung chung).

**Tension B — cách "sửa nhanh" thứ hai cũng không tích hợp được vào quy trình**
- Scene concept: Có người lưu brand guideline trong 1 file/Google Doc riêng (research-brief
  mục 9 #3) — nhưng file đó không nằm trong luồng brief AI hàng ngày, nên không ai mở lại.
- Narration draft: "Có người lưu brand guideline trong một file riêng. Nhưng không ai mở lại file đó mỗi lần brief AI."
- possible_scene_types: cần xác nhận — `quote_callout` hoặc `icon_threat` (file nằm im một
  chỗ, tách biệt khỏi luồng chat AI thật).

### Reveal (20–55s) — reframe / mechanism / proof

**Reframe**
- Scene concept: Không phải vấn đề viết ít hay nhiều — là thông tin chưa được chia đúng
  thành từng phần cố định để AI đọc nhanh, đúng vai trò từng phần.
- Narration draft: "Vấn đề không phải viết ít hay nhiều — mà là chưa chia đúng thành từng ô riêng."
- possible_scene_types: cần xác nhận — `explanation` (tiếp nối phong cách Cảnh 5 Phần 1).

**Mechanism — giải tỏa lo ngại "phức tạp"**
- Scene concept: Trả lời thẳng objection "sợ hệ thống hóa nghe phức tạp, phải biết kỹ
  thuật" (research-brief.md mục 8) — không cần code, không cần công cụ mới.
- Narration draft: "Không cần code, không cần công cụ mới — chỉ cần đúng cấu trúc chữ, làm một lần."
- possible_scene_types: cần xác nhận — `quote_callout`.

**Mechanism — bốn ô cố định**
- Scene concept: Giới thiệu cấu trúc brief bốn thành phần đã xác nhận từ nguồn S004 (Gu
  Vietnam, expert_opinion — S004 gốc nói "ít nhất 7 thành phần", chỉ 4 thành phần được nêu
  tên cụ thể: vai trò, ngữ cảnh, đối tượng, giọng văn mẫu; KHÔNG bịa thêm 3 thành phần còn
  lại chưa được nguồn nêu rõ). Gắn nhãn rõ đây là khuyến nghị từ một agency thương hiệu,
  không phải quy chuẩn ngành đã kiểm chứng độc lập.
- Narration draft: "Một cấu trúc brief có bốn ô cố định — vai trò, ngữ cảnh, đối tượng, giọng văn mẫu — theo khung một agency thương hiệu đề xuất."
- possible_scene_types: cần xác nhận — `explanation` với `bullets` (tiếp nối Cảnh 7 Phần 1,
  giờ liệt kê đủ 4 ô thay vì 3).

**Mechanism — ví dụ điền cụ thể**
- Scene concept: Ví dụ MINH HỌA (không phải case study thật — chưa có case định lượng theo
  Evidence Gaps) điền 4 ô cho một SME giả định, vd tiệm cà phê nhỏ.
- Narration draft: "Ví dụ minh họa: một tiệm cà phê nhỏ — điền đúng bốn ô này, chỉ một lần duy nhất."
- possible_scene_types: cần xác nhận — `before_after` hoặc `explanation` (khung trống →
  khung đã điền).

**Mechanism — luồng dùng lại**
- Scene concept: Dán bản đã điền vào đầu mỗi phiên chat mới; mỗi lần chỉ cần thêm đúng 1
  dòng yêu cầu riêng cho việc hôm đó.
- Narration draft: "Dán bản đã điền vào đầu mỗi phiên chat mới. Mỗi lần chỉ cần thêm đúng một dòng yêu cầu."
- possible_scene_types: cần xác nhận — `diagram_flow` (tiếp nối Cảnh 8 Phần 1).

**Proof**
- Scene concept: Áp dụng lại đúng 6 việc trong tuần đã lập ở Cảnh 2 Phần 1 (kế hoạch,
  proposal, ads, content, brief hình ảnh, quay dựng) — mỗi việc giờ chỉ cần dán bản có sẵn
  + 1 dòng, thay vì gõ lại toàn bộ.
- Narration draft: "Sáu việc khác nhau trong tuần, từ lên kế hoạch đến quay dựng video — vẫn một bản, dán lại mỗi lần."
- Narration draft: "Đây là ví dụ minh họa, chưa phải số đo thực tế."
- possible_scene_types: cần xác nhận — `icon_threat` hoặc `before_after` (tiếp nối trực
  tiếp Cảnh 2 và Cảnh 9 Phần 1).
- Disclaimer bắt buộc (kế thừa nguyên trạng từ Evidence Gaps + quy ước Phần 1): dòng chữ
  nhỏ "*ví dụ minh họa, chưa phải số đo thực tế" phải luôn hiển thị trên màn hình ở scene
  này, không chỉ trong narration — đúng quy ước GATE 1 Phần 1 đã áp dụng.

### Resolution (55–65s) — payoff (2 sub-beat)

**Payoff — thực tế**
- Scene concept: Marketer gõ thẳng vào việc thật ngay dòng đầu tiên — callback hình ảnh
  intern có sẵn playbook từ Cảnh 6/10 Phần 1.
- Narration draft: "AI không còn là một intern mới toanh mỗi sáng nữa. Nó đọc sổ tay trước, rồi vào việc thật ngay."
- possible_scene_types: cần xác nhận — `quote_callout`.

**Payoff — cảm xúc (JTBD emotional, research-brief.md mục 6)**
- Scene concept: Không chỉ nhanh hơn — giọng thương hiệu cũng nhất quán hơn, bớt lo output
  sai giọng.
- Narration draft: "Không chỉ nhanh hơn — giọng thương hiệu cũng nhất quán hơn, ít phải sửa lại."
- possible_scene_types: cần xác nhận — `quote_callout` hoặc `explanation`.

### CTA (65–70s) — cta
- Scene concept: Đây là tập cuối của arc 2 phần này (Phần 2/2) — KHÔNG bịa thêm lời hứa số
  liệu/thời gian cụ thể cho phần tiếp theo (chưa có kế hoạch Phần 3 đã xác nhận). CTA mềm,
  mời hành động thử ngay, giữ đúng nguyên tắc "generic CTA thay vì bịa con số" khi chưa có
  cơ sở.
- Narration draft: "Thử điền sổ tay của riêng bạn. Xem giọng thương hiệu AI viết ra có nhất quán hơn không."
- possible_scene_types: cần xác nhận — `preview_teaser` hoặc CTAScene tiêu chuẩn của repo.

## Ước lượng thời lượng
- Tổng số từ narration draft: ~241 từ → ước lượng ~241/4.2 ≈ 57s lời thoại liên tục. Cộng
  thêm khoảng lặng animation/transition giữa 12 scene, tổng thời lượng thực tế nhiều khả
  năng rơi vào khoảng 60–65s như ràng buộc đã cho — nhưng đây chỉ là ước lượng cho outline;
  bước sinh JSON của `vidgen` sẽ tính lại thời lượng chính xác theo TTS thật (tham khảo
  Phần 1: 285 từ narration → 56.5s thật, tốc độ TTS thực tế nhanh hơn ước lượng 4.2 từ/giây).

## Ghi chú bàn giao
- Series: Part 2 of 2 — khép lại arc đã mở ở Phần 1 (không tự thêm Phần 3 chưa được xác
  nhận).
- Điều cần `vidgen` xử lý tiếp: chọn loại scene cụ thể theo catalog thật của repo (các mục
  "cần xác nhận" ở trên), sinh JSON theo schema, viết `content/text/ai_intern_marketing_p2.txt`
  làm nguồn duyệt trước khi sinh JSON, chạy TTS, render, và GATE 1/GATE 2 quality audit.
- Directions to avoid (kế thừa từ research-brief.md mục 20, vẫn áp dụng cho Phần 2): không
  dùng số liệu "90% nhân viên dùng shadow AI", "51 ngày mất vì ma sát công nghệ", hay "61%
  lo mất việc" cho tới khi xác minh được nguồn nghiên cứu gốc (MIT/TopCV/ILO). Không bịa
  thêm thành phần thứ 5–7 của cấu trúc brief ngoài 4 thành phần S004 đã nêu tên cụ thể.
  Không trình bày ví dụ tiệm cà phê hay số liệu 6-việc-1-bản như case study thật — luôn giữ
  disclaimer "ví dụ minh họa".
