---
name: vidgen-audio-audit
description: >
  Standalone audit of TTS-generated audio (per-scene .wav files from vidgen's tts_speed.py
  pipeline) — checks clipping, loudness consistency across scenes, silence gaps/dead air,
  and duration match against each scene's durationInFrames in the script JSON. This gap is
  NOT covered by vidgen's built-in GATE 1 (content) or GATE 2 (visual) — vidgen has no
  audio-quality gate today. Trigger on "audit âm thanh", "check file wav trước khi render
  video", "âm thanh có bị rè/clip không", "kiểm tra tốc độ đọc TTS có khớp không". Do NOT
  trigger for script/narration text review (`vidgen-script-audit`) or rendered-video visual
  checks (`vidgen-visual-audit`).
---

# VidGen Audio Audit

Bạn đóng vai một **audio QA engineer**, audit các file `.wav` do
`python -m vidgen.tts` sinh ra (theo `vidgen` SKILL.md Step 5) — trước hoặc sau khi
render video, độc lập với 2 gate có sẵn của `vidgen` (vốn không kiểm tra âm thanh).

---

## Khi nào kích hoạt

- "Audit âm thanh trước khi ghép vào video."
- "File TTS này nghe có bị clip/rè không?"
- "Tốc độ đọc của TTS có khớp với `durationInFrames` trong script không?"
- "Các scene có bị lệch loudness với nhau không?"

**Không** kích hoạt cho: review nội dung/text narration (`vidgen-script-audit`), hoặc
kiểm tra hình ảnh của video đã render (`vidgen-visual-audit`).

---

## Input

- Thư mục chứa `.wav` per-scene do `vidgen.tts` sinh ra (`output_dir/<scene_id>.wav`
  theo mô tả trong `vidgen` SKILL.md Step 5).
- (Tuỳ chọn) Script JSON để đối chiếu `durationInFrames` mỗi scene với độ dài `.wav` thật.

---

## Quy trình — 4 nhóm kiểm tra

Xem `references/audio-audit-checklist.md` để có ngưỡng cụ thể. Tóm tắt:

1. **Clipping** — tỷ lệ sample chạm biên độ tối đa; clip nhiều → giọng bị rè/vỡ tiếng.
2. **Loudness Consistency** — RMS (độ lớn trung bình) giữa các scene không lệch quá nhiều,
   tránh cảm giác "to nhỏ thất thường" khi xem liên tục nhiều scene.
3. **Silence / Dead Air** — khoảng lặng nội bộ dài bất thường (>120ms, đúng ngưỡng mà
   `tts_speed.py` của `vidgen` đã cố "collapse" — nếu vẫn còn nghĩa là bước trim chưa
   hoạt động đúng) hoặc khoảng lặng đầu/cuối file quá dài chưa được trim.
4. **Duration Match** — thời lượng thật của `.wav` so với `durationInFrames` tương ứng
   trong script JSON (nếu có) — lệch quá nhiều nghĩa là video sẽ bị cắt tiếng hoặc để
   khoảng trống hình ảnh không có audio.

Chạy công cụ hỗ trợ (chỉ dùng thư viện chuẩn Python — `wave`, `audioop`):

```bash
python3 scripts/audit_audio.py --dir <output_dir> [--script content/<slug>.json] [--fps 30]
```

Script in ra số liệu thô cho từng file (peak, RMS, clipping %, silence gaps, duration).
Claude đọc số liệu này, đối chiếu ngưỡng trong `references/audio-audit-checklist.md`, rồi
viết kết luận — script không tự phán "đạt/không đạt", chỉ cung cấp số liệu.

**Lưu ý về giới hạn kỹ thuật**: các phép đo ở đây (RMS, clipping, silence) là chỉ số tín
hiệu số, KHÔNG thay thế việc nghe thật. Nếu người dùng có thể nghe thử vài file, khuyến
khích xác nhận thêm về phát âm/ngữ điệu tiếng Việt — điều công cụ này không đo được.

---

## Output

Báo cáo `audio-audit-report.md` theo `templates/audio-audit-report.template.md`.

## Guardrails

- Không tự sửa file `.wav` hay chạy lại TTS — chỉ báo cáo và khuyến nghị (ví dụ: "chạy lại
  TTS cho scene X vì clipping 12%").
- Không kết luận "âm thanh hay/dở" về mặt cảm xúc/diễn cảm — chỉ báo cáo chỉ số kỹ thuật
  đo được; những đánh giá về ngữ điệu/phát âm cần người nghe thật xác nhận thêm.

## References
- `references/audio-audit-checklist.md` — ngưỡng cụ thể cho từng nhóm kiểm tra
