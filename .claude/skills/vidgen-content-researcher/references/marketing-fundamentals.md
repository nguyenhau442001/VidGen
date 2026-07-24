# Marketing Fundamentals — Dịch Cho Kỹ Sư

Mỗi khái niệm gồm: định nghĩa, câu hỏi nó trả lời, ví dụ áp dụng cho video, sai lầm
thường gặp, và (nếu phù hợp) tương đương gần nhất trong tư duy kỹ thuật.

---

### Market
**Định nghĩa:** Tập hợp người có nhu cầu chung và khả năng chi trả (thời gian, tiền,
sự chú ý) cho một loại giải pháp.
**Câu hỏi trả lời:** Ai đang cần điều này, đủ lớn để đáng làm nội dung không?
**Ví dụ:** "Marketer tại các công ty SME Việt Nam dùng AI để viết content hằng ngày."
**Sai lầm:** Nhầm market với "mọi người dùng internet".
**Tương đương kỹ thuật:** Target user base của một hệ thống — không phải toàn bộ traffic.

### Audience Segment
**Định nghĩa:** Một nhóm con trong market, có hành vi/nhu cầu đủ giống nhau để nhắm
cùng một thông điệp.
**Câu hỏi trả lời:** Nhóm nào trong market sẽ phản ứng giống nhau với cùng một video?
**Ví dụ:** "Content marketer tự làm 1 mình" khác với "Content marketer trong team 5 người".
**Sai lầm:** Segment quá rộng khiến pain phân tích trở nên mơ hồ.
**Tương đương kỹ thuật:** Partition một dataset theo thuộc tính có ý nghĩa nghiệp vụ.

### ICP (Ideal Customer Profile)
**Định nghĩa:** Segment có giá trị cao nhất và phù hợp nhất với sản phẩm/nội dung.
**Câu hỏi trả lời:** Nếu chỉ chọn một nhóm để phục vụ tốt nhất, đó là ai?
**Ví dụ:** Với kênh dạy AI skill cho marketer, ICP có thể là "marketer 1-3 năm kinh
nghiệm, tự chạy content, chưa có ngân sách agency".
**Sai lầm:** Cố làm hài lòng tất cả segment cùng lúc, làm loãng thông điệp.

### Persona
**Định nghĩa:** Mô tả hành vi/công việc/áp lực của một audience segment, KHÔNG phải
nhân vật hư cấu có tên tuổi sở thích.
**Câu hỏi trả lời:** Người này ra quyết định như thế nào?
**Sai lầm phổ biến nhất trong content research:** biến persona thành nhân vật giải trí
thay vì công cụ phân tích hành vi. Xem `audience-pain-framework.md`.

### Jobs to Be Done (JTBD)
**Định nghĩa:** Framework mô tả "công việc" mà khách hàng đang thuê một sản phẩm/nội
dung để hoàn thành — gồm functional job (việc cụ thể), emotional job (cảm giác muốn
đạt được), social job (hình ảnh muốn thể hiện).
**Câu hỏi trả lời:** Người xem "thuê" video này để làm gì?
**Ví dụ:** Functional: "học cách viết prompt nhất quán". Emotional: "bớt lo lắng khi
sếp hỏi output AI". Social: "được đồng nghiệp coi là người giỏi công cụ mới".
**Sai lầm:** Chỉ liệt kê functional job, bỏ qua emotional/social — làm hook yếu đi.
**Tương đương kỹ thuật:** Use case + non-functional requirement của một feature.

### Pain Point
**Định nghĩa:** Vấn đề cụ thể, đo được (tần suất, mức độ nghiêm trọng, chi phí nếu
không giải quyết) mà audience đang gặp.
**Câu hỏi trả lời:** Điều gì đang thực sự làm họ khó chịu, và bao nhiêu?
**Sai lầm:** Viết pain bằng tính từ mơ hồ ("mệt mỏi", "khó khăn") thay vì tình huống
cụ thể có thể hình dung được.

### Trigger Event
**Định nghĩa:** Sự kiện cụ thể xảy ra ngay trước khi người dùng chủ động tìm giải pháp.
**Câu hỏi trả lời:** Điều gì đã xảy ra khiến họ dừng lại và bắt đầu tìm kiếm?
**Ví dụ:** Deadline gấp, brief mới từ sếp, campaign vừa thất bại, feedback tiêu cực,
output AI không nhất quán giữa các lần chạy.
**Tương đương kỹ thuật:** Sự kiện gây ra một exception/alert khiến hệ thống (người
dùng) chuyển sang trạng thái xử lý sự cố.

### Objection
**Định nghĩa:** Lý do khiến audience nghi ngờ hoặc từ chối thử giải pháp.
**Câu hỏi trả lời:** Điều gì khiến họ chưa tin?
**Ví dụ:** "Quá kỹ thuật", "tốn thời gian setup", "AI không hiểu thương hiệu của tôi".
**Sai lầm:** Bỏ qua objection khi viết angle → video bị coi là "quảng cáo", mất uy tín.

### Positioning
**Định nghĩa:** Cách một sản phẩm/kênh/thông điệp được đặt trong tâm trí audience so
với các lựa chọn khác.
**Câu hỏi trả lời:** Trong đầu người xem, video/kênh này khác gì những nội dung AI
khác họ đã xem?
**Ví dụ DevFaster:** "Kỹ sư giải thích cơ chế thật đứng sau sản phẩm quen thuộc" — khác
với kênh "hack AI prompt" hay kênh "AI news tổng hợp".
**Sai lầm:** Định vị kỹ sư giỏi marketing hơn marketer — sai định vị của kênh.

