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


def test_split_view_road_constraint_diagram_preset_resolves_axis_data():
    axis = {
        "destinationLabel": "Điểm đón",
        "drivers": [
            {"label": "200m", "distanceMeters": 200, "direction": "away", "etaSeconds": 360},
            {"label": "400m", "distanceMeters": 400, "direction": "toward", "etaSeconds": 120},
        ],
    }
    script = {
        "scenes": [
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
    visual = manifest["scenes"][0]["visual"]

    assert visual["leftPanel"] == {"kind": "road_diagram", "axis": axis, "roadConstraint": "median"}
    assert visual["rightPanel"] == {"kind": "eta_comparison", "axis": axis}
    assert "axis" not in visual
    assert "roadConstraint" not in visual


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
