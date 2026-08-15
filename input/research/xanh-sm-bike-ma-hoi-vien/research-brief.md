# Research Brief — Xanh SM Bike: mã khuyến mãi hội viên không chọn được, tự trỏ về mã mặc định

## 1. Executive Summary
Một người dùng Xanh SM Bike có mã khuyến mãi hội viên (ví dụ 20.000đ) nhưng app không cho
chọn thủ công mã này khi đặt xe — hệ thống tự trỏ về một mã mặc định giá trị thấp hơn,
khiến mã 20k hết hạn mà chưa từng dùng được. Đây là câu hỏi nghiên cứu trung tâm: hiện
tượng này là chính sách "1 ưu đãi/chuyến, hệ thống tự chọn" (có thật, nhưng cơ chế chọn
mã nào chưa rõ) hay là lỗi ứng dụng? Sau khi tìm kiếm mở rộng, KHÔNG tìm được báo cáo độc
lập nào khác xác nhận đúng hiện tượng "hệ thống chọn mã giá trị THẤP hơn thay vì mã cao
hơn". Đây vẫn là một báo cáo cá nhân chưa xác thực quy mô. Audience đề xuất: người dùng
thường xuyên của app đặt xe có gói hội viên (subscription), đặc biệt nhóm tích lũy nhiều
mã cùng lúc. Core tension: người dùng tin mã khuyến mãi là "tài sản họ toàn quyền chọn
dùng", nhưng hệ thống ưu đãi dường như vận hành theo logic tự động không minh bạch — không
rõ tối ưu cho ai. Angle đề xuất: điều tra trung thực "hệ thống ưu đãi này đang tối ưu cho
cái gì" thay vì kết luận sẵn là lừa đảo — khớp DNA "Hidden Objective Function" của kênh.

## 2. Research Question
Khi người dùng Xanh SM Bike có nhiều mã khuyến mãi khả dụng cùng lúc (mã hội viên + mã
mặc định/khác), hệ thống chọn áp dụng mã nào, theo cơ chế gì, và người dùng có thực sự
mất quyền kiểm soát chọn mã cụ thể hay không — đây là giới hạn kỹ thuật cố ý (1 ưu đãi/
chuyến), lỗi UX (không hiển thị đủ tùy chọn), hay lỗi phần mềm thật sự?

## 3. Audience
- **Segment 1 — Người dùng hội viên (subscription) đặt xe thường xuyên**: đã mua gói hội
  viên (Xanh Hội Viên/Xanh Unlimited/Xanh Đi Làm...), tích lũy nhiều mã ưu đãi cùng lúc,
  quan tâm tới việc tối đa hoá giá trị mã đã trả tiền mua.
- **Segment 2 — Người dùng phổ thông thu thập mã từ nhiều nguồn**: có mã từ ngân hàng
  (MB, BIDV, Techcombank), từ VinID, từ chương trình giới thiệu — không hiểu rõ mã nào
  được ưu tiên khi đặt xe.

Chi tiết đầy đủ ở `audience-pain-map.json`.

## 4. Market Context
Xanh SM Bike là dịch vụ gọi xe máy điện thuộc hệ sinh thái Xanh SM/GreenSM (Vingroup),
vận hành mô hình gói hội viên (subscription) bán trước một tập mã ưu đãi có giá trị khác
nhau, dùng dần theo thời gian. Mô hình này phổ biến trong ngành gọi xe/giao đồ ăn Việt
Nam (Grab, Be, ShopeeFood đều có cơ chế voucher tương tự) — điểm chung: nhiều mã cùng
tồn tại, hệ thống thường giới hạn "1 ưu đãi/chuyến" để tránh combo/stack mã.

## 5. Main Pains
- Không thấy được (hoặc không chọn được) mã cụ thể muốn dùng khi đặt xe.
- Mã có giá trị cao (đã trả tiền mua qua gói hội viên) hết hạn mà chưa dùng được, trong
  khi mã giá trị thấp hơn (miễn phí/mặc định) lại được áp tự động.
- Không rõ logic hệ thống dùng để chọn mã nào — cảm giác mất kiểm soát với thứ mình đã bỏ
  tiền mua.

## 6. Jobs to Be Done
- Functional: dùng hết giá trị các mã đã mua trong gói hội viên trước khi hết hạn.
- Emotional: cảm giác an tâm rằng tiền mình bỏ ra mua gói hội viên không bị "mất trắng"
  một cách vô lý.
- Social: không muốn bị xem là "ngu ngơ" vì để mã hết hạn — muốn hiểu đúng cơ chế để
  tránh lặp lại, và có thể cảnh báo người khác.

