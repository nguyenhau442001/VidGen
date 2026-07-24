# Narration Craft — Checklist Viết Draft

Đây là bản rút gọn, thực hành-hóa các quy tắc "Speech Delivery Rules" đã có trong `vidgen`
SKILL.md. Không lặp lại toàn bộ lý thuyết — chỉ giữ checklist để tự kiểm khi viết draft.

## Checklist trước khi chốt 1 câu narration

- [ ] Không có filler đầu câu: "ừm", "thì", "là", "nhé", "ạ".
- [ ] Không có transition thừa: "Tiếp theo, chúng ta sẽ...", "Bây giờ hãy cùng...".
- [ ] Không lặp lại headline mà visual đã hiển thị.
- [ ] Không có câu kết luận đệm: "Vậy là chúng ta đã tìm hiểu xong...".
- [ ] Câu dài 6–10 từ, nối bằng dấu phẩy/em-dash, không dùng "và...thì...mà...".
- [ ] Câu kết bằng từ quan trọng nhất, không phải từ đệm.
- [ ] Mỗi câu mang ít nhất 1 thông tin mới (không có câu "chỉ để dẫn dắt").

## Ví dụ áp dụng cho angle nghiên cứu thật

Từ ví dụ `examples/ai-marketing-office-vietnam/`, pain gốc (research-brief, mục 10):
"nghĩ lại từ đầu, chỉnh lại từng dòng, canh từng chữ" mỗi khi brief AI.

**Draft kém** (còn đệm, mơ hồ):
> "Nhiều marketer hiện nay đang gặp một vấn đề khá phổ biến đó là họ phải mất khá nhiều
> thời gian để hướng dẫn lại AI mỗi khi bắt đầu một công việc mới."

**Draft tốt** (đúng nhịp — ngắn, cụ thể, kết bằng từ quan trọng):
> "Thứ hai viết mail xin lỗi khách. Thứ tư soạn báo cáo tuần. Mỗi lần — brief lại từ đầu."

## Xử lý số liệu/claim trong narration

Với mỗi claim lấy từ research-brief/angle-matrix, kiểm tra nhãn gốc trước khi viết:

| Nhãn gốc trong research | Cách viết trong narration |
|---|---|
| `fact` (có nguồn, đủ 4 thành phần) | Nêu thẳng, có thể kèm số liệu cụ thể |
| `expert_opinion` | Gắn với chủ thể phát biểu: "Theo [tổ chức/agency]..." không nói như sự thật khách quan |
| `community_observation` | Dùng làm mô tả cảm giác/tình huống (VoC), không dùng làm số liệu quy mô |
| `hypothesis` | Không đưa vào narration chính — chỉ dùng để định hình câu hỏi/tension, không phát biểu như đã xác thực |

Nếu 1 angle có `disclaimers` trong angle-matrix.json, disclaimer đó cần xuất hiện dưới dạng
1 câu narration ngắn hoặc ghi chú on-screen text — không âm thầm bỏ qua vì sợ làm chậm nhịp.

## Hook — quy tắc riêng

Hook (0–5s, ≤ 6 từ) phải mô tả **hành vi kỳ lạ người xem đã gặp**, không phải tên công nghệ
hay thuật ngữ. Kiểm tra nhanh: nếu hook của bạn nhắc tên 1 công cụ/thuật ngữ AI cụ thể mà
người xem chưa nghe qua tình huống, viết lại theo mô tả hành vi trước.

Bad: "Custom instructions và Claude Skills là gì?"
Good: "Ngày nào cũng gõ lại giọng thương hiệu — mệt chưa?"
