import pytest

from vidgen.gate1 import gate1_assert, score_script, _looks_like_cta, _looks_like_hook


def _script(shots):
    return {"video_id": "v", "fps": 30, "shots": shots}


GOOD_BEAT_ORDER_SCRIPT = _script([
    {
        "id": "s1",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Tại sao Grab không chọn tài xế gần nhất?",
        "props": {"headline": "Hook"},
    },
    {
        "id": "s2",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Bạn tưởng khoảng cách là tất cả, nhưng không phải.",
        "props": {"headline": "Body"},
    },
    {
        "id": "s3",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Hóa ra họ còn tối ưu thêm một score khác.",
        "props": {"headline": "Reveal"},
    },
    {
        "id": "s4",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Nhưng còn một yếu tố nữa. Xem phần tiếp theo.",
        "props": {"headline": "CTA"},
    },
])


BAD_BEAT_ORDER_SCRIPT = _script([
    {
        "id": "s1",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Giới thiệu về AI.",
        "props": {"headline": "Intro"},
    },
    {
        "id": "s2",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Phần giải thích ở giữa.",
        "props": {"headline": "Middle"},
    },
    {
        "id": "s3",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Một ý nữa.",
        "props": {"headline": "More"},
    },
    {
        "id": "s4",
        "type": "explanation",
        "duration_frames": 150,
        "narration": "Cảm ơn bạn đã xem.",
        "props": {"headline": "Outro"},
    },
])


def test_score_script_includes_beat_order_dimension():
    audit = score_script(GOOD_BEAT_ORDER_SCRIPT)

    assert "beat_order" in audit
    assert audit["beat_order"] == 5
    assert audit["total"] == audit["hook"] + audit["pacing"] + audit["visual"] + audit["arc"] + audit["beat_order"]


def test_gate1_assert_passes_when_hook_and_cta_are_on_the_ends():
    audit = gate1_assert(GOOD_BEAT_ORDER_SCRIPT)

    assert audit["beat_order"] == 5


def test_gate1_assert_fails_when_first_and_last_scenes_are_generic():
    with pytest.raises(ValueError) as ctx:
        gate1_assert(BAD_BEAT_ORDER_SCRIPT)

    message = str(ctx.value)
    assert "beat_order" in message
    assert "scene đầu" in message
    assert "scene cuối" in message


def test_short_hook_and_cta_markers_do_not_overmatch():
    assert not _looks_like_hook("Sao?")
    assert not _looks_like_cta("Còn nữa.")


def test_short_strong_hook_and_cta_still_match():
    assert _looks_like_hook("Tại sao?")
    assert _looks_like_cta("Xem tiếp.")


def test_new_cinematic_scene_types_are_valid_for_gate1():
    script = _script([
        {
            "id": "s1",
            "type": "StadiumGoalScene",
            "duration_frames": 120,
            "narration": "Tại sao bàn thắng đến nhanh hơn mắt bạn?",
            "props": {"headline": "Hook", "accentWord": "Hook"},
        },
        {
            "id": "s2",
            "type": "GoalOrbJourneyScene",
            "duration_frames": 120,
            "narration": "Quả bóng sáng chạy qua nhiều chặng trước khi tới nhà bạn.",
            "props": {"headline": "Orb", "accentWord": "Orb"},
        },
        {
            "id": "s3",
            "type": "SplitApartmentScene",
            "duration_frames": 120,
            "narration": "Còn một lớp trễ nữa, xem tiếp.",
            "props": {"headline": "CTA", "accentWord": "CTA"},
        },
    ])

    audit = gate1_assert(script)

    assert audit["visual"] == 5
