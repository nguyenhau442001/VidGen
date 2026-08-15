import importlib
from urllib.parse import parse_qs, urlparse

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient


def make_client(tmp_path, monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-with-enough-entropy")
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("TIKTOK_MODE", "demo")
    monkeypatch.setenv("APP_URL", "http://testserver")
    monkeypatch.setenv("PUBLISHER_DB_PATH", str(tmp_path / "publisher.db"))
    monkeypatch.setenv("PUBLISHER_UPLOAD_DIR", str(tmp_path / "uploads"))
    import vidgen.publisher.app as publisher_app
    return TestClient(publisher_app.create_app())


def make_live_client(tmp_path, monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-with-enough-entropy")
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("TIKTOK_MODE", "live")
    monkeypatch.setenv("APP_URL", "https://publisher.test")
    monkeypatch.setenv("TIKTOK_CLIENT_KEY", "client-key")
    monkeypatch.setenv("TIKTOK_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("TIKTOK_REDIRECT_URI", "https://publisher.test/auth/tiktok/callback")
    monkeypatch.setenv("VIDGEN_HANDOFF_SECRET", "handoff-secret")
    monkeypatch.setenv("PUBLISHER_DB_PATH", str(tmp_path / "publisher.db"))
    monkeypatch.setenv("PUBLISHER_UPLOAD_DIR", str(tmp_path / "uploads"))
    import vidgen.publisher.app as publisher_app
    return TestClient(publisher_app.create_app(), base_url="https://publisher.test"), publisher_app


def test_public_review_urls_are_directly_accessible(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    for path in ("/", "/features", "/publisher", "/privacy", "/terms"):
        response = client.get(path)
        assert response.status_code == 200


def test_demo_mode_is_explicit_and_never_publishes(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    assert client.get("/api/publisher/config").json()["mode"] == "demo"
    assert client.get("/auth/tiktok", follow_redirects=False).status_code == 303
    creator = client.post("/api/tiktok/creator-info").json()
    assert creator["demo"] is True
    response = client.post("/api/tiktok/publish", json={
        "video_id": "none", "caption": "", "privacy_level": "SELF_ONLY", "confirmed": True
    })
    assert response.status_code == 409
    assert "never sends" in response.json()["detail"]


def test_live_publish_uses_fresh_creator_constraints_and_creator_choices(tmp_path, monkeypatch):
    client, publisher_app = make_live_client(tmp_path, monkeypatch)
    monkeypatch.setattr(publisher_app.tiktok_client, "exchange_code", lambda *args: {
        "access_token": "access", "refresh_token": "refresh", "expires_in": 86400,
        "open_id": "creator-id", "scope": "user.info.basic, video.publish",
    })
    creator_calls = []

    def creator_info(_token):
        creator_calls.append(True)
        return {
            "creator_nickname": "Creator One",
            "creator_username": "creator_one",
            "privacy_level_options": ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
            "comment_disabled": False,
            "duet_disabled": True,
            "stitch_disabled": False,
            "max_video_post_duration_sec": 60,
        }

    monkeypatch.setattr(publisher_app.tiktok_client, "query_creator_info", creator_info)
    captured = {}
    monkeypatch.setattr(
        publisher_app.tiktok_client,
        "initialize_direct_post",
        lambda token, post_info, **source: captured.update(
            token=token, post_info=post_info, source=source
        ) or {"publish_id": "publish-1"},
    )

    auth = client.get("/auth/tiktok", follow_redirects=False)
    state = parse_qs(urlparse(auth.headers["location"]).query)["state"][0]
    callback = client.get(
        f"/auth/tiktok/callback?code=code&state={state}", follow_redirects=False
    )
    assert callback.status_code == 303

    handoff = client.post(
        "/api/vidgen/handoff",
        headers={"X-VidGen-Handoff-Secret": "handoff-secret"},
        json={
            "video_url": "https://publisher.test/media/video.mp4",
            "title": "Original title",
            "caption": "Editable proposal",
            "hashtags": ["creator"],
            "metadata": {"duration_sec": 45},
        },
    ).json()
    draft = client.post(f"/api/publisher/drafts/{handoff['draft_id']}/claim").json()

    rejected = client.post("/api/tiktok/publish", json={
        "video_id": draft["video_id"], "caption": "Creator edit", "privacy_level": "PUBLIC_TO_EVERYONE",
        "allow_duet": True, "confirmed": True,
    })
    assert rejected.status_code == 400
    assert "not supported" in rejected.json()["detail"]

    accepted = client.post("/api/tiktok/publish", json={
        "video_id": draft["video_id"], "caption": "Creator edit #creator",
        "privacy_level": "PUBLIC_TO_EVERYONE", "allow_comment": True,
        "allow_stitch": True, "confirmed": True,
    })
    assert accepted.status_code == 200
    assert len(creator_calls) == 2  # one fresh query for each publish attempt
    assert captured["post_info"] == {
        "title": "Creator edit #creator",
        "privacy_level": "PUBLIC_TO_EVERYONE",
        "disable_comment": False,
        "disable_duet": True,
        "disable_stitch": False,
        "brand_content_toggle": False,
        "brand_organic_toggle": False,
        "is_aigc": False,
    }
    assert captured["source"]["video_url"] == "https://publisher.test/media/video.mp4"
