from pathlib import Path

import pytest

from vidgen.publisher import tiktok_client


def test_authorization_url_requests_creator_publish_scopes():
    url = tiktok_client.authorization_url("client", "https://app.test/auth/tiktok/callback", "state")
    assert "video.publish" in url
    assert "user.info.basic" in url
    assert "state=state" in url


@pytest.mark.parametrize(
    ("size", "chunk_size", "chunk_count"),
    [
        (4 * 1024 * 1024, 4 * 1024 * 1024, 1),
        (20 * 1024 * 1024, 10 * 1024 * 1024, 2),
        (25 * 1024 * 1024, 10 * 1024 * 1024, 2),
    ],
)
def test_file_source_info_follows_tiktok_chunk_rules(tmp_path, size, chunk_size, chunk_count):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\0" * size)
    info = tiktok_client._file_source_info(video)
    assert info["chunk_size"] == chunk_size
    assert info["total_chunk_count"] == chunk_count


def test_initialize_direct_post_sends_metadata_and_file_source(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"\0" * 100)
    captured = {}
    monkeypatch.setattr(tiktok_client, "_api_post", lambda path, token, payload: captured.update(
        path=path, token=token, payload=payload
    ) or {"publish_id": "p", "upload_url": "u"})
    post = {"privacy_level": "SELF_ONLY", "disable_comment": True}
    result = tiktok_client.initialize_direct_post("token", post, video_path=video)
    assert result["publish_id"] == "p"
    assert captured["payload"]["post_info"] == post
    assert captured["payload"]["source_info"]["source"] == "FILE_UPLOAD"


def test_initialize_direct_post_requires_exactly_one_source(tmp_path):
    with pytest.raises(ValueError, match="exactly one"):
        tiktok_client.initialize_direct_post("token", {})
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x")
    with pytest.raises(ValueError, match="exactly one"):
        tiktok_client.initialize_direct_post("token", {}, video_path=video, video_url="https://x.test/v.mp4")
