import math

import pytest

from vidgen.manifest import FPS, FRAME_PADDING, build_render_manifest, detect_dead_air, detect_transition_silence


def test_duration_frames_calculation():
    script = {
        "shots": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "...",
                "visual": {"headline": "H", "body": "B"},
            }
        ]
    }
    manifest = build_render_manifest(script, {1: 1.5})
    assert manifest["shots"][0]["durationInFrames"] == math.ceil(1.5 * FPS) + FRAME_PADDING


def test_manifest_structure():
    script = {
        "shots": [
            {
                "id": 2,
                "type": "terminal",
                "narration": "...",
                "visual": {"lines": ["$ ls"]},
            }
        ]
    }
    manifest = build_render_manifest(script, {2: 2.0})
    shot = manifest["shots"][0]
    assert shot["type"] == "terminal"
    assert shot["audioPath"] == "audio/scene_2.wav"
    assert shot["visual"] == {"lines": ["$ ls"]}
    assert manifest["fps"] == FPS
    assert manifest["width"] == 1080
    assert manifest["height"] == 1920


def test_manifest_structure_uses_shots_only():
    script = {
        "shots": [
            {
                "id": 2,
                "type": "terminal",
                "narration": "...",
                "visual": {"lines": ["$ ls"]},
            }
        ]
    }
    manifest = build_render_manifest(script, {2: 2.0})
    assert manifest["shots"][0]["type"] == "terminal"
    assert "scenes" not in manifest


def test_split_view_road_constraint_diagram_preset_resolves_axis_data():
    axis = {
        "destinationLabel": "Điểm đón",
        "drivers": [
            {"label": "200m", "distanceMeters": 200, "direction": "away", "etaSeconds": 360},
            {"label": "400m", "distanceMeters": 400, "direction": "toward", "etaSeconds": 120},
        ],
    }
    script = {
        "shots": [
            {
                "id": "shot_02e_b",
                "type": "SplitViewScene",
                "duration_frames": 100,
                "narration": "...",
                "props": {
                    "leftContent": "road_constraint_diagram",
                    "rightContent": "eta_comparison",
                    "roadConstraint": "median",
                    "axis": axis,
                    "accentColor": "#F59E0B",
                },
            }
        ]
    }

    manifest = build_render_manifest(script, {"shot_02e_b": 3.0})
    visual = manifest["shots"][0]["visual"]

    assert visual["leftPanel"] == {"kind": "road_diagram", "axis": axis, "roadConstraint": "median"}
    assert visual["rightPanel"] == {"kind": "eta_comparison", "axis": axis}
    assert "axis" not in visual
    assert "roadConstraint" not in visual


# Reading-speed floor: a caption must stay on screen at least
# len(caption) / 17 chars-per-second, or viewers can't finish reading it
# before the scene cuts. 17 CPS is the standard subtitle ceiling (spaces
# counted), which short TTS audio or authored durations can easily beat.


def test_caption_reading_time_extends_short_audio_derived_duration():
    narration = (
        "Ứng dụng đang chờ thêm vài giây để đưa ra quyết định ghép tài xế "
        "tốt hơn cho bạn và cả những người xung quanh."
    )
    script = {
        "shots": [
            {"id": 1, "type": "explanation", "narration": narration, "visual": {}}
        ]
    }

    manifest = build_render_manifest(script, {1: 1.0})

    min_reading_frames = math.ceil(len(narration) / 17 * FPS)
    assert min_reading_frames > math.ceil(1.0 * FPS) + FRAME_PADDING  # rule actually binds
    assert manifest["shots"][0]["durationInFrames"] == min_reading_frames


def test_caption_reading_time_extends_authored_duration_using_on_screen_text():
    on_screen_text = "Hệ thống không chọn tài xế gần nhất, mà chọn tài xế đến đón nhanh nhất."
    script = {
        "shots": [
            {
                "id": "shot_04b",
                "type": "QuoteCalloutScene",
                "duration_frames": 60,
                "narration": "ba từ thôi",
                "on_screen_text": on_screen_text,
                "props": {},
            }
        ]
    }

    manifest = build_render_manifest(script, {"shot_04b": 1.5})

    # The displayed caption is on_screen_text, not the short narration.
    min_reading_frames = math.ceil(len(on_screen_text) / 17 * FPS)
    assert min_reading_frames > 60  # rule actually binds
    assert manifest["shots"][0]["durationInFrames"] == min_reading_frames


