# Audio Audit Report — <TITLE>

- Thư mục/scene audited: <path>
- Script JSON đối chiếu duration: <path hoặc "Không có — bỏ qua đối chiếu duration">
- Ngày audit: <date>

## Bảng tổng hợp theo scene

| Scene | Duration (s) | Peak | RMS (dBFS) | Clip % | Leading/Trailing silence (ms) | Internal gaps | Duration match |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Vấn đề cụ thể

### Clipping
- <scene — clip % — khuyến nghị>

### Loudness Consistency
- <scene chênh lệch RMS bao nhiêu so với các scene khác — khuyến nghị normalize>

### Silence / Dead Air
- <scene — vị trí gap (ms) — độ dài — khuyến nghị>

### Duration Match
- <scene — expected vs actual — khuyến nghị>

## Khuyến nghị cuối cùng

- [ ] Sẵn sàng ghép vào video (không có cảnh báo nghiêm trọng)
- [ ] Cần chạy lại TTS cho các scene: <danh sách>
- [ ] Cần điều chỉnh `durationInFrames` trong script JSON cho các scene: <danh sách>
- [ ] Đã nghe thử thủ công và xác nhận: <ghi chú bổ sung nếu có, vì chỉ số kỹ thuật không
      thay thế việc nghe thật>