## 7. Triggers
- Mở app thấy mã hội viên gần hết hạn (thường có countdown/nhắc nhở trong app).
- Vào phần "Ưu đãi" cố tình chọn mã cụ thể nhưng không tìm ra cách/nút chọn.
- Sau nhiều chuyến, nhận ra tổng giá trị mã hội viên đã mua không được dùng hết.

## 8. Objections (khi audience nghi ngờ giải thích của video)
- "Chắc do tôi thao tác sai, không phải lỗi hệ thống."
- "Đây chỉ là 1 người gặp, chưa chắc phổ biến."
- "Có khi nào đây là chính sách được ghi rõ trong điều khoản mà tôi chưa đọc?"

## 9. Current Alternatives
- Không có giải pháp chính thức được tìm thấy trong nghiên cứu này ngoài liên hệ hotline
  CSKH (1900 2097) hoặc email cskh@xanhsm.com — cả hai đều chưa được thử nghiệm/xác nhận
  trong phạm vi nghiên cứu.
- Người dùng có thể đang tự tìm cách "ép" hệ thống chọn mã mong muốn (ví dụ nhập mã thủ
  công ở ô "Ưu đãi" nếu có) — chưa xác thực được hiệu quả.

## 10. Customer Language
- "mã hội viên" / "mã 20k" / "để hết hạn"
- "trỏ về mặc định"
- "không thế nào chọn" (nguyên văn từ mô tả ban đầu của user)

## 11. Core Tension
Người dùng coi mã khuyến mãi hội viên là **tài sản cá nhân họ toàn quyền chọn thời điểm
và cách dùng** (vì đã trả tiền mua gói). Nhưng hệ thống ưu đãi vận hành theo một logic tự
động không hiển thị rõ cho người dùng thấy hoặc can thiệp — khiến quyền kiểm soát thực tế
nằm ở hệ thống, không phải ở người dùng. Câu hỏi mở (chưa có câu trả lời xác thực): logic
đó tối ưu cho cái gì — đơn giản hoá trải nghiệm (giảm số bước chọn), giảm số ưu đãi công
ty phải chi trả (ưu tiên mã rẻ hơn trước), hay đơn thuần là một lỗi phần mềm chưa được vá?

## 12. Key Findings
1. Xanh SM/GreenSM CÓ một cơ chế giới hạn "1 ưu đãi/chuyến" — điều này có vẻ là thật (xuất
   hiện lặp lại ở nhiều nguồn thứ cấp, dù chưa fetch được câu nguyên văn từ 1 nguồn chính
   thức duy nhất — xem Contradictions).
2. Trang FAQ chính thức của GreenSM CÓ hẳn 1 mục "Tôi không sử dụng được mã khuyến mãi/mã
   ưu đãi" (mục 4.4) — cho thấy công ty tự biết đây là vấn đề đủ phổ biến để làm FAQ riêng,
   nhưng nội dung chi tiết bên trong mục đó KHÔNG fetch được trong phạm vi nghiên cứu này.
3. KHÔNG tìm được bất kỳ báo cáo độc lập nào (Facebook, forum, app review, báo chí) xác
   nhận đúng hiện tượng cụ thể "hệ thống chọn mã giá trị THẤP hơn tự động, để mã giá trị
   CAO hơn hết hạn". Đây là gap quan trọng nhất.

## 13. Contradictions
Một tổng hợp tìm kiếm (S003) đưa ra claim "hệ thống tự động chọn ưu đãi có GIÁ TRỊ CAO
NHẤT nếu có nhiều mã khả dụng" — nếu đúng, điều này MÂU THUẪN trực tiếp với báo cáo gốc
của user (hệ thống lại chọn mã THẤP hơn, để mã 20k hết hạn). Tuy nhiên claim "chọn giá trị
cao nhất" bản thân nó KHÔNG được xác nhận bằng cách đọc trực tiếp 1 trang nguồn chính thức
(khi fetch trực tiếp 1 trong các trang bị nghi là nguồn, nội dung đó không xuất hiện — có
thể là suy diễn của công cụ tổng hợp tìm kiếm, không phải fact có thật). Vì vậy: KHÔNG có
cơ sở đủ mạnh để khẳng định "cao nhất" hay "thấp nhất" — cả hai đều chỉ là giả thuyết ở
mức độ tin cậy khác nhau (báo cáo gốc: 1 anecdote cá nhân; claim "cao nhất": search-engine
synthesis chưa xác minh được nguồn gốc).

## 14. Facts
- Xanh SM/GreenSM có trang FAQ chính thức với mục riêng cho lỗi mã khuyến mãi (mục 4.4)
  và mục riêng cho hạng thành viên/đổi điểm (mục 4.3), tách biệt nhau. [S002]
- Quy trình chuẩn để nhập mã: chọn điểm đón/đến → chọn dịch vụ → nhấn "Ưu đãi" trên nút
  "Đặt xe" → nhập mã. [S002]

