from pathlib import Path

import pytest

from vidgen.publishing import tiktok
from vidgen.publishing.common import PublishMetadata


class FakeResponse:
    ok = True
    status_code = 200
    text = ""

    def json(self):
        return {"draft_id": "draft-1", "publisher_url": "https://publisher.test/publisher?draft=draft-1"}


def test_build_handoff_requires_real_video(tmp_path):
    with pytest.raises(FileNotFoundError):
        tiktok.build_publisher_handoff(tmp_path / "missing.mp4")


def test_build_handoff_contains_editable_proposals(tmp_path):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"video")
    result = tiktok.build_publisher_handoff(
        video,
        title=" Title ",
        caption=" Caption ",
        hashtags=["#tech", "tech", "creator"],
        metadata={"content_id": "abc"},
    )
    assert result == {
        "video_path": str(video.resolve()),
        "title": "Title",
        "caption": "Caption",
        "hashtags": ["tech", "creator"],
        "metadata": {"source": "vidgen", "content_id": "abc"},
    }


def test_send_to_publisher_requires_server_configuration(tmp_path):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"video")
    with pytest.raises(RuntimeError, match="APP_URL"):
        tiktok.send_to_publisher(video, app_url="", handoff_secret="secret")
    with pytest.raises(RuntimeError, match="VIDGEN_HANDOFF_SECRET"):
        tiktok.send_to_publisher(video, app_url="https://publisher.test", handoff_secret="")


def test_send_to_publisher_creates_review_draft_only(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"video")
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json)
        return FakeResponse()

    monkeypatch.setattr(tiktok.requests, "post", fake_post)
    result = tiktok.send_to_publisher(
        video,
        title="A title",
        app_url="https://publisher.test",
        handoff_secret="secret",
    )
    assert captured["url"].endswith("/api/vidgen/handoff")
    assert captured["json"]["video_path"] == str(video.resolve())
    assert result["draft_id"] == "draft-1"


def test_direct_cli_publish_is_disabled():
    with pytest.raises(RuntimeError, match="creator can review"):
        tiktok.publish_tiktok("video.mp4", title="caption")


def test_adapter_returns_awaiting_review(tmp_path, monkeypatch):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"video")
    monkeypatch.setattr(tiktok, "send_to_publisher", lambda *a, **k: {
        "draft_id": "draft-1", "publisher_url": "https://publisher.test/publisher?draft=draft-1"
    })
    result = tiktok.publish_video_on_tiktok(
        video,
        PublishMetadata(title="Title", description="Caption", tags=["tech"]),
    )
    assert result["status"] == "awaiting_creator_review"
    assert result["url"].startswith("https://publisher.test/publisher")
