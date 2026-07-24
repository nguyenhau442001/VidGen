# Evidence Quality — Phân Loại Bằng Chứng

Mọi thông tin thu thập được phải được gán đúng 1 trong 4 loại sau. Không được trộn lẫn
khi trình bày trong `research-brief.md`.

## 1. Fact đã được kiểm chứng
- Có nguồn chính thức, có thể truy xuất lại (official docs, số liệu công bố chính
  thức, nghiên cứu có phương pháp rõ ràng).
- Điều kiện: nguồn thuộc nhóm 1–4 trong `source-hierarchy.md`.
- Cách viết: nêu thẳng, kèm nguồn. "Theo [nguồn], X = Y (ngày công bố: ...)."

## 2. Nhận định từ chuyên gia
- Ý kiến/diễn giải từ người có chuyên môn thật (interview, bài viết chuyên ngành, case
  study có tên tác giả xác định).
- Đây là **quan điểm**, không phải fact — dù đáng tin, vẫn phải gắn với người nói.
- Cách viết: "Theo [tên/chức danh], ..." — không trình bày như sự thật khách quan.

## 3. Quan sát từ cộng đồng
- Comment, thảo luận, anecdote từ social media, forum, group.
- Chỉ dùng để: phát hiện ngôn ngữ thật (VoC), phát hiện pain hypothesis, tìm objection,
  tìm câu hỏi phổ biến.
- **Không** dùng để kết luận quy mô hay tỷ lệ toàn ngành ("nhiều người gặp vấn đề này"
  dựa trên vài comment là sai — chỉ nói được "một số người dùng trong cộng đồng X có
  đề cập đến vấn đề này").

## 4. Giả thuyết cần kiểm chứng (hypothesis)
- Suy luận logic hợp lý nhưng chưa có nguồn trực tiếp xác nhận.
- Bắt buộc phải gắn nhãn rõ ràng: "Đây là giả thuyết, chưa xác thực" — cả trong
  research-brief lẫn trong angle-matrix (field `confidence: low`).
- Không được nâng cấp thành fact chỉ vì nghe hợp lý.

## Nguyên tắc số liệu

Mọi số liệu xuất hiện trong output phải có đủ 4 thành phần:
1. **Nguồn** — ai công bố.
2. **Ngày công bố** — số liệu cũ có thể đã lỗi thời, đặc biệt với ngành công nghệ/AI.
3. **Phạm vi** — đo trên tập nào (1 công ty? 1 quốc gia? toàn ngành?).
4. **Bối cảnh** — điều kiện đo, phương pháp, có gì giới hạn.

Không có đủ 4 thành phần → không được trình bày như số liệu, phải hạ xuống thành
hypothesis hoặc bỏ khỏi output.

## Contradictions (mâu thuẫn giữa các nguồn)

Khi hai nguồn đưa ra thông tin trái ngược, **không tự chọn một bên để trình bày như sự
thật duy nhất**. Ghi rõ trong `research-brief.md` mục "Contradictions": cả hai nguồn,
mức độ tin cậy tương đối, và (nếu có) giả thuyết vì sao có khác biệt (khác thời điểm đo,
khác phương pháp, khác thị trường).
