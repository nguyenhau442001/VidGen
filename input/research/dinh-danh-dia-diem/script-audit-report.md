# Script Audit Report — Nhà bạn sắp có "CCCD" riêng (dinh_danh_dia_diem)

- Script/outline audited: input/content/json/dinh_danh_dia_diem.json (15 shots)
- Source log dùng để fact-check: Không có source-log.md riêng. Fact-check thực hiện
  trực tiếp bằng web verification trong phiên audit (URL liệt kê ở nhóm 5).
- Ngày audit: 2026-08-27

## Điểm tổng quan

| Nhóm | Điểm (/10) | Ghi chú |
|---|---|---|
| 1. Hook Strength | 5 | Hook 13 từ, quá dài so với chuẩn ≤6; "Sự thật là" là filler. Owner đã quyết giữ nguyên wording — ghi nhận, không tính là blocker. |
| 2. Retention Arc Integrity | 8 | Đủ 5 giai đoạn. Reveal hơi dài (Cảnh 6→14, 9 cảnh) nhưng mỗi cảnh có micro-payoff. Open loop hook đóng đúng ở CTA. |
| 3. Narration Density & Pacing | 7 | Không filler ngoài hook. Tổng ước lượng 84s @ 4.2 từ/s nhưng TTS thật đọc nhanh hơn → MP4 77.7s, nằm trong 70-90. Cảnh 9 (6 từ, 1.4s) quá ngắn, dễ hụt; cân nhắc +10 frame đệm. |
| 4. DNA Compliance | 9 | Wrong belief (thêm mã hành chính) → true objective (khóa liên kết dữ liệu liên ngành) → aha (Cảnh 10) rõ ràng. CTA tease open loop mới ("tiếp theo tới lượt cái gì"). |
| 5. Fact-Check / Fabrication Cross-Check | 7 | 1 claim over-certain cần sửa (Cảnh 8 "tách thửa"). Phần còn lại khớp nguồn. |
| **Tổng** | **36/50** | Đủ ngưỡng render SAU KHI sửa Cảnh 8. |

## Vấn đề cụ thể

### Hook Strength
- Cảnh 1 — "Sự thật là, nhà bạn sắp có một mã số không đâu trùng." 13 từ (chuẩn ≤6);
  "Sự thật là" không thêm thông tin; "mã số không trùng" chưa tạo gap tò mò mạnh.
  Owner đã chọn giữ nguyên (2026-08-27). Không sửa. Nếu sau này muốn nâng: rút còn
  ≤8 từ, mở loop "để làm gì" (vd "Từ 1/9, nhà bạn có số định danh riêng — như người.").

### Retention Arc Integrity
- Không có vấn đề chặn. Lưu ý: khối Reveal dài (Cảnh 6–14). Giữ được nhờ mỗi cảnh
  một câu hỏi mới. Không cần cắt.

### Narration Density & Pacing
- Cảnh 9 "Mã này không thay sổ đỏ." — 6 từ / ~1.4s. Rất ngắn, TTS thật 1.22s. Rủi ro
  người xem chưa kịp đọc headline "KHÔNG THAY SỔ ĐỎ". Khuyến nghị: giữ narration
  (đúng nhịp punch), nhưng tăng duration_frames của shot_09 từ 96 lên ~110–120 để
  headline nằm trên màn hình đủ lâu. Đây là chỉnh timing, không đụng narration.

### DNA Compliance
- Không có vấn đề.

### Fact-Check / Fabrication Cross-Check

Nguồn đối chiếu (verify trong phiên):
- S1 baochinhphu.vn/moi-dia-diem-se-co-ma-dinh-danh-12-chu-so-hien-thi-tren-vneid-102260819150359235.htm
- S2 luatvietnam.vn/tin-van-ban-moi/tu-01-9-2026-moi-dia-diem-co-mot-ma-dinh-danh-gom-12-chu-so-186-111665-article.html
- S3 luatvietnam.vn/tin-van-ban-moi/71-doi-tuong-duoc-dinh-danh-dia-diem-tu-01-9-2026-186-111640-article.html
- S4 soha.vn/tu-1-9-hang-trieu-nguoi-vn-...-ho-guom-vinh-ha-long-deu-co-ma-rieng-198260820152608625.htm
- S5 thanhnien.vn/dinh-danh-dia-diem-khac-gi-ma-dinh-danh-bat-dong-san-185260823153020415.htm
- S6 vanban.chinhphu.vn/?docid=219221 (metadata Nghị định 326/2026/NĐ-CP, ký 19/8/2026, hiệu lực 1/9/2026)

