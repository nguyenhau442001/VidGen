# vidgen-script-audit

Audit độc lập, chủ động gọi được, cho script JSON hoặc narrative outline — trước khi
render. Khác với GATE 1 tự động trong `vidgen` (self-correct âm thầm, không có report),
skill này tạo báo cáo đầy đủ và **fact-check ngược lại `source-log.md`** để bắt số liệu
bịa hoặc bị nâng cấp mức độ tin cậy so với research gốc.

## Khi nào dùng

- Trước khi render, muốn 1 báo cáo audit tường minh thay vì để `vidgen` tự sửa âm thầm.
- Nghi ngờ script có số liệu bịa hoặc claim vượt quá mức evidence cho phép.
- Muốn kiểm tra retention arc/DNA compliance độc lập với việc render.

## Khi nào KHÔNG dùng
- Lỗi cú pháp JSON → để `vidgen` tự sửa khi render.
- Audit video/âm thanh đã render → `vidgen-visual-audit` / `vidgen-audio-audit`.

## Cách chạy công cụ hỗ trợ

```bash
python3 scripts/audit_script.py --script content/<slug>.json --source-log research/<slug>/source-log.md
```

Hoặc audit trực tiếp outline trước khi có JSON:
```bash
python3 scripts/audit_script.py --script research/<slug>/narrative-outline.md
```

Script chỉ trích xuất dữ liệu (word count, filler, số liệu, ước lượng thời lượng) — **không
tự kết luận đúng/sai**, việc đọc và fact-check ngữ nghĩa vẫn do Claude/người dùng làm dựa
trên dữ liệu đã trích xuất, rồi điền vào `templates/script-audit-report.template.md`.

## Giới hạn
- Không tự động verify ngữ nghĩa của claim — chỉ liệt kê số liệu tìm thấy để đối chiếu
  thủ công với `source-log.md`.
- Regex trích số liệu có thể bỏ sót số liệu viết dạng chữ ("một nửa", "gấp đôi") — audit
  viên (Claude) cần tự đọc lại narration để bắt các trường hợp này ngoài script.
