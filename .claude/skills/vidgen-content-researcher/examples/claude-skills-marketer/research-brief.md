# Research Brief — Claude Skills cho Marketer

## 1. Executive Summary
Marketer lặp lại việc "dạy lại" AI cùng một context/brand voice ở gần như mỗi lần dùng,
vì prompt và custom instructions không đóng gói được toàn bộ quy trình nhiều bước.
Audience chính là marketer 1–3 năm kinh nghiệm, tự chạy content một mình. Core tension:
AI được kỳ vọng tiết kiệm thời gian nhưng lại tốn thời gian để "onboard" mỗi lần dùng.
Angle đề xuất: kỹ sư không thay marketer làm chiến lược, mà giúp biến phương pháp làm
việc đã có của marketer thành một hệ thống (skill) tái sử dụng được.

## 2. Research Question
Marketer đang lặp lại những công việc hướng dẫn AI nào, và phần nào có thể được đóng
gói thành Claude Skills mà không thay thế phán đoán chuyên môn của marketer?

## 3. Audience
Xem chi tiết `audience-pain-map.json`. Tóm tắt: (1) Marketer độc lập/SME tự chạy content,
(2) Marketer trong team nhỏ dùng AI để tăng tốc sản xuất, chưa có quy trình chuẩn hoá.

## 4. Market Context
Việc dùng chatbot AI (ChatGPT, Claude, Gemini) cho công việc viết content, brainstorm,
và research đã trở thành thực hành phổ biến trong marketing kể từ 2023–2024— điều này
được phản ánh rộng rãi trên các nền tảng khảo sát ngành marketing và trong tài liệu sản
phẩm của chính các nhà cung cấp AI (S001, S002). Mức độ phổ biến chính xác theo ngành
tại Việt Nam chưa có số liệu chính thức công khai mà nhóm nghiên cứu tiếp cận được —
đây là **evidence gap**, không phải fact.

## 5. Main Pains
- Phải nhập lại brand voice, tone, và ví dụ mẫu ở gần như mỗi phiên làm việc mới (S002).
- Output AI không nhất quán giữa các lần chạy dù dùng chung một prompt gốc (S003, hypothesis
  củng cố bởi quan sát cộng đồng — chưa có số liệu định lượng).
- Kiến thức về quy trình "cách brief đúng cho AI" nằm trong đầu 1 người, không chuyển giao
  được cho đồng nghiệp khi vắng mặt.

## 6. Jobs to Be Done
- Functional: có một cách brief AI nhất quán, không phải viết lại từ đầu mỗi lần.
- Emotional: bớt lo lắng khi không chắc output AI có đúng chuẩn thương hiệu không.
- Social: được xem là người dùng AI hiệu quả, không phải người "prompt cả ngày mà vẫn sai".

## 7. Triggers
- Sếp/khách hàng phản hồi output AI "không đúng giọng thương hiệu".
- Cần scale số lượng content nhưng không có thêm người.
- Một đồng nghiệp rời đi và mang theo "cách brief AI đúng" chỉ có trong đầu họ.

## 8. Objections
- "Nghe có vẻ kỹ thuật quá, tôi không biết code."
- "Setup một lần rồi có ai maintain không?"
- "Liệu skill có hiểu đúng thương hiệu của tôi hay chỉ là prompt phức tạp hơn?"
- Lo ngại về việc đưa dữ liệu khách hàng/thương hiệu vào một hệ thống mới.

## 9. Current Alternatives
- Copy-paste một "prompt gốc" đã lưu sẵn trong note.
- Custom instructions ở cấp tài khoản (áp dụng chung, không tách theo từng loại task).
- Project/knowledge base đính kèm tài liệu thương hiệu.
- Thuê freelancer để duy trì tính nhất quán — tốn chi phí, vẫn cần hướng dẫn lại.

