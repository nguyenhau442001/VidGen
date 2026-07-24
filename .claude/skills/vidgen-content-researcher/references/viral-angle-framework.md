# Viral Angle Framework

## Nguyên tắc sinh angle

Sinh **5–8 angle khác biệt thật sự** — khác nhau về góc nhìn/luận điểm, không phải chỉ
đổi cách viết hook cho cùng một ý. Mỗi angle phải đứng vững nếu tách riêng khỏi các
angle khác.

## Cấu trúc bắt buộc của mỗi angle

- `title` — tên ngắn gọn, dễ phân biệt với angle khác.
- `one_sentence_concept` — tóm tắt trong 1 câu.
- `audience` — segment nào (khớp với `audience-pain-map.json`).
- `core_pain` — pain cụ thể angle này khai thác.
- `core_tension` — mâu thuẫn trung tâm (từ Phase 5).
- `new_belief` — niềm tin mới người xem sẽ có sau khi xem xong.
- `evidence` — ID nguồn hỗ trợ (từ source-log).
- `proof_mechanism` — cách chứng minh luận điểm (số liệu, demo, before/after, ví dụ
  thật) — **angle không có proof_mechanism không được chọn làm recommended_angle**.
- `visual_metaphor` — hình ảnh/ẩn dụ có thể dựng trong VidGen.
- `risk` — rủi ro cụ thể (hiểu sai, phóng đại, gây tranh cãi không cần thiết…).
- `disclaimers` — điều cần nói rõ để không phóng đại (vd: "đây là ước tính, không phải
  số liệu chính thức").
- `cta` — hành động đề xuất cuối video.
- `series_potential` — có thể mở rộng thành nhiều phần không, và theo hướng nào.

## Hệ thống chấm điểm (thang 1–10 mỗi tiêu chí)

| Tiêu chí | Câu hỏi |
|---|---|
| `pain_recognition` | Audience có nhận ra ngay đây là vấn đề của họ không? |
| `relevance` | Angle có sát với audience đã định nghĩa không? |
| `novelty` | Góc nhìn này có mới so với nội dung đã có trên thị trường không? |
| `emotional_tension` | Mâu thuẫn có đủ mạnh để tạo cảm xúc không? |
| `credibility` | Có đủ evidence chất lượng để đứng vững không? |
| `proof_potential` | Có thể chứng minh trực quan/số liệu trong video không? |
| `visual_potential` | Có thể dựng cảnh sinh động trong VidGen không? |
| `shareability` | Người xem có muốn share/gửi cho đồng nghiệp không? |
| `save_value` | Người xem có muốn lưu lại để xem lại/áp dụng không? |
| `channel_fit` | Có khớp định vị và giọng kênh (DevFaster DNA) không? |
| `vidgen_fit` | Có thể sản xuất được với scene types hiện có hoặc dễ mở rộng không? |
| `exaggeration_risk` | Điểm CÀNG CAO nghĩa là rủi ro phóng đại/sai sự thật CÀNG LỚN — đây là điểm phạt, không phải điểm cộng. |

## Nguyên tắc chọn angle được đề xuất

**Không** chỉ chọn angle có tổng điểm cao nhất một cách máy móc. Bắt buộc giải thích
trade-off, ví dụ:

- Angle A gây tò mò cao (`novelty` 9) nhưng `credibility` chỉ 4 → rủi ro nếu chưa đủ
  evidence.
- Angle B chuyên môn cao (`credibility` 9) nhưng `relevance` thấp vì audience quá hẹp.
- Angle C có `visual_potential` tốt nhưng `proof_potential` thấp — khó chứng minh luận
  điểm trong 70 giây.
- Angle D dễ viral (`shareability` cao) nhưng `channel_fit` thấp — không phù hợp định
  vị kênh dù có thể thắng về view.

`angle-matrix.json` phải có field `reasoning` và `tradeoffs` giải thích rõ vì sao chọn
`recommended_angle`, không chỉ liệt kê điểm số.

## Cách dùng `score_content_angles.py`

Script tính weighted score có cấu hình sẵn (xem docstring trong script), đảm bảo
`exaggeration_risk` **trừ** điểm thay vì cộng, và tự động cảnh báo các pattern rủi ro:
novelty cao/credibility thấp, shareability cao/proof thấp, visual cao/relevance thấp,
hoặc angle hứa hẹn quá mức (dựa trên từ khóa tuyệt đối trong `new_belief`/`title`).

Chạy `python3 scripts/score_content_angles.py --file angle-matrix.json` sau khi soạn
xong angle-matrix để có bảng xếp hạng và cảnh báo trước khi chốt `recommended_angle`.