## 15. Expert Opinions
Không tìm được ý kiến chuyên gia/kỹ sư nào (nội bộ Xanh SM hoặc bên ngoài) giải thích cơ
chế chọn mã ưu đãi trong phạm vi nghiên cứu này.

## 16. Community Observations
Không tìm được quan sát cộng đồng nào (ngoài báo cáo gốc của user) xác nhận hiện tượng
tương tự, dù đã tìm trên nhiều kênh (Facebook group, forum ô tô xe máy, tìm kiếm chung).
Một forum otofun.net có thread "[Funland] App Xanh SM lỗi" nhưng nội dung cụ thể chưa
được fetch/xác minh trong phạm vi nghiên cứu này — cần đọc trực tiếp nếu muốn dùng làm
bằng chứng (xem Evidence Gaps).

## 17. Hypotheses (CHƯA XÁC THỰC — confidence thấp)
- H1: Hệ thống giới hạn "1 ưu đãi/chuyến" và ưu tiên áp một mã cố định (có thể theo thứ
  tự tạo mã, ngày hết hạn gần nhất, hoặc loại mã) — không nhất thiết theo giá trị cao hay
  thấp. Đây là giả thuyết hợp lý nhất về mặt kỹ thuật (giống nhiều hệ thống voucher khác)
  nhưng chưa có nguồn xác nhận trực tiếp cơ chế sắp xếp thật.
- H2: Đây là lỗi UX — mã hội viên tồn tại nhưng không hiển thị trong danh sách "Ưu đãi"
  chọn được ở màn hình đặt xe (khác luồng với mã nhập tay), khiến người dùng tưởng không
  chọn được.
- H3: Đây là lỗi phần mềm thật sự (bug), không phải thiết kế cố ý.
Không đủ evidence để phân biệt H1/H2/H3 — đây chính là câu hỏi mở phù hợp làm nội dung
video dạng điều tra, KHÔNG phù hợp để kết luận chắc chắn một trong ba.

## 18. Evidence Gaps
- Chưa có screenshot/video thật từ người quen của user ghi lại đúng màn hình lỗi.
- Chưa đọc được nội dung đầy đủ bên trong FAQ mục 4.4 của GreenSM (chỉ thấy tiêu đề mục).
- Chưa tìm được báo cáo độc lập thứ hai xác nhận cùng hiện tượng.
- Chưa liên hệ được CSKH Xanh SM để hỏi trực tiếp cơ chế chọn mã (ngoài phạm vi nghiên
  cứu này — cần user hoặc phiên làm việc sau thực hiện nếu muốn nâng độ tin cậy).
- Chưa đọc được điều khoản/thể lệ đầy đủ của gói hội viên cụ thể mà người quen user đang
  dùng (không rõ tên gói).

## 19. Recommended Direction
Làm video dạng **điều tra trung thực, không kết luận sẵn** — đúng DNA "Hidden Objective
Function": mở đầu bằng tình huống thật (ẩn danh) của người quen user, đặt câu hỏi "hệ
thống ưu đãi này đang thực sự tối ưu cho cái gì", trình bày rõ những gì XÁC THỰC được
(cơ chế 1 ưu đãi/chuyến có tồn tại, FAQ công ty tự nhận có vấn đề mã lỗi) và những gì
CHƯA xác thực được (cơ chế chọn mã cụ thể, đây có phải bug hay không) — kết thúc mở, mời
người xem có cùng trải nghiệm phản hồi. Không tuyên bố đây là "lừa đảo" hay "bug" khi
chưa đủ bằng chứng.

## 20. Directions to Avoid
- Tránh khẳng định "Xanh SM cố tình lừa người dùng" — không có bằng chứng cho ý định cố
  ý, và đây là cáo buộc nghiêm trọng có thể sai sự thật/gây tranh chấp pháp lý.
- Tránh trình bày 1 báo cáo cá nhân như "nhiều người dùng đang bị" — vi phạm nguyên tắc
  không biến anecdote thành kết luận toàn ngành.
- Tránh bịa thêm số liệu "X% người dùng gặp lỗi này" — không có số liệu thật.

## 21. Source List
- S001 — dienmaycholon.com, bài blog mã giảm giá (hypothesis, độ tin cậy thấp)
- S002 — greensm.com/helps, FAQ chính thức (fact, nguồn mạnh nhất)
- S003 — tổng hợp search nhiều blog về cơ chế "1 ưu đãi/chuyến" (hypothesis, mâu thuẫn
  với báo cáo gốc)
- S004 — báo cáo cá nhân từ người quen của user (community_observation, nguồn gốc chủ đề)

Chi tiết đầy đủ ở `source-log.md`.
