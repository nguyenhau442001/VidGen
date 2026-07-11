from unittest.mock import MagicMock, patch

import pytest

import vidgen.publisher_youtube as pub


def test_refresh_access_token_returns_new_access_token(monkeypatch):
    monkeypatch.setattr(pub, "YOUTUBE_CLIENT_ID", "cid")
    monkeypatch.setattr(pub, "YOUTUBE_CLIENT_SECRET", "csecret")

    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"access_token": "new-access", "expires_in": 3600},
        )
        result = pub._refresh_access_token("refresh-tok")

    assert result == {"access_token": "new-access", "refresh_token": "refresh-tok", "expires_in": 3600}


def test_refresh_access_token_raises_on_failure():
    with patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {"error": "invalid_grant"})
        with pytest.raises(RuntimeError, match="Token refresh failed"):
            pub._refresh_access_token("bad-tok")


def test_get_valid_token_raises_when_no_token_saved(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "TOKENS_FILE", tmp_path / "none.json")
    with pytest.raises(RuntimeError, match="No YouTube access token"):
        pub._get_valid_token()


def test_get_valid_token_returns_existing_token_when_valid(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"access_token": "good-tok", "refresh_token": "r"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)

    with patch("vidgen.publisher_youtube.requests.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        token = pub._get_valid_token()

    assert token == "good-tok"


def test_get_valid_token_refreshes_on_401(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"access_token": "expired-tok", "refresh_token": "r"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)

    with patch("vidgen.publisher_youtube.requests.get") as mock_get, \
         patch("vidgen.publisher_youtube.requests.post") as mock_post:
        mock_get.return_value = MagicMock(status_code=401)
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "fresh-tok", "expires_in": 3600})

        token = pub._get_valid_token()

    assert token == "fresh-tok"
    assert __import__("json").loads(tokens_file.read_text())["access_token"] == "fresh-tok"
