# vidgen-visual-audit

Audit độc lập, sâu hơn GATE 2 của `vidgen` (vốn chỉ lấy 5 frame cố định, tự sửa âm thầm,
không có report). Skill này lấy mẫu frame theo đúng ranh giới scene thật (nếu có script
JSON), đo vài chỉ số pixel khách quan để biết frame nào cần xem kỹ, và **bắt buộc Claude
tự xem từng frame** trước khi kết luận — số liệu không thay thế việc nhìn thật.

## Khi nào dùng
- Trước khi publish, muốn 1 báo cáo audit hình ảnh tường minh hơn GATE 2 tự động.
- Nghi ngờ video bị rối mắt, khó đọc chữ, hoặc pacing không đều.

## Khi nào KHÔNG dùng
- Review text narration → `vidgen-script-audit`.
- Audit file âm thanh → `vidgen-audio-audit`.

## Cách chạy

```bash
python3 scripts/audit_visual.py --video out/<slug>.mp4 --script content/<slug>.json --out-dir /tmp/visual-audit-frames
```

Sau đó **dùng `view` để xem từng file** trong `/tmp/visual-audit-frames/` — đây là bước
bắt buộc, không được bỏ qua để chỉ dựa vào số liệu pixel.

## Yêu cầu môi trường
- `ffmpeg` trên PATH — vidgen đã cần cái này cho GATE 2 của chính nó, nên thường có sẵn.
- `Pillow` (PIL) — tùy chọn, dùng để tính `mean_brightness`/`contrast_stddev`/dominant
  color. Nếu không có, script vẫn trích frame bình thường, chỉ báo rõ bỏ qua phần đo pixel.

## Giới hạn
- Chỉ số pixel là gợi ý sơ bộ (brightness/contrast/màu trung bình) — không đo được
  legibility thật (font, kerning, overlap chữ) hay "đẹp/xấu" theo gu thẩm mỹ. Việc đó vẫn
  cần Claude xem trực tiếp bằng `view`.
- `dominant_color_approx_rgb` là màu trung bình toàn frame, không phải thuật toán phân
  cụm màu thật — chỉ đủ để gợi ý tông màu tổng thể, không chính xác cho scene nhiều màu.
