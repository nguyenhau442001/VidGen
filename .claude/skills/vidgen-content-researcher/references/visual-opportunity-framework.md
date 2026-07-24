# Visual Opportunity Framework

Áp dụng ở Phase 7, sau khi đã có angle đủ mạnh từ Phase 6. Mục tiêu: xác định angle
này có thể kể bằng hình ảnh trong VidGen hay không — **ở mức concept, không viết JSON**.
JSON thật thuộc về skill sản xuất (`vidgen` / `vidgen-scene-director` /
`vidgen-json-compiler`).

## Các câu hỏi cần trả lời cho mỗi angle mạnh

- Nhân vật hoặc tình huống nào mở đầu video (không cần nhân vật hư cấu có tên — có thể
  là tình huống "một người dùng Grab đang chờ đơn hàng").
- Hành động nào có thể **quan sát được** bằng mắt (không phải khái niệm trừu tượng)?
- Object hoặc UI nào có thể animate (bản đồ, màn hình app, sơ đồ hệ thống, đoạn code)?
- Có before/after rõ ràng để dựng cảnh so sánh không?
- Có transformation visual (một trạng thái biến đổi thành trạng thái khác) không?
- Có thể trực quan hóa một workflow (các bước nối tiếp nhau) không?
- Có dữ liệu nào đáng để data-visualize (biểu đồ, con số động) không?
- Có ẩn dụ/metaphor hình ảnh nào giúp khái niệm trừu tượng trở nên cụ thể không?
- Payoff cuối cùng cho người xem là gì — cảm giác "aha" cụ thể ra sao?

## Phân loại chức năng của mỗi visual opportunity (`narrative_function`)

| Function | Vai trò trong arc |
|---|---|
| `pain_recognition` | Cho người xem thấy chính họ trong tình huống này |
| `escalation` | Làm vấn đề trở nên rõ ràng/nghiêm trọng hơn |
| `failed_solution` | Cho thấy cách làm cũ/giả định cũ không hoạt động |
| `reframe` | Chuyển góc nhìn — "hóa ra hệ thống đang tối ưu cho..." |
| `mechanism` | Giải thích cơ chế thật đứng sau |
| `proof` | Chứng minh bằng số liệu/ví dụ/demo |
| `payoff` | Khoảnh khắc "aha", người xem cảm thấy thông minh hơn |
| `cta` | Dẫn tới hành động/open loop tiếp theo |

Một angle mạnh thường cần visual opportunity phủ được ít nhất: `pain_recognition`,
`reframe` hoặc `mechanism`, và `proof` hoặc `payoff`. Nếu không thể hình dung được visual
cho `mechanism` hoặc `proof`, đánh dấu `vidgen_fit` thấp trong angle-matrix — đừng ép
chọn làm recommended_angle.

## Output mỗi visual opportunity (dùng trong `video-opportunity.json`)

```json
{
  "narrative_function": "reframe",
  "concept": "Mô tả ngắn gọn cảnh này thể hiện điều gì, không phải shot list chi tiết",
  "possible_scene_types": ["ví dụ: MapRouteScene, SplitCompareScene — chỉ nêu tên loại scene có thể tái sử dụng hoặc cần bổ sung"],
  "required_assets": ["ví dụ: bản đồ tĩnh, mock UI app, icon hệ thống"],
  "risk": "Rủi ro cụ thể nếu dựng cảnh này (dễ hiểu sai, cần disclaimer, khó truyền tải trong thời lượng ngắn...)"
}
```

`possible_scene_types` nên tham chiếu tới scene catalog thật của repo nếu có
(`docs/`, `src/`, hoặc `SCHEMA.md` trong repo VidGen) — skill này không giả định tên
scene cụ thể vì chúng thay đổi theo repo. Nếu chưa biết catalog hiện có, ghi rõ
"cần xác nhận với vidgen-scene-director" thay vì đoán tên scene.

## Ranh giới rõ ràng: KHÔNG làm ở phase này

- Không viết `durationInFrames`, `props`, hay bất kỳ field JSON thực tế nào.
- Không quyết định animation curve, font, màu sắc cụ thể.
- Không viết narration text đầy đủ cho từng scene — chỉ concept.

Việc chuyển từ visual opportunity → JSON thật là nhiệm vụ của skill sản xuất kế tiếp.
