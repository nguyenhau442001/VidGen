import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import vidgen.publisher as pub


def test_build_caption_brief_uses_topic_hook_and_key_scenes():
    source = {
        "title": "grab_dispatch_p1",
        "shots": [
            {
                "id": "hook",
                "type": "CharacterIconScene",
                "narration": "Grab không chọn tài xế gần nhất — nó chấm điểm họ như một kỳ thi",
            },
            {
                "id": "middle",
                "type": "ScoreCardScene",
                "narration": "Một điểm số ẩn quyết định ai thắng",
                "on_screen_text": "Điểm số ẩn",
            },
            {
                "id": "cta",
                "type": "QuoteCalloutScene",
                "narration": "Nhưng còn một yếu tố nữa chưa lộ ra",
            },
        ],
    }

    brief = pub._build_caption_brief(source, Path("remotion/out/grab_dispatch_p1.mp4"))

    assert brief["topic"] == "grab_dispatch_p1"
    assert brief["hook_narration"].startswith("Grab không chọn tài xế")
    assert len(brief["key_scenes"]) == 3
    assert "id=hook" in brief["key_scenes"][0]
    assert "id=middle" in brief["key_scenes"][1]
    assert "id=cta" in brief["key_scenes"][2]


def test_build_caption_brief_falls_back_to_source_filename_when_title_missing():
    source = {
        "shots": [
            {"id": "hook", "type": "GoogleMapsRevealScene", "narration": "Maps không chọn đường ngắn nhất."},
        ],
    }

    brief = pub._build_caption_brief(
        source,
        Path("remotion/out/video.mp4"),
        Path("content/script_maps_route_p2.json"),
    )

    assert brief["topic"] == "maps route p2"


def test_generate_tiktok_caption_calls_anthropic_and_composes_hashtags(tmp_path, monkeypatch):
    video = tmp_path / "grab_dispatch_p1.mp4"
    video.write_bytes(b"x" * 16)
    source = tmp_path / "grab_dispatch_p1.json"
    source.write_text(
        json.dumps(
            {
                "title": "Grab Dispatch",
                "shots": [
                    {"id": "hook", "narration": "Grab không chọn tài xế gần nhất."},
                    {"id": "reveal", "narration": "Nó chấm điểm từng tài xế một."},
                    {"id": "cta", "narration": "Và còn một biến số khác."},
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    with patch("vidgen.publisher.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(
                            {
                                "caption": "Grab không chọn gần nhất, mà chọn thông minh hơn.",
                                "hashtags": ["grab dispatch", "tech", "vietnam"],
                            },
                            ensure_ascii=False,
                        ),
                    }
                ]
            },
        )

        caption = pub._generate_tiktok_caption(video, source)

    assert caption == "Grab không chọn gần nhất, mà chọn thông minh hơn.\n#grabdispatch #tech #vietnam"

    args, kwargs = mock_post.call_args
    assert args[0] == pub.CAPTION_API_URL
    assert kwargs["json"]["system"] == pub.CAPTION_SYSTEM_PROMPT
    assert "TOPIC:\nGrab Dispatch" in kwargs["json"]["messages"][0]["content"]
    assert "HOOK NARRATION:\nGrab không chọn tài xế gần nhất." in kwargs["json"]["messages"][0]["content"]
    assert "id=hook" in kwargs["json"]["messages"][0]["content"]


def test_publish_tiktok_autogenerates_caption_when_title_missing(tmp_path, monkeypatch):
    video = tmp_path / "grab_dispatch_p1.mp4"
    video.write_bytes(b"x" * 32)
    source = tmp_path / "grab_dispatch_p1.json"
    source.write_text(
        json.dumps(
            {
                "title": "Grab Dispatch",
                "shots": [
                    {"id": "hook", "narration": "Grab không chọn tài xế gần nhất."},
                    {"id": "reveal", "narration": "Nó chấm điểm từng tài xế một."},
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    events = []

    monkeypatch.setattr(pub, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(
        pub,
        "_get_creator_info",
        lambda token: {"creator_username": "vidgen", "privacy_level_options": [pub.PRIVACY_PUBLIC]},
    )
    monkeypatch.setattr(pub, "_init_upload", lambda token, path, chunk_size: ("pid", "http://upload"))
    monkeypatch.setattr(pub, "_upload_chunks", lambda *args, **kwargs: events.append("upload"))
    monkeypatch.setattr(
        pub,
        "_generate_tiktok_caption",
        lambda video_path, source_path=None: events.append("generate") or "Auto caption #one #two #three",
    )
    monkeypatch.setattr(
        pub,
        "_publish",
        lambda access_token, publish_id, title, privacy, schedule_time: events.append(f"publish:{title}"),
    )
    monkeypatch.setattr(pub, "_poll_status", lambda token, pid: {"share_url": "https://tiktok.com/@me/video/1"})
    monkeypatch.setattr(pub, "_notify_github", lambda **kwargs: events.append("notify"))

    result = pub.publish_tiktok(video, title="", source_path=source)

    assert result == {"publish_id": "pid", "status": "PUBLISH_COMPLETE", "share_url": "https://tiktok.com/@me/video/1"}
    assert events == [
        "upload",
        "generate",
        "publish:Auto caption #one #two #three",
        "notify",
    ]


def test_publish_tiktok_auto_caption_flag_overrides_manual_title(tmp_path, monkeypatch):
    video = tmp_path / "grab_dispatch_p1.mp4"
    video.write_bytes(b"x" * 32)

    events = []

    monkeypatch.setattr(pub, "_get_valid_token", lambda: "tok")
    monkeypatch.setattr(
        pub,
        "_get_creator_info",
        lambda token: {"creator_username": "vidgen", "privacy_level_options": [pub.PRIVACY_PUBLIC]},
    )
    monkeypatch.setattr(pub, "_init_upload", lambda token, path, chunk_size: ("pid", "http://upload"))
    monkeypatch.setattr(pub, "_upload_chunks", lambda *args, **kwargs: events.append("upload"))
    monkeypatch.setattr(
        pub,
        "_generate_tiktok_caption",
        lambda video_path, source_path=None: events.append("generate") or "Generated caption #one #two #three",
    )
    monkeypatch.setattr(
        pub,
        "_publish",
        lambda access_token, publish_id, title, privacy, schedule_time: events.append(f"publish:{title}"),
    )
    monkeypatch.setattr(pub, "_poll_status", lambda token, pid: {"share_url": ""})
    monkeypatch.setattr(pub, "_notify_github", lambda **kwargs: events.append("notify"))

    pub.publish_tiktok(video, title="Manual caption", auto_caption=True)

    assert events == [
        "upload",
        "generate",
        "publish:Generated caption #one #two #three",
        "notify",
    ]


def test_cli_help_mentions_auto_caption_and_source():
    result = subprocess.run(
        [sys.executable, "-m", "vidgen.publisher", "--help"],
        capture_output=True,
        text=True,
        cwd=str(Path(__file__).parent.parent),
    )

    assert result.returncode == 0
    assert "--auto-caption" in result.stdout
    assert "--source" in result.stdout
