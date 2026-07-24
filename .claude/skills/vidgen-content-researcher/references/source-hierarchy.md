# Source Hierarchy

Thứ tự ưu tiên nguồn khi thu thập evidence (Phase 3). Số càng nhỏ càng ưu tiên.

1. **Official documentation** — tài liệu chính thức từ chính công ty/tổ chức sở hữu
   hệ thống đang nói tới (Anthropic docs, Grab engineering blog, Google, v.v.).
2. **Research paper / industry report có phương pháp rõ** — có mô tả cách thu thập dữ
   liệu, cỡ mẫu, giới hạn nghiên cứu.
3. **Dữ liệu chính thức từ platform hoặc company** — số liệu công bố công khai (báo cáo
   quý, blog kỹ thuật, press release có số liệu cụ thể).
4. **Tài liệu chuyên ngành từ tổ chức uy tín** — hiệp hội ngành, cơ quan thống kê, báo
   chí công nghệ có uy tín và trích dẫn nguồn gốc rõ ràng.
5. **Case study có số liệu và bối cảnh** — case study nêu rõ công ty/dự án, số liệu
   trước/sau, điều kiện áp dụng.
6. **Interview với practitioner** — người thực sự làm công việc đó, có thể xác minh
   danh tính/vai trò.
7. **Community discussion** — forum, group, subreddit, thảo luận công khai có nhiều
   người tham gia.
8. **Social comment hoặc anecdote** — 1 bình luận, 1 câu chuyện cá nhân riêng lẻ.

## Quy tắc dùng nguồn nhóm 7–8

Chỉ dùng để:
- Phát hiện ngôn ngữ thật (Voice of Customer).
- Phát hiện giả thuyết về pain (cần nguồn mạnh hơn để xác nhận sau).
- Tìm objection phổ biến.
- Tìm câu hỏi hay được hỏi lặp lại.

Không dùng nhóm 7–8 làm nguồn duy nhất cho một claim quan trọng trong video (số liệu,
cơ chế kỹ thuật, tuyên bố về hành vi hệ thống).

## Format log 1 nguồn (dùng cho `source-log.md`, template ở `templates/source-log.template.md`)

```
ID: S001
Title: <tên bài viết/tài liệu>
Organization/Author: <tên>
URL: <link>
Publish date: <ngày công bố, hoặc "không rõ">
Access date: <ngày truy cập, nếu có>
Source type: <1-8 theo bảng trên>
Reliability: <fact | expert_opinion | community_observation | hypothesis>
Claims supported: <claim cụ thể nguồn này hỗ trợ>
Limitations: <giới hạn — mẫu nhỏ, đã cũ, chỉ áp dụng 1 thị trường, v.v.>
Notes: <ghi chú thêm nếu cần>
```

Mỗi claim quan trọng trong `research-brief.md` nên trỏ tới ít nhất 1 Source ID. Angle
trong `angle-matrix.json` cũng nên trỏ evidence về Source ID tương ứng để
`validate_research_output.py` kiểm tra chéo được.
