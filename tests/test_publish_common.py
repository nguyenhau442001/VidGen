import json
from unittest.mock import MagicMock, patch

from vidgen.publish_common import PublishMetadata, load_tokens, save_tokens, notify_github


def test_publish_metadata_defaults():
    m = PublishMetadata(title="Hello")
    assert m.description == ""
    assert m.tags == []
    assert m.privacy == "public"
    assert m.made_for_kids is False
    assert m.schedule_time is None


def test_load_tokens_missing_file_returns_empty_dict(tmp_path):
    assert load_tokens(tmp_path / "nope.json") == {}


def test_save_then_load_tokens_roundtrip(tmp_path):
    path = tmp_path / "tokens.json"
    save_tokens(path, {"access_token": "abc", "refresh_token": "xyz"})
    assert load_tokens(path) == {"access_token": "abc", "refresh_token": "xyz"}
    assert json.loads(path.read_text())["access_token"] == "abc"


def test_notify_github_skips_when_repo_or_token_missing(capsys):
    notify_github("v.mp4", "youtube", "OK", github_repo="", github_token="")
    assert "skipped" in capsys.readouterr().out


@patch("vidgen.publish_common.requests.post")
def test_notify_github_posts_workflow_dispatch_with_platform_and_extra(mock_post):
    mock_post.return_value = MagicMock(status_code=204)

    notify_github(
        "v.mp4", "youtube", "OK",
        github_repo="me/repo", github_token="tok",
        extra={"video_id": "abc123"},
    )

    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.github.com/repos/me/repo/actions/workflows/notify.yml/dispatches"
    assert kwargs["json"]["inputs"] == {
        "video_name": "v.mp4", "platform": "youtube", "status": "OK", "video_id": "abc123",
    }
    assert kwargs["headers"]["Authorization"] == "Bearer tok"


@patch("vidgen.publish_common.requests.post")
def test_notify_github_nonfatal_on_non_204(mock_post, capsys):
    mock_post.return_value = MagicMock(status_code=500, text="boom")
    notify_github("v.mp4", "youtube", "FAIL: x", github_repo="me/repo", github_token="tok")
    assert "non-fatal" in capsys.readouterr().out


@patch("vidgen.publish_common.requests.post", side_effect=Exception("network down"))
def test_notify_github_swallows_request_exceptions(mock_post, capsys):
    notify_github("v.mp4", "youtube", "OK", github_repo="me/repo", github_token="tok")
    assert "non-fatal" in capsys.readouterr().out
