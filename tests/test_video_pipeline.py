import pytest

from vidgen.pipeline.video_pipeline import resolve_script, validate_manifest


def test_resolve_script_passes_through_flat_schema_unchanged():
    script = {"video_id": "v", "shots": [{"id": 1, "type": "explanation"}]}
    resolved = resolve_script(script)
    assert resolved is script


def test_resolve_script_rejects_legacy_scenes_schema():
    script = {"video_id": "v", "scenes": [{"id": 1, "type": "explanation"}]}
    with pytest.raises(ValueError, match="scenes"):
        resolve_script(script)


def test_resolve_script_flattens_nested_motion_pipeline_schema():
    nested = {
        "video_id": "test_vid",
        "fps": 30,
        "aspect_ratio": "9:16",
        "narration_language": "vi",
        "assets": {},
        "sequences": [
            {
                "shots": [
                    {
                        "id": "shot_01",
                        "component": "QuoteCalloutScene",
                        "frame_range": [0, 90],
                        "narration": "Hello world",
                        "tts_speed": 1.25,
                    }
                ]
            }
        ],
    }

    flat = resolve_script(nested)

    assert flat == {
        "video_id": "test_vid",
        "fps": 30,
        "aspect_ratio": "9:16",
        "narration_language": "vi",
        "shots": [
            {
                "id": "shot_01",
                "type": "QuoteCalloutScene",
                "duration_frames": 90,
                "props": {"text": "Hello world", "backgroundStyle": "gradient-subtle"},
                "narration": "Hello world",
                "tts_speed": 1.25,
            }
        ],
    }


def test_validate_manifest_clean_passes():
    manifest = {
        "shots": [
            {
                "id": "shot_01a",
                "narration": "một hai ba bốn năm",
                "narration_timing_frames": [0, 80],
                "duration_frames": 100,
                "transition_out_delay_frames": 10,
            }
        ]
    }

    validate_manifest(manifest)  # should not raise


def test_validate_manifest_word_count_error_raises():
    manifest = {
        "shots": [
            {
                "id": "shot_02b",
                "narration": "một hai ba bốn năm sáu bảy tám chín mười",
                "narration_timing_frames": [0, 40],
                "duration_frames": 100,
                "transition_out_delay_frames": 0,
            }
        ]
    }

    with pytest.raises(ValueError, match="shot_02b"):
        validate_manifest(manifest)


def test_validate_manifest_overflow_error_raises():
    manifest = {
        "shots": [
            {
                "id": "shot_03a",
                "narration": "một hai ba bốn năm",
                "narration_timing_frames": [0, 95],
                "duration_frames": 100,
                "transition_out_delay_frames": 10,
            }
        ]
    }

    with pytest.raises(ValueError, match="shot_03a"):
        validate_manifest(manifest)

