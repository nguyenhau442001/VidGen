# Audio Audit Checklist

Ngưỡng dưới đây là baseline hợp lý cho giọng đọc TTS tiếng Việt trong video ngắn — điều
chỉnh nếu repo có ngưỡng riêng đã được kiểm chứng qua nhiều lần render.

## 1. Clipping
- **Ngưỡng cảnh báo**: > 0.1% sample chạm biên độ tối đa (±32767 với PCM 16-bit).
- **Ngưỡng fail**: > 1% sample chạm biên độ tối đa — giọng gần như chắc chắn bị rè/vỡ
  tiếng nghe được bằng tai.
- Khuyến nghị khi fail: giảm gain đầu vào TTS hoặc kiểm tra bước normalize trong
  `tts_speed.py`.

## 2. Loudness Consistency (RMS giữa các scene)
- Tính RMS (root-mean-square) trung bình mỗi file `.wav`.
- **Ngưỡng cảnh báo**: chênh lệch RMS giữa scene to nhất và nhỏ nhất > 6dB tương đương
  (≈ gấp đôi biên độ) — người xem sẽ cảm nhận rõ "chỗ to chỗ nhỏ".
- Khuyến nghị khi fail: áp normalize loudness đồng bộ (ví dụ chuẩn hóa về cùng RMS target)
  trước khi ghép vào Remotion.

## 3. Silence / Dead Air
- **Khoảng lặng đầu/cuối file**: nên < 100ms sau khi trim (theo mô tả `tts_speed.py`
  trong `vidgen` đã tự trim leading/trailing silence — nếu audit thấy > 300ms, bước trim
  có thể chưa chạy đúng).
- **Khoảng lặng nội bộ**: theo `vidgen`, các pause > 120ms giữa câu nên đã bị collapse.
  Nếu audit vẫn phát hiện gap nội bộ > 120ms, đây là dấu hiệu bug ở bước xử lý TTS, không
  phải vấn đề nội dung — báo lại đúng vị trí (giây thứ mấy trong file) để dễ debug.

## 4. Duration Match (so với `durationInFrames`)
- Thời lượng `.wav` thật (giây) so với `durationInFrames / fps` của scene tương ứng.
- **Ngưỡng cảnh báo**: lệch > 0.3s — video có thể bị cắt tiếng giữa câu hoặc để khoảng
  trống không lời ở cuối scene.
- **Ngưỡng fail**: lệch > 1.0s — gần như chắc chắn gây lỗi sync rõ rệt khi xem.
- Khuyến nghị khi fail: điều chỉnh `durationInFrames` trong JSON theo thời lượng `.wav`
  thật (đây chính là bước "Audio sync error" mà `vidgen` Step 6 tự sửa khi render — audit
  này giúp phát hiện sớm hơn, trước khi tốn thời gian render).

## Cách đọc output của `audit_audio.py`

Script in ra mỗi file: `peak`, `rms`, `clip_ratio`, `leading_silence_ms`,
`trailing_silence_ms`, `internal_gaps` (danh sách vị trí + độ dài các khoảng lặng nội bộ
> 120ms), và `duration_s`. Nếu có `--script`, thêm `duration_mismatch_s` so với
`durationInFrames` của scene cùng ID (khớp theo tên file `<scene_id>.wav`).

Không có ngưỡng nào trong checklist này là tuyệt đối — nếu 1 file "cảnh báo" nhưng nghe
thử vẫn ổn, ghi rõ trong report là "cảnh báo kỹ thuật, đã nghe thử và chấp nhận được" thay
vì tự động chặn.
