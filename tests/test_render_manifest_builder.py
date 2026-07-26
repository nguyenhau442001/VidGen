import math
import os

import pytest

from vidgen.pipeline.render_manifest_builder import FPS, FRAME_PADDING, VALID_SCENE_TYPES, build_render_manifest, copy_media_to_remotion_public, detect_dead_air, detect_transition_silence, validate_media_path_present, validate_real_footage_audio_source


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
    assert shot["previewAudioPath"] == "audio/scene_2.mp3"
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


def test_manifest_preserves_optional_soundtrack():
    script = {
        "soundtrack": {"path": "audio/bed.wav", "volume": 0.2},
        "shots": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "...",
                "visual": {"headline": "H"},
            }
        ],
    }

    manifest = build_render_manifest(script, {1: 1.0})

    assert manifest["soundtrack"] == {"path": "audio/bed.wav", "volume": 0.2}


def test_soundtrack_turns_post_narration_hold_into_sound_design():
    script = {
        "soundtrack": {"path": "audio/bed.wav", "volume": 0.2},
        "shots": [
            {
                "id": 1,
                "type": "explanation",
                "duration_frames": 120,
                "narration": "một câu ngắn",
                "narration_timing_frames": [0, 30],
                "visual": {"headline": "H"},
            },
            {
                "id": 2,
                "type": "explanation",
                "duration_frames": 120,
                "narration": "câu tiếp theo",
                "narration_timing_frames": [30, 60],
                "visual": {"headline": "H"},
            },
        ],
    }
    manifest = build_render_manifest(script, {1: 1.0, 2: 1.0})

    assert detect_dead_air(script, manifest, {1: 1.0, 2: 1.0}) == []
    assert detect_transition_silence(script) == []


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


def test_new_cinematic_scene_types_translate_to_manifest_keys():
    script = {
        "shots": [
            {
                "id": "shot_goal",
                "type": "StadiumGoalScene",
                "duration_frames": 120,
                "narration": "...",
                "props": {"headline": "GOAL", "accentWord": "GOAL"},
            },
            {
                "id": "shot_orb",
                "type": "GoalOrbJourneyScene",
                "duration_frames": 120,
                "narration": "...",
                "props": {"headline": "Orb"},
            },
        ]
    }

    manifest = build_render_manifest(script, {"shot_goal": 2.0, "shot_orb": 2.0})

    assert manifest["shots"][0]["type"] == "stadium_goal"
    assert manifest["shots"][1]["type"] == "goal_orb_journey"
    assert manifest["shots"][0]["visual"]["headline"] == "GOAL"


def test_grabfood_p2_scene_types_translate_to_manifest_keys():
    new_types = [
        ("MapDotToHumanShot", "map_dot_to_human"),
        ("WorkToGameMorphShot", "work_to_game_morph"),
        ("TripleMetricOrbitShot", "triple_metric_orbit"),
        ("ProgressMemoryTrailShot", "progress_memory_trail"),
        ("DualClockRouteShot", "dual_clock_route"),
        ("WeightedChoiceWorldShot", "weighted_choice_world"),
        ("FalseCompletionShot", "false_completion"),
        ("ThesisTeaserShot", "thesis_teaser"),
    ]
    script = {
        "shots": [
            {
                "id": f"shot_{i}",
                "type": pascal,
                "duration_frames": 100,
                "narration": "...",
                "props": {},
            }
            for i, (pascal, _snake) in enumerate(new_types)
        ]
    }
    audio_durations = {f"shot_{i}": 2.0 for i in range(len(new_types))}
    manifest = build_render_manifest(script, audio_durations)
    got_types = [s["type"] for s in manifest["shots"]]
    assert got_types == [snake for _pascal, snake in new_types]


def test_unknown_scene_type_fails_fast_during_manifest_build():
    script = {
        "shots": [
            {
                "id": "shot_bad",
                "type": "NoSuchScene",
                "duration_frames": 120,
                "narration": "...",
                "props": {},
            }
        ]
    }

    with pytest.raises(ValueError) as ctx:
        build_render_manifest(script, {"shot_bad": 2.0})

    assert "unknown scene type" in str(ctx.value)


def test_direct_snake_case_scene_types_still_build():
    script = {
        "shots": [
            {
                "id": "shot_flow",
                "type": "animated_flow",
                "duration_frames": 120,
                "narration": "...",
                "props": {
                    "headline": "Flow",
                    "nodes": [{"id": "a", "label": "A"}],
                    "edges": [],
                },
            }
        ]
    }

    manifest = build_render_manifest(script, {"shot_flow": 2.0})

    assert manifest["shots"][0]["type"] == "animated_flow"


# Real dead air: unlike validate_manifest()'s pre-TTS frame-math estimate
# (main.py), detect_dead_air() checks actual synthesized audio length against
# the manifest's final durationInFrames — the only check that covers
# narration_per_criterion shots.


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


# Cross-scene silence: shots render back-to-back in ShortFormVideo's <Series>
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


def test_copy_media_to_remotion_public_copies_video_and_image(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake video bytes")
    (media_dir / "shot.png").write_bytes(b"fake png bytes")

    public_video_dir = tmp_path / "public_video"
    public_images_dir = tmp_path / "public_images"

    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
            {"id": "s2", "type": "screenshot", "props": {"imagePath": "images/shot.png"}},
        ]
    }

    copied = copy_media_to_remotion_public(
        script, str(media_dir), str(public_video_dir), str(public_images_dir)
    )

    assert os.path.exists(public_video_dir / "clip.mp4")
    assert os.path.exists(public_images_dir / "shot.png")
    assert sorted(copied) == ["images/shot.png", "video/clip.mp4"]


