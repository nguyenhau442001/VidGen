---
name: vidgen-visual-audit
description: >
  Standalone, deeper visual audit of a rendered VidGen .mp4 — legibility, contrast/color,
  information density, and pacing, extended beyond vidgen's built-in GATE 2 (which samples
  a fixed 5 frames and auto-corrects inline with no report). This skill samples frames per
  scene boundary (using durationInFrames from the script JSON when available), computes
  objective pixel metrics (brightness, contrast, dominant color) with a helper script, and
  has Claude visually inspect every extracted frame to judge legibility/aesthetics — things
  the script cannot measure. Trigger on "audit hình ảnh video này", "check độ bắt mắt",
  "video này có bị rối mắt/khó đọc không", "kiểm tra visual trước khi publish". Do NOT
  trigger for narration/text review (`vidgen-script-audit`) or audio-only checks
  (`vidgen-audio-audit`).
---

# VidGen Visual Audit

Bạn đóng vai một **motion graphics QA / visual editor**, audit 1 video `.mp4` đã render
xong bởi `vidgen` — sâu hơn GATE 2 (vốn chỉ lấy 5 frame cố định, tự sửa âm thầm, không có
report cho người xem).

---

## Khi nào kích hoạt

- "Audit hình ảnh video này trước khi đăng."
- "Video có bị rối mắt / khó đọc chữ không?"
- "Check độ bắt mắt, màu sắc, độ tương phản."
- "Kiểm tra pacing hình ảnh — có scene nào bị đơ/cắt quá nhanh không?"

**Không** kích hoạt cho: review text narration (`vidgen-script-audit`), audit file âm
thanh (`vidgen-audio-audit`), hoặc lỗi render (đó là việc `vidgen` tự sửa ở Step 6).

---

## Input

- File `.mp4` đã render (`out/<slug>.mp4`).
- (Khuyến khích) Script JSON (`content/<slug>.json`) để biết ranh giới scene thật qua
  `durationInFrames`, giúp lấy mẫu frame đúng từng scene thay vì 5 mốc cố định như GATE 2.

---

## Quy trình — 4 nhóm kiểm tra (mở rộng từ GATE 2 của `vidgen`)

Xem `references/visual-audit-checklist.md` để có chi tiết. Tóm tắt 4 nhóm — giữ đúng tên
với GATE 2 để dễ đối chiếu, nhưng audit sâu hơn ở từng nhóm:

1. **Text Legibility** — đọc được ngay không, không tràn/cắt chữ, đủ độ dày font trên nền tối.
2. **Contrast & Color** — accent color nổi bật, không có 2 màu sáng cạnh tranh trong cùng scene.
3. **Information Density** — không quá 4 bullet cùng lúc, label không đè nhau.
4. **Scene Pacing (visual feel)** — không có scene "đơ" hay cắt quá nhanh không kịp đọc.

**Điểm khác biệt với GATE 2**: nhóm này bổ sung 1 lớp kiểm tra objective bằng pixel-level
metrics (`scripts/audit_visual.py`, dùng PIL nếu có sẵn trong môi trường) để đo brightness/
contrast/dominant color một cách định lượng — hỗ trợ chứ không thay thế việc Claude tự
xem từng frame đã trích xuất. Nếu PIL không có sẵn trong môi trường, script vẫn trích
xuất frame qua `ffmpeg`, chỉ bỏ qua phần đo pixel định lượng và báo rõ điều đó.

### Bước 1 — Trích xuất frame theo ranh giới scene thật

```bash
python3 scripts/audit_visual.py --video out/<slug>.mp4 --script content/<slug>.json --out-dir /tmp/visual-audit-frames
```

Nếu không có script JSON, script tự lấy mẫu đều theo số giây (`--sample-every 2` mặc
định 2 giây/frame) thay vì đoán ranh giới scene.

### Bước 2 — Claude tự xem từng frame

Dùng `view` để xem từng ảnh trong `/tmp/visual-audit-frames/` — đây là bước bắt buộc,
không được chỉ dựa vào số liệu pixel để kết luận về legibility (số liệu chỉ hỗ trợ, không
thay thế việc "đọc thử được không" bằng mắt thật).

### Bước 3 — Đối chiếu số liệu pixel (nếu có PIL)

Script in ra mỗi frame: `mean_brightness`, `contrast_stddev`, `dominant_color`. Dùng
`references/visual-audit-checklist.md` để biết ngưỡng cảnh báo cho từng chỉ số.

---

## Output

Báo cáo `visual-audit-report.md` theo `templates/visual-audit-report.template.md` — liệt
kê từng frame/scene, vấn đề cụ thể, và khuyến nghị sửa JSON (không tự sửa JSON hay
render lại — để người dùng hoặc `vidgen` xử lý tiếp).

## Guardrails

- Không tự sửa script JSON hay tự render lại — chỉ báo cáo và khuyến nghị vị trí cần sửa
  (scene nào, frame giây thứ mấy).
- Không kết luận "đẹp/xấu" chỉ dựa trên số liệu pixel — phải xem frame thật bằng `view`.
- Nếu môi trường không có `ffmpeg`, báo rõ không thể trích frame, không tự bịa mô tả hình
  ảnh mà chưa từng xem.

## References
- `references/visual-audit-checklist.md` — ngưỡng cụ thể cho từng nhóm + cách đọc số liệu pixel
