from vidgen.presentation.thumbnail_renderer import (
    _style_for_scene,
    _extract_generic_props,
    _extract_character_icon_props,
    _split_into_three_lines,
    _truncate_subtitle,
)


def test_style_for_scene_character_icon():
    assert _style_for_scene("CharacterIconScene") == "characterIcon"


def test_style_for_scene_defaults_to_generic():
    assert _style_for_scene("ExplanationScene") == "generic"
    assert _style_for_scene("SomeUnknownType") == "generic"


def test_extract_generic_props_accent_word_from_explicit_prop():
    script = {
        "shots": [
            {
                "type": "ExplanationScene",
                "narration": "Tài xế biết trước cả bạn.",
                "props": {
                    "accentWord": "biết trước",
                    "headline": "H",
                    "body": "Và tài xế đã lăn bánh.",
                },
            }
        ]
    }
    props = _extract_generic_props(script)
    assert props["headline"] == "Tài xế biết trước cả bạn"
    assert props["accentWord"] == "biết trước"
    assert props["subtext"] == "Và tài xế đã lăn bánh."


def test_extract_generic_props_accent_word_from_bold_markdown():
    script = {
        "shots": [
            {
                "type": "ExplanationScene",
                "narration": "Bạn chưa mở app.",
                "props": {"headline": "Bạn chưa mở app. Hệ thống **đã biết.**"},
            }
        ]
    }
    props = _extract_generic_props(script)
    assert props["accentWord"] == "đã biết."
    assert props["subtext"] == "Bạn chưa mở app. Hệ thống đã biết."


def test_extract_generic_props_uses_explicit_meta_thumbnail():
    script = {
        "meta": {
            "thumbnail": {
                "headline": "XÓA LOGO,\nCÒN NHẬN RA BRAND?",
                "accent_word": "NHẬN RA",
                "subtext": "ĐỐI THỦ ĐĂNG ĐƯỢC Y HỆT?",
                "illustration": "brandSwap",
            }
        },
        "shots": [
            {
                "type": "brand_swap_test",
                "narration": "Brand mình hay đối thủ?",
                "props": {"headline": "ĐỔI LOGO NÀO VÀO CŨNG HỢP"},
            }
        ],
    }
    props = _extract_generic_props(script)
    assert props["headline"] == "XÓA LOGO,\nCÒN NHẬN RA BRAND?"
    assert props["accentWord"] == "NHẬN RA"
    assert props["subtext"] == "ĐỐI THỦ ĐĂNG ĐƯỢC Y HỆT?"
    assert props["illustration"] == "brandSwap"


def test_extract_generic_props_part_label_found_in_later_scene():
    script = {
        "shots": [
            {"type": "ExplanationScene", "narration": "A.", "props": {"headline": "H"}},
            {"type": "PhoneMockupScene", "narration": "B", "props": {"partLabel": "Phần 3/4"}},
        ]
    }
    props = _extract_generic_props(script)
    assert props["partLabel"] == "Phần 3/4"


def test_extract_generic_props_no_part_label_omits_key():
    script = {
        "shots": [
            {"type": "ExplanationScene", "narration": "A.", "props": {"headline": "H"}},
        ]
    }
    props = _extract_generic_props(script)
    assert props["partLabel"] is None


def test_extract_character_icon_props_maps_fields():
    script = {
        "shots": [
            {
                "type": "CharacterIconScene",
                "narration": "Grab không chọn tài xế gần bạn nhất.",
                "on_screen_text": "Tài xế cách bạn 200 mét vừa bị hệ thống bỏ qua",
                "props": {
                    "accentColor": "#22C55E",
                    "partLabel": "Phần 1/4",
                    "rejectedPin": {"label": "200m"},
                    "selectedPin": {"label": "350m"},
                },
            }
        ]
    }
    props = _extract_character_icon_props(script, channel_name="Ủa là sao")
    assert props["accentColor"] == "#22C55E"
    assert props["seriesLabel"] == "Phần 1/4"
    assert props["rejectedLabel"] == "200m ✕"
    assert props["selectedLabel"] == "350m ✓"
    assert props["eyebrowText"] == "Ủa là sao"
    assert props["subtitle"] == "Grab không chọn tài xế gần bạn nhất."


def test_split_into_three_lines_respects_line2_budget():
    _, line2, _ = _split_into_three_lines(
        "Tài xế cách bạn hai trăm mét vừa bị hệ thống bỏ qua hoàn toàn"
    )
    assert len(line2) <= 10


def test_split_into_three_lines_truncates_long_remainder():
    _, _, line3 = _split_into_three_lines(
        "một hai ba bốn năm sáu bảy tám chín mười mười một mười hai mười ba mười bốn"
    )
    assert line3.endswith("…")
    assert len(line3) <= 25


def test_split_into_three_lines_short_text_preserves_all_words():
    line1, line2, line3 = _split_into_three_lines("Xe đã đến")
    combined = f"{line1} {line2} {line3}".split()
    assert combined == ["Xe", "đã", "đến"]


def test_extract_character_icon_props_handles_explicit_null_narration():
    script = {
        "shots": [
            {
                "type": "CharacterIconScene",
                "narration": None,
                "on_screen_text": None,
                "props": {},
            }
        ]
    }
    props = _extract_character_icon_props(script)
    assert props["subtitle"] == ""
    assert props["line1"] == ""
    assert props["line2"] == ""
    assert props["line3"] == ""


def test_split_into_three_lines_line3_bounded_like_line1():
    line1, line2, line3 = _split_into_three_lines(
        "Tài xế cách bạn 200 mét vừa bị hệ thống bỏ qua"
    )
    assert line1 == "Tài xế cách bạn"
    assert line2 == "200 mét"
    assert line3 == "vừa bị hệ thống…"


def test_extract_character_icon_props_truncates_long_subtitle():
    script = {
        "shots": [
            {
                "type": "CharacterIconScene",
                "narration": "Grab không chọn tài xế gần bạn nhất — nó chấm điểm họ như một kỳ thi",
                "props": {},
            }
        ]
    }
    props = _extract_character_icon_props(script)
    assert len(props["subtitle"]) <= 41
    assert props["subtitle"].endswith("…")
