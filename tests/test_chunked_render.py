import os
import struct
import time
import wave

from vidgen.chunked_render import (
    build_audio_track,
    code_tree_hash,
    prune_cache,
    scene_cache_key,
    write_concat_list,
)

MANIFEST = {"fps": 30, "width": 1080, "height": 1920, "shots": []}


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


def _write_wav(path, samples):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(48000)
        w.writeframes(struct.pack(f"<{len(samples)}h", *samples))


def _read_wav(path):
    """Returns (per-channel sample lists, channel count)."""
    with wave.open(str(path)) as w:
        n = w.getnchannels()
        data = struct.unpack(f"<{w.getnframes() * n}h", w.readframes(w.getnframes()))
    return [data[c::n] for c in range(n)], n


def _audio_manifest(tmp_path, scenes):
    (tmp_path / "public" / "audio").mkdir(parents=True, exist_ok=True)
    return {"fps": 30, "width": 1080, "height": 1920, "shots": scenes}


def test_build_audio_track_places_clips_on_the_frame_grid(tmp_path):
    # impulse at the clip's first sample; offset 3 frames into a 30-frame scene
    manifest = _audio_manifest(
        tmp_path,
        [
            {
                "id": 1,
                "audioPath": "audio/a.wav",
                "audioOffsetFrames": 3,
                "extraAudio": [],
                "durationInFrames": 30,
                "visual": {},
            }
        ],
    )
    _write_wav(tmp_path / "public" / "audio" / "a.wav", [10000] + [0] * 99)
    out = tmp_path / "track.wav"

    build_audio_track(manifest, str(out), str(tmp_path))

    channels, n = _read_wav(out)
    assert n == 2
    assert len(channels[0]) == 30 * 1600  # exactly durationInFrames long
    for ch in channels:  # mono upmixed to both channels at -3dB (pan law)
        assert abs(ch[3 * 1600] - 7071) <= 1
        assert sum(abs(s) for s in ch) == abs(ch[3 * 1600])  # silence everywhere else


def test_build_audio_track_truncates_clips_at_scene_end(tmp_path):
    # 1s clip inside a 6-frame scene must not bleed into the next scene
    manifest = _audio_manifest(
        tmp_path,
        [
            {
                "id": 1,
                "audioPath": "audio/long.wav",
                "audioOffsetFrames": 0,
                "extraAudio": [],
                "durationInFrames": 6,
                "visual": {},
            },
            {"id": 2, "audioPath": "", "extraAudio": [], "durationInFrames": 6, "visual": {}},
        ],
    )
    _write_wav(tmp_path / "public" / "audio" / "long.wav", [5000] * 48000)
    out = tmp_path / "track.wav"

    build_audio_track(manifest, str(out), str(tmp_path))

    left = _read_wav(out)[0][0]
    assert len(left) == 12 * 1600
    assert all(abs(s - 3536) <= 1 for s in left[: 6 * 1600])  # 5000 * 2**-0.5
    assert all(s == 0 for s in left[6 * 1600 :])


def test_build_audio_track_sums_overlapping_clips_without_normalizing(tmp_path):
    manifest = _audio_manifest(
        tmp_path,
        [
            {
                "id": 1,
                "audioPath": "audio/a.wav",
                "audioOffsetFrames": 0,
                "extraAudio": [{"path": "audio/b.wav", "previewPath": "audio/b.mp3", "offsetFrames": 0}],
                "durationInFrames": 30,
                "visual": {},
            }
        ],
    )
    _write_wav(tmp_path / "public" / "audio" / "a.wav", [10000] + [0] * 99)
    _write_wav(tmp_path / "public" / "audio" / "b.wav", [10000] + [0] * 99)
    out = tmp_path / "track.wav"

    build_audio_track(manifest, str(out), str(tmp_path))

    assert abs(_read_wav(out)[0][0][0] - 14142) <= 2  # 2 * 10000 * 2**-0.5, unnormalized


def test_build_audio_track_mixes_global_soundtrack_at_configured_volume(tmp_path):
    manifest = _audio_manifest(
        tmp_path,
        [{"id": 1, "audioPath": "", "extraAudio": [], "durationInFrames": 30, "visual": {}}],
    )
    manifest["soundtrack"] = {"path": "audio/bed.wav", "volume": 0.25}
    _write_wav(tmp_path / "public" / "audio" / "bed.wav", [10000] * 48000)
    out = tmp_path / "track.wav"

    build_audio_track(manifest, str(out), str(tmp_path))

    left = _read_wav(out)[0][0]
    assert len(left) == 30 * 1600
    assert all(abs(sample - 1768) <= 2 for sample in left)  # 10000 * -3dB pan law * 0.25