| Claim (cảnh) | Nguồn | Kết luận |
|---|---|---|
| Nghị định 326, ban hành 19/8, hiệu lực 1/9/2026 (C4, C5) | S6, S1 | KHỚP |
| Mã 12 chữ số, duy nhất, không trùng (C5) | S1, S2, S6 (Điều 4) | KHỚP |
| "Không đổi theo thời gian" (C5) | S2 "tính ổn định lâu dài" | KHỚP (diễn đạt hợp lý) |
| Hiển thị trên VNeID; kế thừa dữ liệu có sẵn (C6) | S1 | KHỚP |
| 71 loại địa điểm, gồm cầu/đường/chùa/sông hồ (C7) | S3 | KHỚP |
| Mã gắn với địa điểm, không gắn với chủ (C8, câu 1) | S5 "attaches to the geographic point itself, not the owner" | KHỚP |
| "Bạn bán nhà, sang tên, **tách thửa** — mã vẫn là mã đó" (C8, câu 2) | S2 chỉ nói "ổn định lâu dài"; S5 "does not explicitly address transfers" | ⚠ OVER-CERTAIN — "sang tên/đổi chủ mã không đổi" suy ra được từ "gắn địa điểm không gắn chủ"; nhưng "tách thửa" thì KHÔNG có nguồn — tách 1 thửa thành 2 thửa mới về logic phải cấp mã mới. Cần gỡ "tách thửa". |
| Mã không thay sổ đỏ (C9) | S5 "không phải giấy tờ mới thay thế sổ đỏ, sổ hồng" (verbatim) | KHỚP |
| Là khóa liên kết dữ liệu giữa các hệ thống (C10) | S1, S2 "khả năng liên kết, tích hợp với các CSDL quốc gia/chuyên ngành" | KHỚP |
| Dữ liệu chỉ dùng đúng mục đích, không chia sẻ khi chưa đồng ý (C11) | prompt owner (luật bảo vệ dữ liệu cá nhân) + S1 nguyên tắc "đúng mục đích, phạm vi, thẩm quyền" | KHỚP |
| Công dân xem miễn phí trên VNeID; cơ quan nhà nước khai thác theo chức năng (C12) | S1 verbatim | KHỚP |
| Tổ chức khác ngoài 2 trường hợp phải trả phí khai thác (C13) | S1 "phải nộp phí khai thác" | KHỚP |
| Hồ Gươm, vịnh Hạ Long cũng có mã (C14, câu 1) | S4 (đặt tên đích danh 2 địa danh này); S5 scope gồm "mặt nước, sông suối" | KHỚP |
| Bộ Công an dựng và giữ kho dữ liệu (C14, câu 2) | S5 verbatim "cơ quan được Bộ Công an giao... xây dựng, quản lý Cơ sở dữ liệu định danh địa điểm" | KHỚP |

## Khuyến nghị cuối cùng

- [ ] Sẵn sàng render (không có fail nhóm 5)
- [x] Cần sửa trước khi render — 1 sửa narration (Cảnh 8, cần owner duyệt) + 1 sửa
      timing (shot_09 duration_frames, không cần duyệt)
- [ ] Dừng lại — claim bịa

### Đề xuất sửa Cảnh 8 (cần owner duyệt wording)

Hiện tại:
> "Mã này gắn với miếng đất, không gắn với chủ. Bạn bán nhà, sang tên, tách thửa — mã
> vẫn là mã đó, ổn định lâu dài."

Đề xuất (gỡ "tách thửa", giữ ý đã xác minh):
> "Mã này gắn với địa điểm, không gắn với chủ. Bạn bán nhà, sang tên cho người khác —
> mã vẫn là mã đó, ổn định lâu dài."

Lý do: "đổi chủ → mã không đổi" suy trực tiếp từ nguồn ("gắn địa điểm, không gắn chủ").
"Tách thửa" không có nguồn xác nhận và về mặt logic tách thửa tạo thửa đất mới.
