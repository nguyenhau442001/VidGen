import pytest
from unittest.mock import patch

from vidgen.main import _run_gate1_llm, resolve_script, validate_manifest


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


def test_run_gate1_llm_returns_rewritten_script():
    script = {"video_id": "v", "shots": []}
    rewritten = {"video_id": "v2", "shots": [{"id": "s1"}]}

    with patch("vidgen.main.gate1_llm_assert", return_value=rewritten) as mock_gate:
        result = _run_gate1_llm(script, "content/v.json")

    assert result is rewritten
    mock_gate.assert_called_once_with(
        script,
        max_retries=2,
        auto_rewrite=True,
    )
