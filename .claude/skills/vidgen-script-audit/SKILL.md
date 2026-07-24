---
name: vidgen-script-audit
description: >
  Standalone, deeper audit of a VidGen script JSON (or narrative outline before JSON) —
  hook strength, retention arc integrity, narration pacing/density, DNA pattern compliance,
  and crucially: cross-checks every stat/claim in the narration against source-log.md to
  catch fabricated or unverified claims that slipped through. This is NOT the same as
  vidgen's built-in GATE 1 (which runs inline during render and only self-corrects hook/
  arc/pacing) — this skill is user-invoked, produces a written report, and additionally
  does fact-checking against research sources. Trigger on "audit kịch bản", "audit script
  này", "check lại script trước khi render", "script này có bịa số liệu không", "review
  narration". Do NOT trigger for JSON syntax errors (that's a render-time fix in `vidgen`)
  or for auditing already-rendered video/audio (use `vidgen-visual-audit` / `vidgen-audio-audit`).
---

# VidGen Script Audit

Bạn đóng vai một **script editor kiêm fact-checker**, audit một VidGen script JSON (hoặc
narrative outline nếu JSON chưa tồn tại) trước khi nó được render.

Khác với GATE 1 trong `vidgen` (tự động, self-correct, không có report cho người xem),
skill này:
1. Được người dùng chủ động gọi, không tự động chạy trong pipeline.
2. Tạo ra 1 báo cáo audit đầy đủ, không chỉ 1 con số.
3. Cross-check narration với `source-log.md` (nếu có) để bắt số liệu/claim bịa hoặc bị
   nâng cấp mức độ chắc chắn so với research gốc — điều GATE 1 của `vidgen` không làm.

---

## Khi nào kích hoạt

- "Audit kịch bản này trước khi render."
- "Script này có bịa số liệu không?"
- "Review lại narration/retention arc trước khi render."
- "Kiểm tra script JSON có khớp với research không."

**Không** kích hoạt cho: lỗi cú pháp JSON (đó là việc `vidgen` tự sửa khi render), audit
video đã render (`vidgen-visual-audit`), audit file âm thanh (`vidgen-audio-audit`).

---

## Input

- Script JSON (`content/<slug>.json`) hoặc `narrative-outline.md` (từ
  `vidgen-narrative-director`) nếu JSON chưa có.
- Nếu có, `research/<slug>/source-log.md` và `research/<slug>/angle-matrix.json` để
  fact-check — nếu không có, vẫn audit được cấu trúc/nhịp độ nhưng bỏ qua bước fact-check
  và phải nói rõ trong báo cáo là "không có nguồn để đối chiếu".

---

## Quy trình audit — 5 nhóm kiểm tra

Xem `references/script-audit-checklist.md` để có chi tiết đầy đủ từng nhóm và cách chấm
điểm. Tóm tắt 5 nhóm:

1. **Hook Strength** — ≤6 từ, mô tả hành vi lạ (không phải tên công nghệ), là scene mạnh
   nhất trong toàn bộ script.
2. **Retention Arc Integrity** — đủ 5 giai đoạn Hook/Tension/Reveal/Resolution/CTA, không
   giai đoạn nào bị bỏ trống hoặc quá dài gây "đơ".
3. **Narration Density & Pacing** — không filler, không câu chỉ để dẫn dắt, tốc độ khớp
   ~4.2 từ/giây, `durationInFrames` khớp với độ dài narration.
4. **DNA Compliance** — có đúng pattern wrong belief → true objective → aha moment không,
   hay chỉ đang liệt kê fact rời rạc.
5. **Fact-Check / Fabrication Cross-Check** (chỉ chạy nếu có `source-log.md`) — mọi số
   liệu/claim cụ thể trong narration phải trỏ được về 1 Source ID có `reliability: fact`
   hoặc được gắn đúng disclaimer nếu là `hypothesis`/`expert_opinion`. Đây là bước quan
   trọng nhất — script tự động `scripts/audit_script.py` hỗ trợ nhóm này bằng cách trích
   xuất mọi con số xuất hiện trong narration để bạn đối chiếu thủ công với source-log,
   KHÔNG tự động kết luận đúng/sai (fact-checking ngữ nghĩa vẫn cần con người/Claude đọc).

Chạy:
```bash
python3 scripts/audit_script.py --script content/<slug>.json --source-log research/<slug>/source-log.md
```
Script in ra: danh sách số liệu/con số tìm thấy trong narration, độ dài mỗi câu, ước
lượng tốc độ đọc theo `durationInFrames`, và cảnh báo filler/hook quá dài. Bạn (Claude)
đọc kết quả này rồi tự đối chiếu ngữ nghĩa với source-log để viết phần Fact-Check của
báo cáo — script không tự kết luận thay bạn.

---

## Output

Báo cáo `script-audit-report.md` theo `templates/script-audit-report.template.md`, gồm:
điểm số 5 nhóm (thang 1-10), danh sách vấn đề cụ thể kèm vị trí (beat nào, câu nào), và
khuyến nghị sửa — không tự sửa script, để người dùng hoặc `vidgen` xử lý tiếp.

## Guardrails

- Không tự "làm chắc hơn" một claim khi viết audit report — nếu source-log ghi
  `hypothesis`, audit report phải ghi rõ là "chưa xác minh", không phải "sai".
- Không tự sửa script JSON/outline — chỉ báo cáo và khuyến nghị.
- Nếu không có source-log, audit report phải nói rõ "Fact-Check: bỏ qua vì không có
  nguồn đối chiếu" — không được bỏ qua âm thầm.

## References
- `references/script-audit-checklist.md` — chi tiết 5 nhóm kiểm tra + cách chấm điểm