def test_short_caption_leaves_audio_derived_duration_unchanged():
    script = {
        "shots": [
            {"id": 1, "type": "explanation", "narration": "Ngắn gọn.", "visual": {}}
        ]
    }

    manifest = build_render_manifest(script, {1: 3.0})

    assert manifest["shots"][0]["durationInFrames"] == math.ceil(3.0 * FPS) + FRAME_PADDING


# Real dead air: unlike validate_manifest()'s pre-TTS frame-math estimate
# (main.py), detect_dead_air() checks actual synthesized audio length against
# the manifest's final durationInFrames — the only check that covers
# narration_per_criterion shots and any shot the caption-reading floor
# stretched back out after tightening shrank it.


def test_detect_dead_air_clean_scene_reports_nothing():
    script = {
        "shots": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "một hai ba",
                "narration_timing_frames": [0, 60],
                "duration_frames": 70,
                "visual": {},
            }
        ]
    }
    audio_durations = {1: 2.0}  # 60 frames @ 30fps, offset 0 -> ends at 70-60=10 < threshold

    manifest = build_render_manifest(script, audio_durations)

    assert detect_dead_air(script, manifest, audio_durations) == []


def test_detect_dead_air_flags_trailing_silence_after_narration():
    script = {
        "shots": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "một hai ba",
                "narration_timing_frames": [0, 60],
                "duration_frames": 120,
                "visual": {},
            }
        ]
    }
    audio_durations = {1: 2.0}  # 60 frames of audio, 60 frames of scene left over

    manifest = build_render_manifest(script, audio_durations)
    findings = detect_dead_air(script, manifest, audio_durations)

    assert findings == [{"scene_id": 1, "dead_air_frames": 60, "dead_air_seconds": 2.0}]


def test_detect_dead_air_catches_narration_per_criterion_gap_pre_tts_check_misses():
    script = {
        "shots": [
            {
                "id": "shot_05",
                "type": "ScoreCardScene",
                "duration_frames": 200,
                "narration_per_criterion": [{"text": "một", "at_frame": 0}],
                "props": {},
            }
        ]
    }
    audio_durations = {"shot_05_seg0": 1.0}  # 30 frames of audio, scene runs to 200

    manifest = build_render_manifest(script, audio_durations)
    findings = detect_dead_air(script, manifest, audio_durations)

    assert findings == [{"scene_id": "shot_05", "dead_air_frames": 170, "dead_air_seconds": 5.67}]


# Cross-scene silence: shots render back-to-back in TikTokVideo's <Series>
# with no overlap, so a short trailing gap in shot N can stack with a
# slow-starting narration lead-in in shot N+1 into an audible pause that
# neither validate_manifest() nor detect_dead_air() would catch on their own
# (they only look at trailing silence within a single shot).


def test_detect_transition_silence_clean_pair_reports_nothing():
    script = {
        "shots": [
            {"id": 1, "narration": "một", "narration_timing_frames": [0, 30], "duration_frames": 40},
            {"id": 2, "narration": "hai", "narration_timing_frames": [10, 50], "duration_frames": 60},
        ]
    }
    # trailing = 40-30 = 10, leading = 10 -> gap 20, under the 30-frame threshold
    assert detect_transition_silence(script) == []


def test_detect_transition_silence_flags_gap_across_boundary():
    script = {
        "shots": [
            {"id": "a", "narration": "một", "narration_timing_frames": [0, 30], "duration_frames": 50},
            {"id": "b", "narration": "hai", "narration_timing_frames": [20, 60], "duration_frames": 80},
        ]
    }
    # trailing = 50-30 = 20, leading = 20 -> gap 40, over the 30-frame threshold
    findings = detect_transition_silence(script)

    assert findings == [{"from_scene": "a", "to_scene": "b", "gap_frames": 40, "gap_seconds": 1.33}]


def test_detect_transition_silence_skips_silent_by_design_scenes():
    script = {
        "shots": [
            {"id": "a", "narration": "một", "narration_timing_frames": [0, 30], "duration_frames": 200},
            {"id": "b", "duration_frames": 90},  # no narration — visual-only, silent by design
        ]
    }
    assert detect_transition_silence(script) == []


def test_multi_scene_ordering():
    script = {
        "shots": [
            {"id": 1, "type": "explanation", "narration": "...", "visual": {"headline": "A", "body": "B"}},
            {"id": 2, "type": "terminal", "narration": "...", "visual": {"lines": ["$ pwd"]}},
        ]
    }
    manifest = build_render_manifest(script, {1: 1.0, 2: 2.0})
    assert len(manifest["shots"]) == 2
    assert manifest["shots"][0]["id"] == 1
    assert manifest["shots"][1]["id"] == 2
