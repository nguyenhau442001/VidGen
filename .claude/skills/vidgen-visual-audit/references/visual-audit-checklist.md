# Visual Audit Checklist

Giữ đúng 4 nhóm với GATE 2 của `vidgen` để không tạo ra 1 hệ tiêu chí song song gây nhầm
lẫn — chỉ audit sâu hơn (nhiều frame hơn, có report, có số liệu pixel hỗ trợ).

## 1. Text Legibility
- [ ] Mọi headline đọc được ngay ở lần xem đầu (không cần dừng hình)
- [ ] Không tràn/cắt chữ ra ngoài khung hình hoặc container
- [ ] Font weight đủ dày trên nền tối — nếu `mean_brightness` nền < 40/255 mà chữ không
      có outline/shadow, khả năng khó đọc cao, cần xem frame thật để xác nhận
- **Self-correct khuyến nghị**: rút ngắn headline trong JSON, hoặc tăng font-weight/thêm
  outline nếu component hỗ trợ.

## 2. Contrast & Color
- [ ] Accent color (theo `vidgen`: `#00ff41` xanh lá hoặc `#61dafb` cyan) nổi bật, không
      bị màu khác cạnh tranh trong cùng scene
- [ ] Background đủ tối để chữ trắng nổi bật (tham khảo `mean_brightness` nền — dưới ~50/255
      là tối, phù hợp chuẩn dark theme của kênh)
- [ ] `contrast_stddev` (độ lệch chuẩn độ sáng pixel) quá thấp (< 20) có thể là dấu hiệu
      scene bị "phẳng", thiếu điểm nhấn thị giác — cần xem frame thật để xác nhận có phải
      vấn đề thật hay chỉ là scene tối giản có chủ đích
- **Self-correct khuyến nghị**: đổi `accentWord` hoặc `type` scene để giảm nhiễu thị giác.

## 3. Information Density
- [ ] Không scene nào hiển thị > 4 bullet cùng lúc
- [ ] Scene code: dòng highlight rõ ràng phân biệt với dòng không highlight
- [ ] Scene map/split: label không đè lên nhau
- **Self-correct khuyến nghị**: tách scene dày thành 2 scene nhỏ hơn.

## 4. Scene Pacing (visual feel)
- [ ] Không scene nào "đơ" (narration đã hết mà hình vẫn đứng yên quá lâu)
- [ ] Không scene nào cắt quá nhanh không kịp đọc — đối chiếu với khuyến nghị TikTok
      Completion Rate của `vidgen`: cần ít nhất 1 micro-payoff mỗi ~10 giây
- **Self-correct khuyến nghị**: điều chỉnh `durationInFrames` ±15-30 frame, chạy lại TTS
  nếu timing thay đổi.

## Cách đọc số liệu pixel từ `audit_visual.py`

| Chỉ số | Ý nghĩa | Ngưỡng tham khảo |
|---|---|---|
| `mean_brightness` | Độ sáng trung bình khung hình (0-255) | Kênh dùng dark theme → kỳ vọng 20-60 cho phần lớn nền; > 120 có thể là scene quá sáng, lệch tông |
| `contrast_stddev` | Độ lệch chuẩn độ sáng — đo mức "đa dạng" thị giác | < 20: scene có thể quá phẳng; > 90: có thể quá nhiễu/rối mắt |
| `dominant_color` | Màu chiếm ưu thế trong frame (RGB xấp xỉ) | Đối chiếu bằng mắt xem có đúng palette kênh không (dark bg + accent xanh/cyan) |

**Quan trọng**: những con số này chỉ là gợi ý để biết frame nào cần xem kỹ hơn — quyết
định cuối cùng về "đẹp/dễ đọc" luôn phải dựa trên việc Claude thực sự xem frame bằng
công cụ `view`, không chỉ dựa vào bảng số.

## Ngưỡng khuyến nghị tổng thể

- 0 vấn đề nghiêm trọng ở cả 4 nhóm: sẵn sàng publish.
- 1-2 vấn đề nhỏ (ví dụ 1 scene hơi dày info): khuyến nghị sửa nhưng không chặn publish.
- Bất kỳ vấn đề Legibility nào (chữ không đọc được): chặn publish cho tới khi sửa — đây
  là guardrail cứng vì ảnh hưởng trực tiếp tới việc truyền tải nội dung.
