# Script Audit Checklist

Thang điểm mỗi nhóm: 1-10. Tổng 5 nhóm = /50, giữ nguyên format với GATE 1 của `vidgen`
(cũng chấm /30 trên 6 dimension riêng của nó — không trộn 2 thang điểm, ghi rõ đây là
thang điểm riêng của `vidgen-script-audit`, không phải điểm GATE 1).

## 1. Hook Strength (/10)
- [ ] ≤ 6 từ
- [ ] Mô tả hành vi lạ/kết quả bất ngờ, không phải tên công nghệ/thuật ngữ
- [ ] Là scene có thông tin/hình ảnh mạnh nhất trong toàn bộ script, không phải scene
      giải thích nhẹ nhàng
- [ ] Tạo được 1 câu hỏi mở (open loop) mà Resolution mới trả lời hết

Trừ điểm nặng nếu hook chỉ là tên sản phẩm/công cụ mà audience chưa có ngữ cảnh.

## 2. Retention Arc Integrity (/10)
- [ ] Đủ 5 giai đoạn: Hook (0-5s), Tension (5-20s), Reveal (20-55s), Resolution (55-65s), CTA (65-70s)
- [ ] Không giai đoạn nào bị bỏ trống
- [ ] Reveal không phải 1 khối narration liên tục quá dài không ngắt scene — nên có ít
      nhất 1 micro-payoff mỗi ~10 giây (theo TikTok Completion Rate note trong `vidgen`)
- [ ] Resolution thực sự trả lời câu hỏi mở ở Hook, không lặp lại Reveal

## 3. Narration Density & Pacing (/10)
- [ ] Không filler đầu câu ("ừm", "thì", "là", "nhé", "ạ")
- [ ] Không câu chỉ để dẫn dắt, mỗi câu mang ≥1 thông tin mới
- [ ] Tốc độ ước lượng khớp ~4.2 từ/giây khi đối chiếu với `durationInFrames` (nếu JSON
      đã có field này) — dùng `scripts/audit_script.py` để tính tự động
- [ ] Câu kết bằng từ quan trọng nhất, không phải từ đệm

## 4. DNA Compliance (/10)
- [ ] Có thể xác định rõ: wrong belief là gì, true objective là gì, aha moment ở đâu
- [ ] Script không bắt đầu từ công nghệ mà từ hành vi kỳ lạ người xem đã gặp (theo quy
      tắc "Quy tắc khi viết script từ DNA này" trong `vidgen`)
- [ ] Reveal trả lời đúng câu hỏi "hệ thống này thật sự đang tối ưu cái gì", không lạc đề
      sang thông tin thú vị nhưng không liên quan tới core tension

## 5. Fact-Check / Fabrication Cross-Check (/10) — chỉ chấm nếu có source-log.md
- [ ] Mọi số liệu cụ thể (%, con số, mốc thời gian) trong narration trỏ được về 1 Source
      ID có `reliability: fact`
- [ ] Claim gắn `expert_opinion` trong narration có kèm chủ thể phát biểu ("theo...")
- [ ] Không có claim nào lấy từ `hypothesis` trong source-log nhưng được narration trình
      bày như đã kiểm chứng
- [ ] Disclaimer đã định nghĩa trong `angle-matrix.json` (`disclaimers` field) xuất hiện
      đúng vị trí trong script (on-screen text hoặc narration)

Nếu không có source-log.md để đối chiếu: ghi rõ nhóm này là "N/A — không có nguồn để
audit", không tự cho điểm cao hay thấp.

## Ngưỡng khuyến nghị

- Tổng ≥ 40/50 (hoặc 32/40 nếu bỏ qua nhóm 5): sẵn sàng đưa cho `vidgen` render.
- Tổng 30-39: cần sửa các mục cụ thể đã liệt kê trước khi render.
- Dưới 30, hoặc bất kỳ mục nào trong nhóm 5 fail (claim bịa/nâng cấp mức tin cậy): dừng
  lại, không khuyến nghị render cho tới khi sửa — đây là guardrail cứng, không thương lượng.
