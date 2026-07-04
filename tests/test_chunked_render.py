import os
import time

from vidgen.chunked_render import (
    audio_cache_key,
    code_tree_hash,
    prune_cache,
    scene_cache_key,
    write_concat_list,
)

MANIFEST = {"fps": 30, "width": 1080, "height": 1920, "scenes": []}


def _scene(**overrides):
    scene = {
        "id": 3,
        "label": "shot_02b",
        "sceneName": "shot_02",
        "type": "map_ping",
        "audioPath": "audio/scene_shot_02b.wav",
        "audioOffsetFrames": 0,
        "extraAudio": [],
        "durationInFrames": 120,
        "caption": "Tài xế gần nhất",
        "captionStyle": None,
        "visual": {"drivers": [{"x": 0.5, "y": 0.5, "label": "200m"}]},
    }
    scene.update(overrides)
    return scene


def test_cache_key_ignores_position_only_keys():
    a = scene_cache_key(_scene(), MANIFEST, "code")
    b = scene_cache_key(_scene(id=7, label="shot_09z", sceneName="shot_09"), MANIFEST, "code")
    assert a == b


def test_cache_key_changes_with_visual_content():
    a = scene_cache_key(_scene(), MANIFEST, "code")
    b = scene_cache_key(_scene(caption="Khác"), MANIFEST, "code")
    c = scene_cache_key(_scene(durationInFrames=150), MANIFEST, "code")
    d = scene_cache_key(_scene(), MANIFEST, "other-code")
    e = scene_cache_key(_scene(), {**MANIFEST, "width": 720}, "code")
    assert len({a, b, c, d, e}) == 5


def test_cache_key_is_stable_across_dict_ordering():
    scene = _scene()
    reordered = dict(reversed(list(scene.items())))
    assert scene_cache_key(scene, MANIFEST, "code") == scene_cache_key(reordered, MANIFEST, "code")


def test_code_tree_hash_changes_when_source_changes(tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.tsx").write_text("export const A = 1;")
    before = code_tree_hash(str(tmp_path))
    (src / "a.tsx").write_text("export const A = 2;")
    assert code_tree_hash(str(tmp_path)) != before


def test_write_concat_list_escapes_quotes(tmp_path):
    list_path = tmp_path / "list.txt"
    write_concat_list(["/tmp/plain.mp4", "/tmp/it's.mp4"], str(list_path))
    lines = list_path.read_text().splitlines()
    assert lines[0] == "file '/tmp/plain.mp4'"
    assert lines[1] == "file '/tmp/it'\\''s.mp4'"


def test_prune_cache_removes_only_stale_cache_entries(tmp_path):
    fresh = tmp_path / "scene_fresh.mp4"
    stale = tmp_path / "scene_stale.mp4"
    stale_audio = tmp_path / "audio_stale.wav"
    other = tmp_path / "concat_list.txt"
    for p in (fresh, stale, stale_audio, other):
        p.write_bytes(b"x")
    old = time.time() - 30 * 86400
    for p in (stale, stale_audio, other):
        os.utime(p, (old, old))

    prune_cache(str(tmp_path), max_age_days=14)

    assert fresh.exists()
    assert not stale.exists()
    assert not stale_audio.exists()
    assert other.exists()  # only cache chunks/audio are pruned


def _audio_manifest(tmp_path, wav_bytes=b"RIFFxxxx", duration=120, caption="A"):
    public_audio = tmp_path / "public" / "audio"
    public_audio.mkdir(parents=True, exist_ok=True)
    (public_audio / "scene_1.wav").write_bytes(wav_bytes)
    return {
        "fps": 30,
        "width": 1080,
        "height": 1920,
        "scenes": [
            {
                "id": 1,
                "audioPath": "audio/scene_1.wav",
                "audioOffsetFrames": 0,
                "extraAudio": [],
                "durationInFrames": duration,
                "caption": caption,
                "visual": {},
            }
        ],
    }


def test_audio_cache_key_ignores_visual_only_changes(tmp_path):
    a = audio_cache_key(_audio_manifest(tmp_path, caption="A"), str(tmp_path))
    b = audio_cache_key(_audio_manifest(tmp_path, caption="B"), str(tmp_path))
    assert a == b


def test_audio_cache_key_tracks_timing_and_wav_content(tmp_path):
    base = audio_cache_key(_audio_manifest(tmp_path), str(tmp_path))
    longer = audio_cache_key(_audio_manifest(tmp_path, duration=150), str(tmp_path))
    new_wav = audio_cache_key(_audio_manifest(tmp_path, wav_bytes=b"RIFFyyyy"), str(tmp_path))
    assert len({base, longer, new_wav}) == 3