def test_copy_media_to_remotion_public_missing_file_raises(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()  # no clip.mp4 inside

    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }

    try:
        copy_media_to_remotion_public(
            script, str(media_dir), str(tmp_path / "pv"), str(tmp_path / "pi")
        )
        assert False, "expected FileNotFoundError"
    except FileNotFoundError as e:
        assert "s1" in str(e)
        assert "clip.mp4" in str(e)


def test_copy_media_to_remotion_public_ignores_other_shot_types(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {"shots": [{"id": "s1", "type": "explanation", "props": {"headline": "hi"}}]}

    copied = copy_media_to_remotion_public(
        script, str(media_dir), str(tmp_path / "pv"), str(tmp_path / "pi")
    )
    assert copied == []


def test_real_footage_and_screenshot_are_valid_scene_types():
    assert "real_footage" in VALID_SCENE_TYPES
    assert "screenshot" in VALID_SCENE_TYPES


def test_build_render_manifest_accepts_real_footage_shot():
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "real_footage",
                "narration": "Đây là màn hình thật.",
                "duration_frames": 90,
                "props": {"mediaPath": "clip.mp4"},
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={"s1": 2.5})
    assert manifest["shots"][0]["type"] == "real_footage"
    # copy_media_to_remotion_public() always copies real_footage clips under
    # remotion/public/video/<basename> regardless of the authored path, so
    # the manifest's visual.mediaPath must resolve to that same location for
    # staticFile() to find the file — not the raw authored value.
    assert manifest["shots"][0]["visual"]["mediaPath"] == "video/clip.mp4"


def test_build_render_manifest_normalizes_real_footage_media_path_with_prefix():
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
                "duration_frames": 90,
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={})
    assert manifest["shots"][0]["visual"]["mediaPath"] == "video/clip.mp4"


def test_build_render_manifest_accepts_screenshot_shot():
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "screenshot",
                "narration": "Xem giao diện.",
                "duration_frames": 90,
                "props": {"imagePath": "shot.png", "chrome": "phone"},
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={"s1": 2.0})
    assert manifest["shots"][0]["type"] == "screenshot"
    assert manifest["shots"][0]["visual"]["chrome"] == "phone"
    # Same normalization as real_footage, for images/<basename>.
    assert manifest["shots"][0]["visual"]["imagePath"] == "images/shot.png"


def test_build_render_manifest_uses_measured_duration_for_useOriginalAudio_shot():
    # measure_media_durations() merges real_footage useOriginalAudio clip
    # durations into the same audio_durations dict TTS durations go into,
    # even though these shots have no `narration`. duration_frames must
    # still fall back to that measured value rather than the fps*3 stub.
    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1",
                "type": "real_footage",
                "props": {"mediaPath": "clip.mp4", "useOriginalAudio": True},
            }
        ],
    }
    manifest = build_render_manifest(script, audio_durations={"s1": 12.0})
    assert manifest["shots"][0]["durationInFrames"] == math.ceil(12.0 * FPS) + FRAME_PADDING
    # No narration -> no TTS audioPath; audio comes from the clip itself.
    assert manifest["shots"][0]["audioPath"] == ""


def test_validate_real_footage_audio_source_ok_with_narration():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "narration": "Nói gì đó.",
             "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }
    validate_real_footage_audio_source(script)  # should not raise


def test_validate_real_footage_audio_source_ok_with_original_audio():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage",
             "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True}},
        ]
    }
    validate_real_footage_audio_source(script)  # should not raise


def test_validate_real_footage_audio_source_raises_with_neither():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "video/clip.mp4"}},
        ]
    }
    try:
        validate_real_footage_audio_source(script)
        assert False, "expected ValueError"
    except ValueError as e:
        assert "s1" in str(e)


def test_validate_real_footage_audio_source_ignores_other_types():
    script = {"shots": [{"id": "s1", "type": "explanation", "narration": None}]}
    validate_real_footage_audio_source(script)  # should not raise


def test_validate_media_path_present_ok_when_present():
    script = {
        "shots": [
            {"id": "s1", "type": "real_footage", "props": {"mediaPath": "clip.mp4"}},
            {"id": "s2", "type": "screenshot", "props": {"imagePath": "shot.png"}},
        ]
    }
    validate_media_path_present(script)  # should not raise


def test_validate_media_path_present_raises_when_real_footage_media_path_missing():
    script = {"shots": [{"id": "s1", "type": "real_footage", "props": {}}]}
    with pytest.raises(ValueError) as ctx:
        validate_media_path_present(script)
    assert "s1" in str(ctx.value)


def test_validate_media_path_present_raises_when_real_footage_media_path_empty():
    script = {"shots": [{"id": "s1", "type": "real_footage", "props": {"mediaPath": ""}}]}
    with pytest.raises(ValueError) as ctx:
        validate_media_path_present(script)
    assert "s1" in str(ctx.value)


def test_validate_media_path_present_raises_when_screenshot_image_path_missing():
    script = {"shots": [{"id": "s1", "type": "screenshot", "props": {}}]}
    with pytest.raises(ValueError) as ctx:
        validate_media_path_present(script)
    assert "s1" in str(ctx.value)


def test_validate_media_path_present_raises_when_screenshot_image_path_empty():
    script = {"shots": [{"id": "s1", "type": "screenshot", "props": {"imagePath": ""}}]}
    with pytest.raises(ValueError) as ctx:
        validate_media_path_present(script)
    assert "s1" in str(ctx.value)


def test_validate_media_path_present_ignores_other_types():
    script = {"shots": [{"id": "s1", "type": "explanation", "props": {}}]}
    validate_media_path_present(script)  # should not raise
