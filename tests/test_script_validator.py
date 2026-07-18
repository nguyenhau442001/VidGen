import pytest

from vidgen.pipeline.script_validator import validate_manifest

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


