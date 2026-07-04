from vidgen.main import resolve_script


def test_resolve_script_passes_through_flat_schema_unchanged():
    script = {"video_id": "v", "scenes": [{"id": 1, "type": "explanation"}]}
    assert resolve_script(script) is script


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
        "scenes": [
            {
                "id": "shot_01",
                "type": "QuoteCalloutScene",
                "duration_frames": 90,
                "props": {"text": "Hello world", "backgroundStyle": "gradient-subtle"},
                "narration": "Hello world",
            }
        ],
    }
