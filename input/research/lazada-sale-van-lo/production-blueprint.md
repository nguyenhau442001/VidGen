# Lazada sale van lo — Production blueprint

Status: visual plan for the draft narration. Do not generate production JSON until the
narration in `narrative-outline.md` is approved and copied verbatim into the matching TXT.

## Format

- Slug/video ID: `lazada_sale_van_lo`
- Canvas: 1080×1920, 30fps
- Target duration: 60–75 seconds
- Palette: dark background; Lazada-inspired magenta `#FF5A8A` as the only bright accent
- Captions: narration-driven karaoke captions from the pipeline
- Evidence rule: distinguish Lazada from the multi-business AIDC segment on screen

## Shot mapping

| Shot | Planned type | Visual payload | Authored duration |
|---|---|---|---:|
| 00 | New `LazadaSaleHookShot` | Exact two-line hook `LAZADA CÀNG SALE,\nCÀNG LỖ?`; accent `CÀNG LỖ?`; shopping-bag icon | 100f |
| 01 | `SplitViewScene` | Left: `AIDC / CẢ MẢNG QUỐC TẾ`; right: `LAZADA / KHÔNG CÓ LỢI NHUẬN RIÊNG`; final copy references July 2024 monthly EBITDA | 264f |
| 02 | `MillionDongLayersShot` | `500.000Đ GMV` split conceptually into seller money versus commission, ads, and services; explicit `MINH HỌA` label in copy | 264f |
| 03 | `LedgerEntryShot` | Four cost rows: operations/system, payment/support, warehouse/logistics, platform-funded voucher; no invented numbers | 256f |
| 04 | `AnimatedFlowScene` | `NGÂN SÁCH → KHÁCH MỚI → THÓI QUEN → MẬT ĐỘ ĐƠN`; one causal chain | 264f |
| 05 | `DiagramFlowScene` | `ĐƠN ĐỦ DÀY → GOM NHIỀU KIỆN → KHO HIỆU QUẢ → LỖ/ĐƠN GIẢM`; mark mechanism as explanatory, not Lazada data | 264f |
| 06 | `TimelineStagesScene` | `GIAI ĐOẠN ĐẦU → THU HẸP LỖ → 07/2024 EBITDA DƯƠNG`; source note below | 264f |
| 07 | `PayerRevealShot` | Voucher `100.000Đ` fans out to `Lazada`, `Shop`, `Ngân hàng`; headline `AI THẬT SỰ TRẢ?` | 264f |

Total authored duration: 1,940 frames = 64.67 seconds at 30fps. All narrated shots
reserve at least 8 frames per word; every shot stays within the 3–9 second editorial band.

## Props contract

The final JSON should use these exact semantic payloads after narration approval:

```text
shot_00 LazadaSaleHookShot
  headline: "LAZADA CÀNG SALE,\nCÀNG LỖ?"
  accentWord: "CÀNG LỖ?"
  saleTags: ["9.9", "11.11", "12.12"]
  orderLabel: "ĐƠN HÀNG TĂNG"
  profitLabel: "LỢI NHUẬN?"
  illustrativeLabel: "CÂU HỎI ĐANG ĐƯỢC KIỂM CHỨNG"

shot_01 SplitViewScene
  left:  {label: "AIDC", lines: ["CẢ MẢNG QUỐC TẾ", "NHIỀU NỀN TẢNG"]}
  right: {label: "LAZADA", lines: ["KHÔNG CÓ SỐ RIÊNG", "07/2024: EBITDA DƯƠNG"]}
  captionText: "EBITDA THEO THÁNG ≠ LỢI NHUẬN RÒNG BỀN VỮNG"

shot_02 MillionDongLayersShot
  amountLabel: "500.000Đ GMV"
  headline: "GMV KHÔNG PHẢI DOANH THU"
  accentWord: "KHÔNG PHẢI"
  layers: ["PHẦN LỚN → NGƯỜI BÁN", "HOA HỒNG", "QUẢNG CÁO", "PHÍ DỊCH VỤ"]

shot_03 LedgerEntryShot
  eyebrow: "CHI PHÍ CỦA SÀN"
  toggleLabel: "Mỗi đơn mới"
  lineItems: ["VẬN HÀNH + HỆ THỐNG", "CSKH", "KHO + LOGISTICS", "VOUCHER SÀN TÀI TRỢ"]
  illustrativeLabel: "SƠ ĐỒ CƠ CHẾ — KHÔNG PHẢI SỐ LAZADA"

shot_04 AnimatedFlowScene
  headline: "MỤC TIÊU KHÔNG CHỈ LÀ LỜI/ĐƠN"
  nodes: ["NGÂN SÁCH", "KHÁCH MỚI", "THÓI QUEN", "MẬT ĐỘ ĐƠN"]
  edges: ["thu hút", "quay lại", "tăng"]

shot_05 DiagramFlowScene
  headline: "QUY MÔ BẮT ĐẦU TRẢ TIỀN"
  accentWord: "QUY MÔ"
  nodes: ["ĐƠN ĐỦ DÀY", "GOM NHIỀU KIỆN", "KHO HIỆU QUẢ", "LỖ/ĐƠN GIẢM"]
  badgeText: "CƠ CHẾ MINH HỌA"

shot_06 TimelineStagesScene
  headline: "LỖ TRÊN MỖI ĐƠN GIẢM DẦN"
  accentWord: "GIẢM DẦN"
  stages: ["GIAI ĐOẠN ĐẦU", "THU HẸP LỖ", "07/2024 EBITDA DƯƠNG"]
  note: "Nguồn: Alibaba FY2023 · quý kết thúc 30/06/2024 · Lazada CEO"

shot_07 PayerRevealShot
  headline: "AI THẬT SỰ TRẢ?"
  accentWord: "AI"
  amount: "100.000Đ"
  payers: ["Lazada", "Shop", "Ngân hàng"]
  platformLabel: "Lazada"
  illustrativeLabel: "TÙY TỪNG CHƯƠNG TRÌNH"
```

## Visual text constraints

- Shot 00 must use `whiteSpace: pre`, an explicit newline, and a verified fixed font size.
  The current generic quote scene uses `pre-line`, so production should use a shot-local
  hook instead of claiming an exact two-line guarantee from that component.
- No headline exceeds five words except the evidence labels in shot 01, which are panel copy.
- Shot 03 uses four rows, with combined categories to avoid a dense six-row ledger.
- All labels inside chips/cards are short and centered; long explanatory text stays in captions.
- `accentWord` must be an exact substring of each headline.
- Each source label is short: `Alibaba FY2023`, `Alibaba FY2026`, or `Lazada CEO · 07/2024`.

## Thumbnail copy

Exact two lines:

```text
SALE SẬP SÀN
SAO VẪN LỖ?
```

Accent only `VẪN LỖ?`; no extra subtitle.
