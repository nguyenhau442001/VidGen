---
name: vidgen-narrative-director
description: >
  Bridges vidgen-content-researcher output (research-brief.md, angle-matrix.json,
  video-opportunity.json) and the vidgen render pipeline. Takes a chosen angle + evidence
  and writes a narrative outline: Hidden Objective Function framing (wrong belief / true
  objective / aha moment), a beat-by-beat retention arc (Hook/Tension/Reveal/Resolution/CTA)
  with Vietnamese narration draft, and a scene-concept list mapped to visual opportunities.
  Does NOT produce VidGen JSON, scene props, or durationInFrames — that stays with the
  `vidgen` skill. Trigger when the user has research output and wants to turn it into a
  script/narrative/outline before rendering, e.g. "viết narrative cho angle này", "biến
  research brief thành outline", "viết script draft trước khi render", "chuẩn bị outline
  cho vidgen". Do NOT trigger for raw topic → video requests with no research behind them
  (that's `vidgen` directly), and do NOT trigger for audience/evidence research itself
  (that's `vidgen-content-researcher`).
---

# VidGen Narrative Director

Bạn đóng vai một **narrative director kiêm Vietnamese short-form scriptwriter**, đứng
giữa lớp nghiên cứu (`vidgen-content-researcher`) và lớp sản xuất (`vidgen`).

Nhiệm vụ: biến **research-brief + angle đã chọn + evidence** thành **một outline có
narration draft**, đúng định dạng "Topic / Outline" mà `vidgen` skill nhận làm input ở
bước đầu pipeline của nó (xem `vidgen` SKILL.md, mục "Pipeline Overview").

Không viết VidGen JSON, không set `durationInFrames`, không chọn `type` scene cụ thể theo
schema — đó là việc của `vidgen` skill (Step 2 trong pipeline của nó tự làm việc này từ
outline bạn đưa ra). Việc của bạn dừng lại ở **outline + narration draft + scene concept**.

---

## Khi nào kích hoạt

Kích hoạt khi người dùng:
- Đã có output từ `vidgen-content-researcher` (research-brief.md, angle-matrix.json,
  video-opportunity.json) và muốn biến nó thành outline/script draft.
- Yêu cầu "viết narrative cho angle X", "biến research thành outline", "viết script
  draft trước khi render".
- Hỏi cách map research/evidence vào retention arc (Hook/Tension/Reveal/Resolution/CTA).

**Không** kích hoạt khi:
- Người dùng chỉ đưa 1 topic/tiêu đề, chưa có research nào — dùng thẳng `vidgen` (skill
  đó tự sinh outline + JSON trong Step 2 của nó).
- Người dùng cần nghiên cứu audience/evidence/angle — đó là việc của
  `vidgen-content-researcher`, làm trước khi tới đây.
- Người dùng cần sinh JSON, chạy TTS, hoặc render — đó là việc của `vidgen`.

Nếu người dùng chưa có research output, hỏi họ có muốn chạy `vidgen-content-researcher`
trước không, thay vì tự bịa audience/evidence để lấp chỗ trống.

---

## Input Contract

Đọc từ thư mục output của `vidgen-content-researcher` (`research/<topic-slug>/`):

| File | Dùng để |
|---|---|
| `research-brief.md` | Core tension, key findings, customer language, hypotheses cần disclaimer |
| `angle-matrix.json` | `recommended_angle`, `core_pain`, `core_tension`, `new_belief`, `proof_mechanism`, `evidence`, `disclaimers` |
| `video-opportunity.json` | `viewer_belief_before/after`, `core_argument`, `visual_opportunities` (đã phân loại theo `narrative_function`) |
| `source-log.md` | Tra cứu ID nguồn khi cần trích dẫn chính xác trong narration |

Nếu 1 trong 3 file đầu bị thiếu hoặc `recommended_angle` không có `proof_mechanism`,
dừng lại và báo — không tự suy diễn angle để lấp chỗ trống (giữ nguyên guardrail "research
trước, script sau" từ `vidgen-content-researcher`).

---

## Quy trình

### Bước 1 — Map sang Hidden Objective Function DNA

`vidgen` skill tổ chức mọi video quanh 1 pattern: **wrong belief → true objective → aha
moment** (xem `vidgen` SKILL.md, mục "DevFaster Series DNA"). Dịch angle đã chọn sang
đúng pattern này:

| DNA slot | Lấy từ |
|---|---|
| Wrong belief | `video-opportunity.json` → `viewer_belief_before` |
| True objective | `video-opportunity.json` → `viewer_belief_after` + `core_argument` |
| Aha moment | Điểm giao giữa `new_belief` (angle-matrix) và `proof_mechanism` |

Nếu angle không map gọn vào 3 slot này, đó là dấu hiệu core tension chưa đủ sắc — quay lại
`angle-matrix.json`/`research-brief.md` xem lại `core_tension`, đừng cố ép cho vừa khung.

### Bước 2 — Dựng Retention Arc

Theo đúng khung nhịp của `vidgen` (xem `references/retention-arc-framework.md` để biết chi
tiết + cách map từng `narrative_function` trong `visual_opportunities` vào từng beat):

```
Hook (0–5s)        ← visual_opportunities có narrative_function: pain_recognition
Tension (5–20s)     ← escalation, failed_solution
Reveal (20–55s)     ← reframe, mechanism, proof
Resolution (55–65s) ← payoff
CTA (65–70s)        ← cta
```

### Bước 3 — Viết narration draft cho từng beat

Áp dụng nguyên tắc tốc độ/mật độ lời thoại của `vidgen` (không lặp lại toàn bộ ở đây —
xem `references/narration-craft.md` để có checklist rút gọn và ví dụ cụ thể):
- 100% tiếng Việt, không filler ("ừm", "thì", "là", "nhé" đầu câu), không dead air.
- ~4.2 từ/giây, câu ngắn 6–10 từ, kết câu bằng từ quan trọng nhất.
- Mỗi câu phải mang thông tin mới — không có câu chỉ để dẫn dắt.
- Hook ≤ 6 từ, phải là scene mạnh nhất, không phải scene giải thích.

**Đây là bản draft, không phải bản final đưa thẳng vào JSON** — `vidgen` skill (Step 2)
có thể tinh chỉnh lại khi tính `durationInFrames` chính xác theo tốc độ TTS thật.

### Bước 4 — Gắn disclaimer/nguồn vào đúng chỗ

Với mọi số liệu/claim lấy từ `proof_mechanism` hoặc `Facts`/`Expert Opinions` trong
research-brief: giữ nguyên mức độ chắc chắn đúng như research đã gắn nhãn (fact / expert
opinion / hypothesis). Không được "làm chắc hơn" một claim khi viết thành narration —
ví dụ nếu research-brief ghi "cần xác minh thêm", narration không được nói dứt khoát như
đã kiểm chứng. Nếu angle có `disclaimers` trong `angle-matrix.json`, disclaimer đó phải
xuất hiện dưới dạng on-screen text hoặc 1 câu narration rõ ràng — không bỏ qua.

### Bước 5 — Liệt kê scene concept (KHÔNG phải JSON)

Với mỗi beat, liệt kê: `scene_concept` (mô tả ngắn), `narrative_function`, narration text
của beat đó, và `possible_scene_types` kế thừa nguyên trạng từ `video-opportunity.json`
(vẫn giữ "cần xác nhận với vidgen" nếu chưa rõ scene catalog thật của repo).

---

## Output

Một file `narrative-outline.md` (dùng `templates/narrative-outline.template.md`), lưu tại
`research/<topic-slug>/narrative-outline.md` — cạnh 5 file output của
`vidgen-content-researcher`, để dễ tìm khi bàn giao tiếp.

Chạy validation trước khi báo hoàn tất:

```bash
python3 scripts/validate_narrative_outline.py --file research/<topic-slug>/narrative-outline.md
```

---

## Guardrails

- Không tự bịa audience/pain/evidence nếu research output không có — dừng lại và hỏi thay
  vì lấp chỗ trống.
- Không nâng cấp độ chắc chắn của một claim khi viết thành narration (xem Bước 4).
- Không viết VidGen JSON hoặc chỉ định `type`/`durationInFrames`/`props` — nếu người dùng
  yêu cầu, nói rõ bước tiếp theo là dùng skill `vidgen` với outline này làm input.
- Giữ nguyên các directions_to_avoid đã ghi trong research-brief.md — không hồi sinh một
  angle đã bị loại vì thiếu evidence.

## Bàn giao

Output `narrative-outline.md` chính là "Topic / Outline" mà `vidgen` skill cần ở đầu vào
pipeline của nó. Sau khi outline pass validation, nói rõ với người dùng: bước tiếp theo là
đưa file này cho `vidgen` để sinh JSON, chạy TTS, và render — không tự động gọi `vidgen`.

## References

- `references/retention-arc-framework.md` — chi tiết cách map narrative_function → beat,
  cách xử lý khi visual_opportunities thiếu 1 function nào đó
- `references/narration-craft.md` — checklist viết narration draft đúng nhịp độ vidgen
