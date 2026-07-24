# Output Contracts

5 file bắt buộc mỗi lần hoàn tất nghiên cứu. Dùng template tương ứng trong `templates/`
làm điểm bắt đầu — không tự đổi tên field, vì `validate_research_output.py` và
`score_content_angles.py` phụ thuộc vào các tên field này.

## A. research-brief.md

Mục lục bắt buộc (theo đúng thứ tự):

1. Executive summary
2. Research question
3. Audience
4. Market context
5. Main pains
6. Jobs to Be Done
7. Triggers
8. Objections
9. Current alternatives
10. Customer language
11. Core tension
12. Key findings
13. Contradictions
14. Facts
15. Expert opinions
16. Community observations
17. Hypotheses
18. Evidence gaps
19. Recommended direction
20. Directions to avoid
21. Source list

Mục 14–17 (Facts / Expert opinions / Community observations / Hypotheses) phải tách
riêng — không trộn lẫn các loại evidence (xem `evidence-quality.md`).

## B. audience-pain-map.json

```json
{
  "topic": "",
  "segments": [
    {
      "name": "",
      "role": "",
      "experience_level": "",
      "current_workflow": [],
      "trigger_events": [],
      "functional_pains": [],
      "emotional_pains": [],
      "professional_pains": [],
      "current_alternatives": [],
      "desired_outcomes": [],
      "objections": [],
      "customer_language": [],
      "awareness_stage": "",
      "evidence": [],
      "confidence": "low|medium|high"
    }
  ]
}
```

Tối đa 3 phần tử trong `segments`.

## C. angle-matrix.json

```json
{
  "angles": [
    {
      "title": "",
      "one_sentence_concept": "",
      "audience": "",
      "core_pain": "",
      "core_tension": "",
      "new_belief": "",
      "proof_mechanism": "",
      "evidence": [],
      "visual_metaphor": "",
      "cta": "",
      "series_potential": "",
      "risks": [],
      "disclaimers": [],
      "scores": {
        "pain_recognition": 0,
        "relevance": 0,
        "novelty": 0,
        "emotional_tension": 0,
        "credibility": 0,
        "proof_potential": 0,
        "visual_potential": 0,
        "shareability": 0,
        "save_value": 0,
        "channel_fit": 0,
        "vidgen_fit": 0,
        "exaggeration_risk": 0
      }
    }
  ],
  "recommended_angle": "",
  "reasoning": "",
  "tradeoffs": []
}
```

5–8 phần tử trong `angles`. Mỗi score 1–10. `recommended_angle` phải khớp chính xác
với một `title` trong `angles` và angle đó phải có `proof_mechanism` khác rỗng.

## D. source-log.md

Danh sách nguồn, mỗi nguồn theo format trong `source-hierarchy.md`:
ID, Title, URL, Organization, Publish date, Type, Reliability, Supported claims,
Limitations, Notes.

## E. video-opportunity.json

```json
{
  "recommended_angle": "",
  "audience": "",
  "viewer_belief_before": "",
  "viewer_belief_after": "",
  "core_argument": "",
  "proof_needed": [],
  "visual_opportunities": [
    {
      "narrative_function": "",
      "concept": "",
      "possible_scene_types": [],
      "required_assets": [],
      "risk": ""
    }
  ],
  "recommended_next_skill": "vidgen-narrative-director"
}
```

`recommended_angle` phải khớp với `angle-matrix.json`. Mỗi phần tử trong
`visual_opportunities` phải có `narrative_function` hợp lệ (xem
`visual-opportunity-framework.md`).

## Vị trí lưu output

Trừ khi người dùng chỉ định khác, lưu 5 file này trong một thư mục theo slug của chủ đề,
ví dụ `research/<topic-slug>/`, cạnh thư mục `content/` mà `vidgen` skill dùng để đọc
script JSON — giúp skill tiếp theo dễ tìm thấy input.