## 10. Customer Language
"AI không nhớ được style của tôi", "mỗi lần dùng lại phải nhắc lại từ đầu", "prompt
càng ngày càng dài mà vẫn không chuẩn", "tôi cần một cái gì đó nhớ được quy trình của tôi".
(Thu thập dưới dạng giả thuyết ngôn ngữ điển hình dựa trên pattern phổ biến trong thảo luận
công khai về prompt engineering — chưa trích dẫn nguyên văn một bình luận cụ thể nào, xem
Evidence Gaps.)

## 11. Core Tension
AI được mua/dùng để tiết kiệm thời gian, nhưng marketer lại mất thời gian "dạy lại" AI
gần như mỗi lần sử dụng — vì kiến thức quy trình chưa từng được đóng gói lại thành một
hệ thống có thể tái sử dụng.

## 12. Key Findings
1. Vấn đề không phải "AI viết dở" mà là "kiến thức quy trình chưa được hệ thống hóa".
2. Khoảng cách giữa "biết cách làm" (marketer) và "biết cách đóng gói thành hệ thống"
   (kỹ sư) là chỗ trống thị trường rõ ràng, phù hợp với DevFaster DNA.
3. Đối tượng phù hợp nhất không phải marketer cấp cao (đã có team support) mà là
   marketer làm việc một mình hoặc trong team rất nhỏ.

## 13. Contradictions
Không phát hiện mâu thuẫn trực tiếp giữa các nguồn ở giai đoạn nghiên cứu này — phần lớn
nguồn là tài liệu sản phẩm chính thức (đồng thuận về khả năng của custom instructions/
skills) hơn là các báo cáo có thể mâu thuẫn nhau về số liệu.

## 14. Facts
- Custom instructions và cơ chế "skills/knowledge" cho phép lưu ngữ cảnh tái sử dụng
  qua nhiều phiên làm việc là tính năng có thật, được mô tả trong tài liệu sản phẩm
  chính thức của nhà cung cấp AI (S001).

## 15. Expert Opinions
- Chưa thu thập được phát biểu có gắn tên/chức danh cụ thể trong phạm vi nghiên cứu này
  — cần bổ sung interview thật trước khi trích dẫn dạng "chuyên gia nói".

## 16. Community Observations
- Các thảo luận công khai về prompt engineering thường xuyên đề cập vấn đề "phải lặp lại
  context" như một điểm gây khó chịu phổ biến (S003) — đây là quan sát cộng đồng, không
  phải số liệu định lượng về tỷ lệ marketer gặp vấn đề này.

## 17. Hypotheses
- Giả thuyết: phần lớn marketer chưa phân biệt được sự khác nhau giữa "một prompt hay"
  và "một quy trình được hệ thống hóa" — confidence: low, cần khảo sát/interview để xác
  thực.
- Giả thuyết: pain này nghiêm trọng hơn ở marketer làm việc độc lập so với marketer có
  agency hỗ trợ — confidence: low.

## 18. Evidence Gaps
- Chưa có số liệu định lượng về tỷ lệ marketer Việt Nam gặp vấn đề "lặp lại context".
- Chưa có interview trực tiếp với marketer thật để xác nhận customer language.
- Chưa có case study before/after cụ thể về việc đóng gói workflow thành skill.

## 19. Recommended Direction
Angle "Mỗi ngày marketer lại onboarding một AI intern mới" — xem `angle-matrix.json`.
Định vị kỹ sư là người giúp hệ thống hóa quy trình đã có, không phải người hiểu marketing
hơn marketer.

## 20. Directions to Avoid
- Không làm angle kiểu "AI sẽ thay thế marketer" — không có evidence, đi ngược guardrail
  và định vị kênh.
- Không làm angle tập trung vào marketer cấp cao/agency lớn — pain ở nhóm này khác và
  chưa có evidence trong nghiên cứu này.

## 21. Source List
- S001 — Tài liệu sản phẩm chính thức về custom instructions / skills (fact)
- S002 — Ghi nhận chung về thực hành lặp lại brand context khi dùng AI (fact/expert mô tả sản phẩm)
- S003 — Pattern quan sát từ thảo luận cộng đồng về prompt engineering (community observation)
