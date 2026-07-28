"""Generate narration WAVs for the v3 (feature-first, no-joke) HSK promo script.

Scene numbering matches content/text/hsk_flashcards_promo.txt v3 (Cảnh 1-9).
Old WAVs were deleted after the v2 final render was verified (per project
cleanup rule for intermediate TTS artifacts), and Cảnh 1 has brand-new
narration + the traffic-proof scene moved to Cảnh 8, so everything is
re-synthesized from scratch rather than reusing anything.
"""
from __future__ import annotations

from pathlib import Path

from vidgen.audio import speech_synthesizer

ROOT = Path("/Users/haunguyen/GitHub/VidGen")
OUT = ROOT / "public/audio/hsk_flashcards_promo"
OUT.mkdir(parents=True, exist_ok=True)

LINES = {
    "scene01": "Đây là bộ flashcard học HSK mình tự làm, đủ chữ Hán, pinyin, nghĩa Việt và phát âm.",
    "scene02": "Có app thiếu nghĩa Việt. Có app lại không hợp cách tôi ôn những từ chưa nhớ. Tôi chỉ cần một bộ flashcard đơn giản, đúng cách mình học.",
    "scene03": "Trong này có flashcard từ HSK1 đến HSK6, với chữ Hán, pinyin, nghĩa tiếng Việt, phát âm và câu ví dụ. Mỗi cấp độ đều đủ bộ, từ người mới học tới người ôn thi cao cấp.",
    "scene04": "Có cả tổng quan từ vựng, biết ngay mình đã thuộc bao nhiêu, còn thiếu bao nhiêu ở từng cấp.",
    "scene05": "Từ nào nhớ thì đánh dấu đã nhớ. Từ nào còn quên thì giữ lại để ôn riêng. Tool cũng tự lưu tiến trình, nên tắt trình duyệt rồi mở lại vẫn học tiếp được.",
    "scene06": "Tự đặt mục tiêu học mỗi ngày, học đủ số từ là tiến trình tự sáng lên ngay.",
    "scene07": "Có cả chế độ tối cho những hôm học muộn.",
    "scene08": "Ban đầu tôi chỉ làm để tự học. Nhưng sau khi chia sẻ, tổng lượt truy cập trong khoảng 30 ngày được ước tính đã gần 1.000!",
    "scene09": "Tool miễn phí, không cần đăng ký hay cài ứng dụng. Link ở bio, mở lên là học được luôn.",
}


def main() -> None:
    for name, text in LINES.items():
        speech_synthesizer.synthesize(
            text=text,
            output_path=OUT / f"{name}.wav",
            speed=1.2,
        )


if __name__ == "__main__":
    main()
