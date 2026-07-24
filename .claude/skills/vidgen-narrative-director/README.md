# vidgen-narrative-director

Cầu nối giữa `vidgen-content-researcher` (nghiên cứu) và `vidgen` (sinh JSON → TTS →
render). Biến research-brief + angle đã chọn thành một outline có narration draft, đúng
định dạng "Topic / Outline" mà `vidgen` skill nhận làm input.

## Vấn đề nó giải quyết

`vidgen` skill tự sinh script JSON từ một topic/outline — nhưng nếu đưa thẳng research
brief (dài, nhiều nhãn fact/hypothesis, nhiều angle) vào `vidgen`, nó phải tự đoán angle
nào, tự map vào DNA pattern (wrong belief/true objective), và có nguy cơ đánh mất các
disclaimer đã gắn cẩn thận trong research. Skill này làm bước dịch đó một cách tường minh
trước khi giao cho `vidgen`.

## Khi nào nên dùng

- Đã chạy `vidgen-content-researcher` và có đủ 5 file output trong `research/<slug>/`.
- Muốn biến `recommended_angle` thành 1 outline có narration draft theo đúng retention arc
  của `vidgen` (Hook/Tension/Reveal/Resolution/CTA).

## Khi nào KHÔNG nên dùng

- Chưa có research nào — dùng `vidgen` trực tiếp với 1 topic, nó tự sinh outline+JSON.
- Cần audience/pain/evidence research — dùng `vidgen-content-researcher` trước.
- Cần JSON, TTS, hoặc render — dùng `vidgen`, đưa outline này làm input.

## Input mẫu

```
Viết narrative cho angle "Mỗi ngày marketer lại onboarding một AI intern mới"
từ research/ai-marketing-office-vietnam/
```

## Output mẫu

`research/<topic-slug>/narrative-outline.md` — xem ví dụ thật trong
`examples/ai-marketing-office-vietnam/narrative-outline.md`, được dựng từ output research
thật của `vidgen-content-researcher` cho cùng topic.

## Cách chạy validation

```bash
python3 scripts/validate_narrative_outline.py --file research/<topic-slug>/narrative-outline.md
```

Kiểm tra: đủ 5 beat bắt buộc, Hook ≤ 6 từ, không có filler đầu câu, có đủ 3 slot Hidden
Objective Function Mapping, và **không** lẫn field JSON-schema (`durationInFrames`,
`"type":`, `props`) — vì đó là việc của `vidgen`, không phải của skill này.

## Tích hợp trong pipeline

```
vidgen-content-researcher  →  vidgen-narrative-director  →  vidgen
(research 5 file)             (narrative-outline.md)         (JSON → TTS → render → .mp4)
```

Không tự động gọi `vidgen` sau khi outline pass validation — dừng lại và báo cho người
dùng biết bước tiếp theo là gì, để họ chủ động quyết định.

## Giới hạn hiện tại

- `possible_scene_types` trong outline vẫn kế thừa nguyên trạng "cần xác nhận với
  vidgen-scene-director" từ `video-opportunity.json` nếu chưa rõ — skill này không tự
  quyết định scene type cụ thể (đó là việc `vidgen` Step 2 làm dựa trên scene catalog thật
  của repo).
- Ước lượng thời lượng mỗi beat (dựa trên số từ / 4.2 từ/giây) chỉ là ước lượng cho outline
  — `durationInFrames` chính xác vẫn do `vidgen` tính lại sau khi có audio TTS thật.
