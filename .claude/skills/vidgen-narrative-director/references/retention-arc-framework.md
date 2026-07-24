# Retention Arc Framework

Khung nhịp 5 beat này lấy trực tiếp từ `vidgen` SKILL.md (mục "Retention-First Narrative
Arc") — narrative-director không định nghĩa lại, chỉ ánh xạ output nghiên cứu vào đúng
khung có sẵn để `vidgen` không phải đoán lại từ đầu.

## Mapping narrative_function → beat

`video-opportunity.json` (từ `vidgen-content-researcher`) đã gắn `narrative_function` cho
từng visual opportunity. Dùng bảng sau để xếp chúng vào đúng beat:

| Beat | Thời lượng | narrative_function tương ứng |
|---|---|---|
| Hook | 0–5s | `pain_recognition` |
| Tension | 5–20s | `escalation`, `failed_solution` |
| Reveal | 20–55s | `reframe`, `mechanism`, `proof` |
| Resolution | 55–65s | `payoff` |
| CTA | 65–70s | `cta` |

## Khi visual_opportunities thiếu 1 function nào đó

Không tự bịa thêm 1 opportunity mới để lấp đầy khung — điều đó vi phạm nguyên tắc "không
viết ra visual không có căn cứ từ research". Thay vào đó:

- Thiếu `escalation`/`failed_solution` (Tension): có thể gộp Tension vào cuối Hook, kéo dài
  Hook nhẹ (không quá 8s) thay vì bịa 1 beat riêng.
- Thiếu `payoff` (Resolution): dùng lại `viewer_belief_after` từ video-opportunity.json làm
  câu resolution trực tiếp, không cần 1 scene visual riêng nếu research chưa gợi ý được.
- Thiếu `cta`: dùng CTA mặc định trung tính ("xem phần tiếp theo") thay vì bịa 1 con số/lời
  hứa không có căn cứ, và ghi rõ trong outline là "CTA generic — cần cụ thể hóa ở bước sau".

## Nguyên tắc phân bổ thời lượng

- Tổng 60–75s (theo chuẩn `vidgen`, target 70s) — narrative-director ước lượng số giây mỗi
  beat dựa trên số câu narration × ~4.2 từ/giây, nhưng đây chỉ là **ước lượng cho outline**.
  `durationInFrames` chính xác vẫn do `vidgen` Step 2 tính lại sau khi có TTS thật.
- Hook không được vượt 6 từ theo yêu cầu của `vidgen` — nếu ý tưởng hook dài hơn, cắt bớt
  ở outline này, đừng để việc cắt dồn qua bước sau.
- Reveal là beat dài nhất (20–55s, tức ~35s) — nếu chỉ có 1 visual opportunity loại
  `mechanism` hoặc `proof`, cân nhắc tách narration của beat này thành 2 sub-beat nhỏ hơn để
  tránh 1 scene bị "đơ" quá lâu (khớp với GATE 2 Dimension 4 của `vidgen` — pacing).

## Series multi-part

Nếu `series_potential` trong angle-matrix.json cho thấy đây là 1 phần của series, áp dụng
"Multi-Part Series Conventions" của `vidgen`:
- Đặt slug dạng `<topic>-p<N>`.
- Hook của phần 2+ giả định người xem đã xem phần trước — không giới thiệu lại khái niệm cơ
  bản.
- CTA phải tease phần tiếp theo bằng 1 open loop mới, không chỉ "xem tiếp phần 2".
- Ghi rõ trong outline phần này là "Part N of M" và tóm tắt 1 câu open loop từ phần trước
  (nếu có) để giữ liền mạch.
