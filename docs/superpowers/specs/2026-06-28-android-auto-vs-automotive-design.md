# Script Design: Android Auto vs Android Automotive

**Date:** 2026-06-28
**Channel:** IT Education (Vietnamese audience)
**Format:** TikTok / YouTube Shorts
**Target duration:** 65–72 seconds
**Language:** Vietnamese (`vi`)

---

## Goal

Help viewers immediately understand the core difference between Android Auto and Android Automotive in under 90 seconds — leaving them with the "Aha!" moment: one runs on the phone, the other runs inside the car.

## Audience

Vietnamese IT audience: students, software engineers, tech enthusiasts. Most have heard the names but don't clearly know the difference.

## Hook Strategy

**Formula chosen:** In medias res + cliffhanger

Opens mid-scenario (Google Maps running on car screen, phone dies, screen goes blank) and ends Scene 1 with an unresolved "Tại sao?" — forces the viewer to stay for the answer.

Deliberately avoids the default "[A] and [B] sound similar but are completely different" pattern.

## Scene Breakdown

| # | Type | Section | Narration |
|---|------|---------|-----------|
| 1 | `explanation` | Hook | "Google Maps đang chạy trên màn hình xe. Điện thoại hết pin. Màn hình tắt ngay. Tại sao?" |
| 2 | `explanation` | Question | "Màn hình xe chỉ là một cái tivi được kết nối — hay Android đang thực sự chạy bên trong đó?" |
| 3 | `explanation` | Android Auto | "Android Auto – Android vẫn đang chạy trên điện thoại của bạn. Điện thoại làm mọi thứ. Xe chỉ hiển thị." |
| 4 | `terminal` | Auto flow | "Điện thoại kết nối với xe. Màn hình xe chỉ là một màn hình phụ. Ngắt kết nối điện thoại – Android Auto dừng ngay lập tức." |
| 5 | `explanation` | Android Automotive | "Nhưng Android Automotive OS thì khác. Android được cài trực tiếp vào xe – không cần điện thoại tồn tại." |
| 6 | `terminal` | Automotive flow | "Ứng dụng chạy ngay trên phần cứng của xe. Navigation, âm nhạc – tất cả hoạt động mà không cần cắm điện thoại." |
| 7 | `terminal` | Aha moment | "Thử rút điện thoại ra. Android Auto – Google Maps biến mất ngay. Android Automotive – Google Maps vẫn chạy. Vì lần này, Android đang sống bên trong chiếc xe." |
| 8 | `explanation` | Why it matters | "Và đây là lý do developer cần phân biệt: build app cho Android Auto và Android Automotive là hai pipeline hoàn toàn khác nhau." |
| 9 | `explanation` | CTA | "Đây chỉ là bắt đầu. Trong các video tiếp theo, mình sẽ đi sâu vào cách Android giao tiếp với xe – từ Car Service, Vehicle HAL đến CAN Bus. Theo dõi nhé!" |

## Retention Decisions

- **Scene 1 rewritten** from generic misconception formula to in medias res scenario
- **Scene 2 rewritten** from near-copy of prompt example to original display-vs-OS framing
- **Original scenes 7+8 merged** — standalone setup line is dead air without immediate payoff
- **"Trường hợp đầu tiên/thứ hai" removed** from Scenes 3 & 5 — signals a lecture, replaced with contrast phrases
- **Scene 9 (Why it matters)** replaced abstract 3-item list with one concrete developer insight (two different pipelines)

## Next Episode Tease

Car Service · Vehicle HAL · CAN Bus
