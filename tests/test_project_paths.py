from vidgen.config.project_paths import (
    CONTENT_DIR,
    CONTENT_MEDIA_DIR,
    REMOTION_DIR,
    REMOTION_PUBLIC_IMAGES,
    REMOTION_PUBLIC_VIDEO,
)


def test_content_media_dir_under_content():
    assert CONTENT_MEDIA_DIR == CONTENT_DIR / "media"


def test_remotion_public_media_dirs():
    assert REMOTION_PUBLIC_VIDEO == REMOTION_DIR / "public" / "video"
    assert REMOTION_PUBLIC_IMAGES == REMOTION_DIR / "public" / "images"
