from vidgen.config.project_paths import (
    CONTENT_MEDIA_DIR,
    REMOTION_DIR,
    REMOTION_PUBLIC_IMAGES,
    REMOTION_PUBLIC_VIDEO,
    REPO_ROOT,
)


def test_content_media_dir_under_output_content():
    # content/media/ holds generated media (per repo input/output/tool split),
    # not the authored input/content/ tree.
    assert CONTENT_MEDIA_DIR == REPO_ROOT / "output" / "content" / "media"


def test_remotion_public_media_dirs():
    assert REMOTION_PUBLIC_VIDEO == REMOTION_DIR / "public" / "video"
    assert REMOTION_PUBLIC_IMAGES == REMOTION_DIR / "public" / "images"
