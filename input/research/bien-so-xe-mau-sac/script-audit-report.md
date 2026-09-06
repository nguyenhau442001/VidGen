# Script Audit Report — Giải Mã Màu Biển Số Xe (bien_so_xe_mau_sac)

- Script/outline audited: `input/content/json/bien_so_xe_mau_sac.json`
- Source log dùng để fact-check: `input/research/bien-so-xe-mau-sac/source-log.md`
- Ngày audit: 2026-09-06

## Điểm tổng quan

| Nhóm | Điểm (/10) | Ghi chú |
|---|---|---|
| 1. Hook Strength | 6 | Hook là câu hỏi tò mò 19 từ — vượt giới hạn 6 từ, nhưng đúng ý owner (yêu cầu Hook dài kiểu "có bao giờ bạn tự hỏi", đã ghi trong TXT). Không phải tên công nghệ, tạo được open loop. |
| 2. Retention Arc Integrity | 8 | Đủ 5 giai đoạn. Reveal dài (Cảnh 3→8b) nhưng ngắt scene liên tục, mỗi màu là 1 micro-payoff. Có 2 aha-moment (AA=Quân đoàn 1, biển định danh theo người). Resolution (Cảnh 9) trả lời đúng câu hỏi Hook. |
| 3. Narration Density & Pacing | 7 | Không filler. Mỗi câu mang thông tin mới. Nhưng tổng ~103.8s ước lượng ở 4.2 từ/giây vs tổng `duration_frames` 3612f @30fps = 120.4s — TTS ~1.0x sẽ vừa, nhưng đây là do speed pipeline, không phải lỗi script. Cảnh 7 (56 từ / 400f = 13.3s) và 8b (58 từ / 360f = 13.8s) là 2 khối dài nhất — chấp nhận được vì có on-screen text đỡ. |
| 4. DNA Compliance | 8 | Wrong belief: "biển đỏ = cơ quan chính phủ" (Cảnh 2 dựng thẳng sự nhầm xanh/đỏ). True objective: hệ thống màu = phân loại chủ xe theo nhóm pháp lý. Aha: đỏ là quân đội + 2 chữ đầu lộ đơn vị. Bắt đầu từ hành vi quen (nhìn biển số mỗi ngày), không từ văn bản luật. |
| 5. Fact-Check / Fabrication Cross-Check | 4 | **FAIL** — Cảnh 8b chứa 2 claim (Mỹ vanity plate mọi bang; Bỉ hợp pháp 2014 ~1.000€) được trình bày như fact, có source label trên màn hình ("DMV các bang Mỹ; SPF/DIV Bỉ, luật 2014"), nhưng source-log.md KHÔNG có S-ID nào cho 2 nước này. Chỉ Victoria/Úc (S008) có nguồn. |
| **Tổng** | **33/50** | Trên ngưỡng 30 nhưng nhóm 5 fail → guardrail cứng, không khuyến nghị render tới khi sửa Cảnh 8b. |

## Vấn đề cụ thể

### Hook Strength
- Cảnh 1 (`shot_01_hook`) — Hook 19 từ, vượt xa giới hạn 6 từ trong DNA. Đây là đánh đổi
  có chủ đích (owner yêu cầu Hook dài, tò mò — xem CẬP NHẬT lần 2 trong TXT). Không cần
  sửa nếu owner giữ hướng này; nếu muốn điểm hook cao hơn, rút còn ~8 từ:
  "Vì sao biển số xe có nhiều màu đến vậy?"

### Retention Arc Integrity
- Không có vấn đề chặn. Cảnh 7 (400f) là khối dài nhất của Reveal — nếu render thấy "đơ",
  cân nhắc tách phần "ngoại lệ công dân VN" thành beat hình riêng trong scene.

### Narration Density & Pacing
- Cảnh 5 (`shot_05_red`), 44 từ / 315f = 10.5s: ổn ở TTS 1.0x, sẽ chật nếu tăng speed.
- Cảnh 7 & 8b: 2 khối > 13s. Giữ TTS ≤ 1.0x cho 2 cảnh này, hoặc thêm ~40-60f mỗi cảnh
  nếu render báo audio tràn.
- Không có filler đầu câu. Mệnh đề bắc cầu ("Khác hẳn là...", "Đổi hẳn logic là...",
  "Dễ nhầm với xanh nhất là...") mang thông tin so sánh, không phải filler rỗng — đạt.

### DNA Compliance
- Không có vấn đề. Pattern wrong-belief → true-objective → aha rõ ràng, có 2 aha-moment
  hợp lệ (không lặp nội dung).

### Fact-Check / Fabrication Cross-Check

Đối chiếu từng claim với source-log:

