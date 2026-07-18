"""Critical layout guards for scenes with dense text inside fixed shapes."""

from pathlib import Path


SCENE_DIR = Path("remotion/src/scenes")
SHAPE_HEAVY_SCENES = (
    "DriverJourneyScene.tsx",
    "DriverMatrixTeaserScene.tsx",
    "JourneyPerspectiveScene.tsx",
    "RouteOptimizerScene.tsx",
)


def test_shape_heavy_scenes_center_and_contain_text():
    for filename in SHAPE_HEAVY_SCENES:
        source = (SCENE_DIR / filename).read_text(encoding="utf-8")
        assert 'boxSizing: "border-box"' in source, filename
        assert 'alignItems: "center"' in source, filename
        assert 'justifyContent: "center"' in source, filename
        assert 'whiteSpace: "nowrap"' in source or 'whiteSpace: "pre"' in source, filename


def test_authored_two_line_closing_copy_stays_explicit():
    source = Path("content/grabfood_wait_time_p1.json").read_text(encoding="utf-8")
    assert 'Bạn chỉ đang đợi một bữa ăn.\\nCòn chú tài xế' in source

    component = (SCENE_DIR / "DriverJourneyScene.tsx").read_text(encoding="utf-8")
    assert 'whiteSpace: "pre"' in component
