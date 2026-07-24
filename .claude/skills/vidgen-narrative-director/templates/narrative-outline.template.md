# Narrative Outline — <TITLE>

- Slug: <topic-slug hoặc topic-slug-pN nếu là series>
- Nguồn: research/<topic-slug>/ (research-brief.md, angle-matrix.json, video-opportunity.json)
- Angle: <recommended_angle từ angle-matrix.json>

## Hidden Objective Function Mapping

- Wrong belief: <viewer_belief_before>
- True objective: <viewer_belief_after + core_argument>
- Aha moment: <new_belief ∩ proof_mechanism>

## Retention Arc

### Hook (0–5s) — <narrative_function: pain_recognition>
- Scene concept: <mô tả ngắn>
- Narration draft: "<câu ≤ 6 từ, mô tả hành vi kỳ lạ>"
- possible_scene_types: <kế thừa từ video-opportunity.json, giữ "cần xác nhận" nếu chưa rõ>

### Tension (5–20s) — <narrative_function: escalation / failed_solution>
- Scene concept:
- Narration draft:
- possible_scene_types:

### Reveal (20–55s) — <narrative_function: reframe / mechanism / proof>
- Scene concept:
- Narration draft:
- possible_scene_types:
- Disclaimer cần giữ (nếu có, từ angle-matrix.json → disclaimers):

### Resolution (55–65s) — <narrative_function: payoff>
- Scene concept:
- Narration draft:
- possible_scene_types:

### CTA (65–70s) — <narrative_function: cta>
- Scene concept:
- Narration draft:
- possible_scene_types:

## Ước lượng thời lượng
- Tổng số từ narration: <n> từ → ước lượng <n/4.2> giây (chỉ ước lượng, `vidgen` Step 2
  sẽ tính lại `durationInFrames` chính xác theo TTS thật)

## Ghi chú bàn giao
- Series: <Part N of M, hoặc "Không phải series">
- Điều cần `vidgen` xử lý tiếp: sinh JSON theo schema, chọn scene type cụ thể, chạy TTS,
  render, và GATE 1/GATE 2 quality audit.
- Directions to avoid (kế thừa từ research-brief.md): <liệt kê nếu có>