| Claim (cảnh) | Source ID | Kết luận |
|---|---|---|
| Trắng chữ đen = cá nhân / DN tư nhân (C3) | S002 (1) | ✅ khớp — `reliability: fact` |
| Nguồn "TT 79/2024/TT-BCA" (C3, C4, C7b) | S002 (6) | ✅ khớp |
| Xanh chữ trắng = cơ quan nhà nước / công an (C4) | S001, S002 (2) | ✅ khớp |
| Mẹo nhớ "đỏ là màu của quân đội" (C4, C5) | S002 (3) | ✅ khớp — đã thu hẹp đúng phạm vi (xem CẬP NHẬT lần 4 trong TXT: bản gốc "mọi văn bản pháp luật" đã bị sửa) |
| Đỏ chữ trắng = quân đội (C5) | S002 (3), S003 | ✅ khớp |
| "AA = Quân đoàn 1" (C5) | S003 — ghi rõ VD "AA = Quân đoàn 1", Phụ lục III | ✅ khớp — `reliability: fact` |
| Nguồn "TT 169/2021/TT-BQP, Phụ lục III" (C5, C5b) | S003 | ✅ khớp |
| KA = Quân khu 1 (C5b) | S003 — "K = Quân khu (VD: KA = Quân khu 1)" | ✅ khớp |
| QH = Quân chủng Hải quân (C5b) | S003 — "Q = Quân chủng (VD: QH = Quân chủng Hải quân)" | ✅ khớp |
| TM = Bộ Tổng tham mưu (C5b) | S003 — ghi VD "TM = Bộ Tổng tham mưu" nhưng xếp nhóm "T = Tổng cục" | ⚠️ khớp ở cặp cụ thể, nhưng S003 tự mâu thuẫn về nhóm (Tổng cục vs Bộ Tổng tham mưu). Cặp "TM = Bộ Tổng tham mưu" xuất hiện nguyên văn trong S003 → giữ được, nhưng nên xác minh lại 1 nguồn nữa nếu có thời gian. |
| Vàng chữ đen = kinh doanh vận tải, không chỉ taxi (C6) | S002 (4) | ✅ khớp |
| NG đỏ = ngoại giao, miễn trừ Công ước Viên 1961 (C7) | S004 | ✅ khớp |
| Miễn trừ theo thân phận ngoại giao, không phải mọi người trên xe (C7) | S004 — ghi rõ | ✅ khớp |
| "Công dân VN lái xe biển NG vẫn bị xử lý bình thường" (C7) | S004 — "NGOẠI LỆ quan trọng" | ✅ khớp — câu bắt buộc CÓ mặt trong cả narration lẫn on-screen text |
| Nguồn "Công ước Viên 1961, TT liên bộ 01/1988" (C7) | S004 | ✅ khớp |
| QT = tổ chức quốc tế / CV = nhân viên hành chính / NN = người nước ngoài (C7b) | S002 (5) | ✅ khớp cả 3 |
| "Từ 2023, biển số theo người không theo xe" (C7c) | S006 — 15/8/2023, TT 24/2023 | ✅ khớp — `reliability: fact` |
| "Bán xe → thu hồi, giữ 5 năm" (C7c) | S006 — ghi rõ 5 năm | ✅ khớp |
| Nguồn "TT 24/2023/TT-BCA" (C7c) | S006 | ✅ khớp |
| "2021, xe dịch vụ bắt buộc đổi sang biển vàng" (C8) | S005 — hạn 2021-12-31, phạt từ 2022-01-01 | ✅ khớp — `reliability: fact`, đúng chiều trắng→vàng (S005 note cảnh báo lỗi chiều ngược đã tránh được) |
| Nguồn "TT 58/2020/TT-BCA" (C8) | S005 | ✅ khớp |
| Victoria (Úc): tự chọn cả màu sắc (C8b) | S008 — "chọn thiết kế, màu sắc, kích thước..." | ✅ khớp — `reliability: fact` |
| **"Mỹ: mọi bang cho tự đặt chữ (vanity plate)" (C8b)** | **KHÔNG có** | ❌ **KHÔNG có nguồn trong source-log**. TXT nói "nguồn mới, DMV các bang" nhưng source-log.md chưa bao giờ được cập nhật thêm S009/S010. |
| **"Bỉ: hợp pháp hóa từ 2014, ~1.000€/biển" (C8b)** | **KHÔNG có** | ❌ **KHÔNG có nguồn trong source-log**. Cả mốc 2014 lẫn giá ~1.000€ đều không truy được về S-ID nào. |
| Source label trên màn hình C8b: "DMV các bang Mỹ; SPF/DIV Bỉ, luật 2014" | — | ❌ Trích dẫn nguồn không tồn tại trong research → vi phạm guardrail cứng của skill (claim trình bày như đã kiểm chứng, có citation giả). |

**Ghi chú:** Nội dung Mỹ/Bỉ nhiều khả năng ĐÚNG về mặt sự thật (vanity plate phổ biến ở
toàn bộ 50 bang Mỹ; Bỉ hợp pháp hóa biển cá nhân hóa khoảng 2014, giá ~1.000€). Nhưng
skill này chấm theo quy tắc "mọi claim fact phải trỏ được về source-log", không theo
kiến thức nền — nên vẫn tính FAIL cho tới khi có S-ID.

## Khuyến nghị cuối cùng

- [ ] ~~Sẵn sàng render~~
- [x] **Cần sửa trước khi render** — chọn 1 trong 2 hướng cho Cảnh 8b:
  1. **Bổ sung nguồn:** thêm S009 (DMV / NCSL cho vanity plate Mỹ) và S010 (báo Bỉ /
     SPF Mobilité cho luật 2014 + giá) vào `source-log.md`, rồi giữ nguyên Cảnh 8b.
  2. **Thu hẹp claim:** bỏ Mỹ + Bỉ, chỉ giữ Victoria/Úc (đã có S008), sửa lại
     `codeGridRows`, `on_screen_text`, `sourceLabel`, và narration Cảnh 8b cho khớp.
     Video ngắn lại ~6-8s — nếu cần bù thời lượng, kéo nhẹ các cảnh khác hoặc thêm 1
     ví dụ ký hiệu quân sự nữa từ S003 (còn HA = Học viện Quốc phòng, PA = Cục Đối ngoại
     chưa dùng).
- [ ] Không có claim bịa hoàn toàn (mọi thứ còn lại truy được về nguồn `fact`); vấn đề
      duy nhất là 2 claim thiếu nguồn ở Cảnh 8b.

### Nếu owner muốn nghe thử giọng Adam ngay

Các cảnh 1–8 + 9 (bỏ 8b) đã sạch fact-check. Có thể render thử bản không có Cảnh 8b để
nghe chất giọng Adam trước, xử lý Cảnh 8b sau.
