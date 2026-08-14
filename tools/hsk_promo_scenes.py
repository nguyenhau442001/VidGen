"""Text cue list for the HSK flashcards promo video.

Content and timing are reconstructed from the surviving artifact
(output/hsk_flashcards_promo_with_text.mp4) since the original ffmpeg
drawtext generation script was never saved. Wording matches the authored
narration in content/text/hsk_flashcards_promo.txt; timing matches what
is currently burned into the video (verified against extracted frames).
Only sizing/wrapping/position changes in the rebuild - content and timing
are preserved so the fix is scoped to the reported bug.
"""
from hsk_promo_render import TextCue

CUES: list[TextCue] = [
    # Scene 1 - hook
    TextCue(["ĐÂY LÀ THÀNH QUẢ", "CỦA NHỮNG NGÀY ĐAU KHỔ"], 0.0, 3.7, "overlay"),

    # Scene 3 - punchline
    TextCue(["À KHÔNG."], 6.6, 7.1, "overlay"),
    TextCue(["NÊN TÔI TỰ CODE LUÔN."], 7.2, 8.2, "overlay"),

    # Scene 3->4 subtitle (voice-over continues under desk-shot)
    TextCue(["Đau khổ ở đây là…"], 4.1, 6.5, "subtitle"),
    TextCue(["…tôi tìm mãi không ra cái tool học HSK vừa ý."], 8.3, 11.9, "subtitle"),

    # Scene 4 - real pain points
    TextCue(["Có app thiếu nghĩa Việt."], 12.0, 14.3, "subtitle"),
    TextCue(["Có app lại không hợp cách tôi ôn những từ chưa nhớ."], 14.4, 17.6, "subtitle"),
    TextCue(["Tôi chỉ cần một bộ flashcard đơn giản,", "đúng cách mình học."], 17.7, 20.6, "subtitle"),
    TextCue(["LÀM BỞI MỘT NGƯỜI", "ĐANG HỌC HSK"], 12.0, 13.4, "overlay"),

    # Scene 5 - real users
    TextCue(["Ban đầu tôi chỉ làm để tự học."], 20.7, 22.7, "subtitle"),
    TextCue(
        ["Nhưng sau khi chia sẻ, tổng lượt truy cập trong khoảng", "30 ngày được ước tính đã gần 1.000!"],
        22.8, 26.6, "subtitle",
    ),
    TextCue(["ƯỚC TÍNH GẦN 1.000 LƯỢT TRUY CẬP", "TRONG KHOẢNG 30 NGÀY"], 24.6, 26.6, "overlay"),

    # Scene 6 - feature tour
    TextCue(
        ["Trong này có flashcard từ HSK1 đến HSK6, với chữ Hán,", "pinyin, nghĩa tiếng Việt, phát âm và câu ví dụ."],
        26.7, 30.4, "subtitle",
    ),
    TextCue(
        ["Mỗi cấp độ đều đủ bộ, từ người mới học", "tới người ôn thi cao cấp."],
        30.5, 33.6, "subtitle",
    ),
    TextCue(["HSK1 → HSK6"], 26.7, 28.0, "overlay"),
    TextCue(["CHỮ HÁN · PINYIN · NGHĨA VIỆT"], 28.1, 29.6, "overlay"),
    TextCue(["PHÁT ÂM · CÂU VÍ DỤ"], 29.7, 31.1, "overlay"),
    TextCue(["TỐC ĐỘ ĐỌC · TÙY CHỈNH"], 31.2, 33.6, "overlay"),

    # Scene 7 - vocab overview (NEW)
    TextCue(
        ["Có cả tổng quan từ vựng, biết ngay mình đã thuộc", "bao nhiêu, còn thiếu bao nhiêu ở từng cấp."],
        33.7, 37.6, "subtitle",
    ),
    TextCue(["TỔNG QUAN TỪ VỰNG"], 33.7, 35.6, "overlay"),

    # Scene 8 - review flow
    TextCue(["Từ nào nhớ thì đánh dấu đã nhớ."], 37.7, 39.6, "subtitle"),
    TextCue(["NHỚ TỪ NÀO", "LƯU TỪ ĐÓ"], 35.7, 38.0, "overlay"),
]