### Differentiation
**Định nghĩa:** Điểm khác biệt cụ thể, có thể chứng minh, so với nội dung/giải pháp
tương tự.
**Câu hỏi trả lời:** Vì sao xem video này thay vì video khác về cùng chủ đề?
**Ví dụ:** Giải thích bằng system thinking + demo thật, không chỉ liệt kê tính năng.

### Value Proposition
**Định nghĩa:** Lời hứa cụ thể về giá trị audience nhận được, gắn với pain đã xác định.
**Câu hỏi trả lời:** Xem xong video này, người xem đổi lấy được điều gì?
**Sai lầm:** Value proposition chung chung ("học AI hiệu quả hơn") thay vì cụ thể
("biết cách đóng gói 1 quy trình lặp lại thành Claude Skill trong 10 phút").

### Offer
**Định nghĩa:** Điều cụ thể được đề xuất ở cuối nội dung (không nhất thiết là bán hàng
— có thể là "xem phần 2", "thử template này").
**Câu hỏi trả lời:** Hành động tiếp theo cụ thể là gì?

### Messaging
**Định nghĩa:** Cách diễn đạt value proposition và positioning thành ngôn ngữ cụ thể
audience sẽ nghe/đọc.
**Câu hỏi trả lời:** Chính xác từ ngữ nào sẽ dùng để nói điều này?
**Sai lầm:** Dùng jargon marketing thay vì customer language thu thập được ở Phase 3.

### Awareness Stage
Xem bảng chi tiết ở `audience-pain-framework.md`.

### Funnel
**Định nghĩa:** Chuỗi giai đoạn người xem đi qua từ lần đầu biết đến kênh cho tới hành
động cuối (follow, xem hết series, áp dụng vào công việc).
**Câu hỏi trả lời:** Video này phục vụ giai đoạn nào của funnel?
**Tương đương kỹ thuật:** Pipeline nhiều bước, mỗi bước có drop-off rate riêng.

### Conversion
**Định nghĩa:** Tỷ lệ người xem thực hiện hành động mong muốn (follow, xem phần tiếp,
áp dụng workflow).
**Câu hỏi trả lời:** Bao nhiêu % người xem hook đã đi hết video / hành động tiếp theo?

### Retention
**Định nghĩa:** Khả năng giữ chân người xem trong suốt video (watch time) và giữ họ
quay lại các video sau (follow, xem series tiếp).
**Câu hỏi trả lời:** Video có giữ được người xem tới cuối không, và họ có quay lại không?
**Tương đương kỹ thuật:** Session duration + return rate của một sản phẩm.

### Customer Lifecycle
**Định nghĩa:** Hành trình audience từ chưa biết kênh đến trở thành người xem trung
thành / áp dụng kiến thức vào công việc thật.
**Câu hỏi trả lời:** Video này nằm ở giai đoạn nào trong hành trình đó?

### Voice of Customer (VoC)
**Định nghĩa:** Ngôn ngữ, cách diễn đạt, câu hỏi thật mà audience dùng — thu thập trực
tiếp từ nguồn thật, không tự bịa.
**Câu hỏi trả lời:** Họ thực sự nói về vấn đề này bằng từ ngữ gì?
**Sai lầm:** Paraphrase quá sớm thành ngôn ngữ marketing, mất đi tính chân thực.

### Content Pillar
**Định nghĩa:** Một chủ đề lớn, lặp lại được thành nhiều video/series.
**Ví dụ DevFaster:** "Hidden Objective Function của hệ thống quen thuộc" là 1 content
pillar; "Grab Dispatch" và "Google Maps Routing" là 2 series trong pillar đó.

### Content Angle
**Định nghĩa:** Một góc nhìn cụ thể để triển khai content pillar thành 1 video.
Xem chi tiết cấu trúc và cách chấm điểm ở `viral-angle-framework.md`.

### Hook
**Định nghĩa:** 3–6 giây đầu video, quyết định người xem có ở lại hay không.
**Câu hỏi trả lời:** Điều gì khiến người xem dừng ngón tay lại?
**Sai lầm:** Hook là tên công nghệ/thuật ngữ thay vì mô tả hành vi lạ/kết quả bất ngờ.

### CTA (Call To Action)
**Định nghĩa:** Hành động cụ thể được đề xuất cuối video.
**Sai lầm:** CTA chung chung ("theo dõi để biết thêm") thay vì tạo open loop cụ thể
cho phần tiếp theo.

### Social Proof
**Định nghĩa:** Bằng chứng từ người khác (số liệu, case study, phản hồi thật) làm tăng
độ tin cậy.
**Sai lầm nghiêm trọng:** Bịa social proof — vi phạm trực tiếp guardrail của skill này.

### A/B Testing
**Định nghĩa:** So sánh 2 phiên bản (hook, thumbnail, caption…) để biết cái nào hiệu
quả hơn dựa trên dữ liệu thật.
**Tương đương kỹ thuật:** Thực nghiệm có nhóm đối chứng.

### Leading Indicator
**Định nghĩa:** Chỉ số dự báo sớm kết quả (retention 3 giây đầu, completion rate).
**Tương đương kỹ thuật:** Metric giám sát sớm (latency, error rate) dự báo sự cố trước
khi outcome cuối (churn, doanh thu) thể hiện rõ.

### Lagging Indicator
**Định nghĩa:** Chỉ số phản ánh kết quả sau cùng (follow growth, doanh thu, tổng views
sau 30 ngày).
**Tương đương kỹ thuật:** Metric kết quả cuối (uptime SLA đạt được theo quý).
