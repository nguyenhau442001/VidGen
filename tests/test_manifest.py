import math
import pytest
from vidgen.manifest import build_render_manifest, FPS, FRAME_PADDING


def test_duration_frames_calculation():
    script = {
        "scenes": [
            {
                "id": 1,
                "type": "explanation",
                "narration": "...",
                "visual": {"headline": "H", "body": "B"},
            }
        ]
    }
    manifest = build_render_manifest(script, {1: 1.5})
    assert manifest["scenes"][0]["durationInFrames"] == math.ceil(1.5 * FPS) + FRAME_PADDING


def test_manifest_structure():
    script = {
        "scenes": [
            {
                "id": 2,
                "type": "terminal",
                "narration": "...",
                "visual": {"lines": ["$ ls"]},
            }
        ]
    }
    manifest = build_render_manifest(script, {2: 2.0})
    scene = manifest["scenes"][0]
    assert scene["type"] == "terminal"
    assert scene["audioPath"] == "audio/scene_2.wav"
    assert scene["visual"] == {"lines": ["$ ls"]}
    assert manifest["fps"] == FPS
    assert manifest["width"] == 1080
    assert manifest["height"] == 1920


def test_multi_scene_ordering():
    script = {
        "scenes": [
            {"id": 1, "type": "explanation", "narration": "...", "visual": {"headline": "A", "body": "B"}},
            {"id": 2, "type": "terminal", "narration": "...", "visual": {"lines": ["$ pwd"]}},
        ]
    }
    manifest = build_render_manifest(script, {1: 1.0, 2: 2.0})
    assert len(manifest["scenes"]) == 2
    assert manifest["scenes"][0]["id"] == 1
    assert manifest["scenes"][1]["id"] == 2
