# vidgen-audio-audit

Audit độc lập cho file `.wav` do `vidgen.tts` sinh ra — lấp khoảng trống mà `vidgen`
hiện chưa có gate nào cho âm thanh (chỉ có GATE 1 content và GATE 2 visual).

## Khi nào dùng
- Trước khi ghép audio vào Remotion, muốn kiểm tra clipping/loudness/silence/duration.
- Nghi ngờ 1 scene bị lệch tốc độ đọc so với `durationInFrames` đã set trong script.

## Khi nào KHÔNG dùng
- Review nội dung/text narration → `vidgen-script-audit`.
- Kiểm tra hình ảnh video đã render → `vidgen-visual-audit`.

## Cách chạy

```bash
python3 scripts/audit_audio.py --dir <output_dir> --script content/<slug>.json --fps 30
```

hoặc audit 1 file đơn:
```bash
python3 scripts/audit_audio.py --file <path.wav>
```

Chỉ dùng thư viện chuẩn Python (`wave`, `array`, `math`) — không phụ thuộc `audioop` (đã
deprecated) hay `librosa`/`soundfile` (dù `vidgen.tts` có dùng, audit này không cần).

## Giới hạn
- Chỉ hỗ trợ WAV PCM 16-bit (đúng định dạng `vidgen.tts` xuất ra theo mô tả trong
  `vidgen` SKILL.md).
- Các chỉ số (RMS, clipping, silence) là phép đo tín hiệu số, không thay thế việc nghe
  thật để đánh giá ngữ điệu/phát âm tiếng Việt.
- Với file stereo, RMS được tính trên bản downmix mono đơn giản (trung bình 2 kênh) —
  đủ dùng cho QA nhưng không chính xác tuyệt đối như thư viện DSP chuyên dụng.
