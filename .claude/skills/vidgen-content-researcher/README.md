# vidgen-content-researcher

Lớp nghiên cứu và chiến lược nội dung đứng **trước** VidGen. Chuyển một chủ đề chung
chung thành: audience + pain + insight + core argument + evidence + góc video khả thi
— sẵn sàng cho skill viết narrative/script.

## Vấn đề nó giải quyết

Không có bước research độc lập, script dễ rơi vào 2 lỗi:
1. Viral nhưng sai/thổi phồng sự thật (mất uy tín kênh).
2. Đúng sự thật nhưng chung chung, không chạm pain thật của ai cả (không viral).

Skill này ép quy trình đi qua research + evidence + audience trước khi viết một câu
narration nào, và tách rõ fact / expert opinion / community observation / hypothesis
để không có gì được trình bày mạnh hơn mức nó thực sự đáng tin.

## Khi nào nên dùng

- Có một chủ đề (tech, AI, hệ thống quen thuộc) muốn làm video nhưng chưa rõ góc.
- Cần tìm nỗi đau thật của một nhóm audience trước khi viết hook.
- Cần xác thực một số liệu/claim trước khi đưa vào script.
- Cần so sánh nhiều hướng triển khai nội dung cho cùng 1 chủ đề.

## Khi nào KHÔNG nên dùng

- Đã có research brief rồi, chỉ cần viết script/JSON → dùng skill `vidgen` hoặc
  `vidgen-narrative-director`.
- Sửa lỗi JSON, render, chỉnh scene component → không liên quan tới research.
- Chỉnh một câu narration nhỏ trong script đã có sẵn.

## Input mẫu

```
Nghiên cứu: Claude Skills có thể giúp marketer làm việc tốt hơn như thế nào,
và một kỹ sư có thể giúp marketer đóng gói workflow của họ ra sao?
```

## Output mẫu

5 file trong một thư mục theo slug chủ đề, ví dụ `research/claude-skills-marketer/`:
`research-brief.md`, `audience-pain-map.json`, `angle-matrix.json`, `source-log.md`,
`video-opportunity.json`. Schema đầy đủ ở `references/output-contracts.md`.

Xem ví dụ chạy thử thật trong `examples/claude-skills-marketer/`.

## Cách chạy validation

```bash
python3 scripts/validate_research_output.py --dir research/<topic-slug>/
python3 scripts/score_content_angles.py --dir research/<topic-slug>/
```

`validate_research_output.py` kiểm tra: JSON hợp lệ, đủ field bắt buộc, score trong
khoảng 1–10, mọi angle có risk, recommended_angle khớp title và có proof_mechanism,
mọi visual_opportunity có narrative_function hợp lệ, confidence chỉ nhận
low/medium/high.

`score_content_angles.py` tính weighted score (credibility và proof_potential được
ưu tiên cao nhất, exaggeration_risk bị trừ điểm chứ không cộng), in bảng xếp hạng và
cảnh báo trade-off (novelty cao/credibility thấp, shareability cao/proof thấp, v.v.).

## Tích hợp với skill tương lai

Output `video-opportunity.json` có field `recommended_next_skill` — mặc định trỏ tới
`vidgen-narrative-director`. Các skill dự kiến trong cùng pipeline:

- `vidgen-narrative-director` — nhận research brief + video-opportunity, viết narrative
  arc và narration draft.
- `vidgen-scene-director` — chọn scene type cụ thể cho từng visual opportunity.
- `vidgen-json-compiler` — sinh VidGen JSON hoàn chỉnh từ narrative + scene đã chọn.
- `vidgen-director-audit` — audit chất lượng script/video trước khi publish.
- `content-performance-learner` — học từ performance thật (views, retention) để tinh
  chỉnh angle scoring và audience hypothesis cho các nghiên cứu sau.

Skill này **không tự gọi** các skill trên — nó dừng lại ở output nghiên cứu.

## Cách cập nhật source hierarchy

Sửa `references/source-hierarchy.md`. Thứ tự ưu tiên 1–8 dùng trực tiếp trong
`source-log.md` (field `Source type`). Nếu thêm loại nguồn mới, cập nhật cả
`evidence-quality.md` (4 loại reliability) nếu loại nguồn mới đó ảnh hưởng đến cách
phân loại độ tin cậy.

## Cách bổ sung framework marketing

Thêm khái niệm mới vào `references/marketing-fundamentals.md`, theo đúng cấu trúc 5
phần: định nghĩa, câu hỏi nó trả lời, ví dụ áp dụng cho video, sai lầm thường gặp,
tương đương kỹ thuật (nếu phù hợp).

## Cách thay đổi scoring weights

Sửa dict `WEIGHTS` và `EXAGGERATION_PENALTY_WEIGHT` ở đầu
`scripts/score_content_angles.py`. Giá trị là trọng số tương đối, không cần cộng lại
bằng 1. `credibility` và `proof_potential` mặc định có trọng số cao nhất để giữ đúng
nguyên tắc "research trước, script sau" — chỉnh lại nếu định vị kênh thay đổi.

## Giới hạn hiện tại

- `possible_scene_types` trong `video-opportunity.json` không được validate khớp với
  scene catalog thật của repo VidGen — skill này không giả định tên scene cụ thể vì
  chúng thay đổi theo repo (xem ghi chú trong `visual-opportunity-framework.md`).
- `validate_research_output.py` kiểm tra cấu trúc và tính nhất quán chéo giữa các
  file, nhưng không tự động xác minh nội dung một claim có đúng sự thật hay không —
  việc đó vẫn cần người review nguồn thật trong `source-log.md`.
