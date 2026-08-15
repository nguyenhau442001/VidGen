import copy
import wave
from unittest.mock import patch

import pytest

from vidgen.audio.speech_synthesizer import fit_wav_to_duration
from vidgen.pipeline.pipeline_steps import (
    DurationChange,
    TTSJob,
    build_tts_jobs,
    load_and_validate_script,
    measure_audio_durations,
    measure_media_durations,
    synthesize_tts,
    tighten_scene_durations,
)
from vidgen.pipeline.pipeline_steps import (
    check_dead_air,
    check_footage_fit,
    render_video,
    score_and_write_beatmap,
    write_manifest_step,
)


def _script(shots, fps=30):
    return {"title": "Test", "fps": fps, "shots": shots}


def test_build_tts_jobs_narration_only():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Xin chào."},
    ])
    jobs = build_tts_jobs(script, base_speed=1.1)
    assert jobs == [TTSJob(id="s1", text="Xin chào.", speed=1.1)]


def test_build_tts_jobs_per_scene_speed_override():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "Chậm hơn.", "tts_speed": 0.9},
    ])
    jobs = build_tts_jobs(script, base_speed=1.1)
    assert jobs[0].speed == 0.9


def test_build_tts_jobs_narration_per_criterion():
    script = _script([
        {
            "id": "s1", "type": "stat_comparator",
            "narration_per_criterion": [{"text": "Một."}, {"text": "Hai."}],
        },
    ])
    jobs = build_tts_jobs(script, base_speed=1.0)
    ids = [j.id for j in jobs]
    assert ids == ["s1_seg0", "s1_seg1"]
    assert [j.text for j in jobs] == ["Một.", "Hai."]


def test_build_tts_jobs_dialogue_skips_muted_and_empty():
    script = _script([
        {
            "id": "s1", "type": "wall_portal",
            "props": {
                "dialogue": [
                    {"text": "Nói."},
                    {"text": "Im lặng.", "mute": True},
                    {"text": ""},
                ]
            },
        },
    ])
    jobs = build_tts_jobs(script, base_speed=1.0)
    assert [j.id for j in jobs] == ["s1_dlg0"]
    assert jobs[0].text == "Nói."


def test_tighten_scene_durations_shrinks_when_audio_shorter():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Ngắn.",
            "duration_frames": 300, "transition_out_delay_frames": 15,
        },
    ])
    jobs = [TTSJob(id="s1", text="Ngắn.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 2.0}, fps=30, jobs=jobs
    )
    # offset(0) + ceil(2.0*30)=60 + tail(15) = 75, less than 300
    assert new_script["shots"][0]["duration_frames"] == 75
    assert changes == [DurationChange("s1", 300, 75)]


def test_tighten_scene_durations_never_grows_beyond_original():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Dài.",
            "duration_frames": 60, "transition_out_delay_frames": 15,
        },
    ])
    jobs = [TTSJob(id="s1", text="Dài.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 5.0}, fps=30, jobs=jobs
    )
    assert new_script["shots"][0]["duration_frames"] == 60
    assert changes == []


def test_tighten_scene_durations_skips_dialogue_scenes():
    script = _script([
        {
            "id": "s1", "type": "wall_portal", "narration": "N.",
            "duration_frames": 300,
            "props": {"dialogue": [{"text": "x", "start_frame": 10}]},
        },
    ])
    jobs = [TTSJob(id="s1", text="N.", speed=1.0)]
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 1.0}, fps=30, jobs=jobs
    )
    assert new_script["shots"][0]["duration_frames"] == 300
    assert changes == []


def test_tighten_scene_durations_skips_real_footage_shots():
    # real_footage duration is fully determined by the clip itself (measured
    # via ffprobe into audio_durations), not a tightenable narration window —
    # tightening it would add a de-facto freeze-frame tail past the clip's
    # real end, which the feature forbids.
    script = _script([
        {
            "id": "s1", "type": "real_footage",
            "duration_frames": 300,
            "props": {"mediaPath": "clip.mp4", "useOriginalAudio": True},
        },
    ])
    jobs = []
    new_script, changes = tighten_scene_durations(
        script, audio_durations={"s1": 2.0}, fps=30, jobs=jobs
    )
    assert new_script["shots"][0]["duration_frames"] == 300
    assert changes == []


def test_tighten_scene_durations_does_not_mutate_input():
    script = _script([
        {
            "id": "s1", "type": "explanation", "narration": "Ngắn.",
            "duration_frames": 300, "transition_out_delay_frames": 15,
        },
    ])
    original = copy.deepcopy(script)
    jobs = [TTSJob(id="s1", text="Ngắn.", speed=1.0)]
    tighten_scene_durations(script, audio_durations={"s1": 2.0}, fps=30, jobs=jobs)
    assert script == original


def _write_wav(path, seconds, sr=24000):
    path.parent.mkdir(parents=True, exist_ok=True)
    n_frames = int(seconds * sr)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"\x00\x00" * n_frames)


def test_load_and_validate_script_strips_thumbnail_shot(tmp_path):
    import json

    script_path = tmp_path / "script.json"
    script_path.write_text(
        json.dumps(
            {
                "fps": 30,
                "shots": [
                    {"id": "cover", "type": "HSKFlashCardThumbnailScene"},
                    {"id": "s1", "type": "explanation", "narration": "N."},
                ],
            }
        ),
        encoding="utf-8",
    )
    result = load_and_validate_script(str(script_path), skip_validation=True)
    ids = [s["id"] for s in result.script["shots"]]
    assert ids == ["s1"]


def test_load_and_validate_script_enforces_audio_source_invariant_even_with_skip_validation(tmp_path):
    import json

    script_path = tmp_path / "script.json"
    script_path.write_text(
        json.dumps(
            {
                "fps": 30,
                "shots": [
                    {
                        "id": "s1", "type": "real_footage",
                        "props": {"mediaPath": "clip.mp4"},
                        # no narration, no useOriginalAudio -> no audio source
                    },
                ],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError) as ctx:
        load_and_validate_script(str(script_path), skip_validation=True)
    assert "s1" in str(ctx.value)


def test_load_and_validate_script_enforces_media_path_invariant_even_with_skip_validation(tmp_path):
    import json

    script_path = tmp_path / "script.json"
    script_path.write_text(
        json.dumps(
            {
                "fps": 30,
                "shots": [
                    {
                        "id": "s1", "type": "screenshot",
                        "narration": "Xem giao diện.",
                        "props": {},  # no imagePath
                    },
                ],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError) as ctx:
        load_and_validate_script(str(script_path), skip_validation=True)
    assert "s1" in str(ctx.value)


def test_measure_audio_durations_reads_wav_headers(tmp_path):
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.5)
    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    durations = measure_audio_durations(jobs, str(wav_dir))
    assert durations["s1"] == pytest.approx(1.5, abs=0.01)


def test_fit_wav_to_duration_idempotent_on_rerun(tmp_path):
    # Pins the checkpoint-skip safety invariant: re-running fit against an
    # already-fitted WAV must be a no-op, since a re-run skips synthesize_tts
    # but still calls fit_durations() unconditionally.
    wav_path = tmp_path / "scene_s1.wav"
    _write_wav(wav_path, seconds=2.0)

    first_duration, _ = fit_wav_to_duration(wav_path, max_duration_seconds=1.6)
    second_duration, second_speed = fit_wav_to_duration(wav_path, max_duration_seconds=1.6)

    assert second_duration == pytest.approx(first_duration, abs=0.01)
    assert second_speed == 1.0


def test_synthesize_tts_reuse_skips_existing(tmp_path, monkeypatch):
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.0)

    def fail_if_called(*a, **kw):
        raise AssertionError("tts_synthesize should not be called when reusing")

    monkeypatch.setattr("vidgen.pipeline.pipeline_steps.tts_synthesize", fail_if_called)

    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    result = synthesize_tts(
        jobs,
        wav_dir=str(wav_dir),
        tts_voice="v",
        reuse_tts=True,
        prebuilt_audio_dir=None,
        no_trim=False,
        target_dbfs=-15.0,
    )
    assert result.job_ids == ["s1"]


def test_synthesize_tts_prebuilt_missing_raises(tmp_path):
    wav_dir = tmp_path / "wav"
    prebuilt_dir = tmp_path / "prebuilt"
    prebuilt_dir.mkdir()
    jobs = [TTSJob(id="s1", text="x", speed=1.0)]
    with pytest.raises(FileNotFoundError):
        synthesize_tts(
            jobs,
            wav_dir=str(wav_dir),
            tts_voice="v",
            reuse_tts=False,
            prebuilt_audio_dir=str(prebuilt_dir),
            no_trim=False,
            target_dbfs=-15.0,
        )


def test_write_manifest_step_writes_file_and_copies_audio(tmp_path):
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.", "visual": {"headline": "H"}},
    ])
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.0)
    public_audio = tmp_path / "public_audio"
    manifest_path = tmp_path / "output" / "render_manifest.json"

    result = write_manifest_step(
        script,
        audio_durations={"s1": 1.0},
        manifest_path=str(manifest_path),
        wav_dir=str(wav_dir),
        remotion_public_audio=str(public_audio),
        audio_ids=["s1"],
    )
    assert manifest_path.exists()
    assert result.audio_ids_copied == 1
    assert (public_audio / "scene_s1.wav").exists()


def test_write_manifest_step_copies_media_when_present(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")

    wav_dir = tmp_path / "wav"
    wav_dir.mkdir()
    public_audio = tmp_path / "pub_audio"
    public_video = tmp_path / "pub_video"
    public_images = tmp_path / "pub_images"
    manifest_path = tmp_path / "manifest.json"

    script = {
        "fps": 30,
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
                "duration_frames": 90,
            }
        ],
    }

    result = write_manifest_step(
        script, {}, str(manifest_path), str(wav_dir), str(public_audio), [],
        media_dir=str(media_dir),
        remotion_public_video=str(public_video),
        remotion_public_images=str(public_images),
    )

    assert (public_video / "clip.mp4").exists()
    assert result.media_copied == ["video/clip.mp4"]


def test_write_manifest_step_without_media_args_is_unaffected(tmp_path):
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.", "visual": {"headline": "H"}},
    ])
    wav_dir = tmp_path / "wav"
    _write_wav(wav_dir / "scene_s1.wav", seconds=1.0)
    public_audio = tmp_path / "public_audio"
    manifest_path = tmp_path / "output" / "render_manifest.json"

    result = write_manifest_step(
        script,
        {"s1": 1.0},
        str(manifest_path),
        str(wav_dir),
        str(public_audio),
        ["s1"],
    )

    assert manifest_path.exists()
    assert result.audio_ids_copied == 1
    assert result.media_copied == []
    assert (public_audio / "scene_s1.wav").exists()


def test_score_and_write_beatmap_writes_file(tmp_path):
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.",
         "duration_frames": 150, "visual": {"headline": "H"}},
    ])
    from vidgen.pipeline.render_manifest_builder import build_render_manifest
    manifest = build_render_manifest(script, {"s1": 1.0})
    beatmap_path = tmp_path / "beatmap.json"

    result = score_and_write_beatmap(script, manifest, str(beatmap_path))
    assert beatmap_path.exists()
    assert "video_title" in result.beatmap
    assert isinstance(result.report, str) and result.report


def test_check_dead_air_returns_findings_list():
    script = _script([
        {"id": "s1", "type": "explanation", "narration": "N.",
         "duration_frames": 150, "visual": {"headline": "H"}},
    ])
    from vidgen.pipeline.render_manifest_builder import build_render_manifest
    manifest = build_render_manifest(script, {"s1": 0.5})
    result = check_dead_air(script, manifest, audio_durations={"s1": 0.5})
    assert isinstance(result.findings, list)


def test_render_video_deletes_stale_output(tmp_path, monkeypatch):
    video_output = tmp_path / "out.mp4"
    video_output.write_text("stale")

    calls = []
    monkeypatch.setattr(
        "vidgen.pipeline.pipeline_steps.render_video_chunked",
        lambda manifest, out: calls.append(out),
    )
    result = render_video({"shots": []}, str(video_output))
    assert not video_output.exists()  # deleted before render_video_chunked ran
    assert calls == [str(video_output)]
    assert result.video_output == str(video_output)


def test_measure_media_durations_only_real_footage_with_original_audio(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")

    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
            },
            {
                "id": "s2", "type": "real_footage",
                "narration": "Có TTS nên không cần đo.",
                "props": {"mediaPath": "video/clip.mp4"},
            },
            {"id": "s3", "type": "explanation", "props": {}},
        ]
    }

    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=4.2):
        durations = measure_media_durations(script, str(media_dir))

    assert durations == {"s1": 4.2}


def test_measure_media_durations_empty_when_no_original_audio_shots(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {"shots": [{"id": "s1", "type": "explanation", "props": {}}]}
    assert measure_media_durations(script, str(media_dir)) == {}


def test_check_footage_fit_passes_when_narration_fits(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "narration": "Một hai ba bốn.",  # 4 words / 4.2 wps ≈ 0.95s
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ]
    }
    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=5.0):
        check_footage_fit(script, str(media_dir))  # should not raise


def test_check_footage_fit_raises_when_narration_overruns_clip(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    (media_dir / "clip.mp4").write_bytes(b"fake")
    long_narration = " ".join(["từ"] * 40)  # 40 words / 4.2 wps ≈ 9.5s
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "narration": long_narration,
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ]
    }
    with patch("vidgen.pipeline.pipeline_steps._ffprobe_duration_seconds", return_value=2.0):
        try:
            check_footage_fit(script, str(media_dir))
            assert False, "expected ValueError"
        except ValueError as e:
            msg = str(e)
            assert "s1" in msg
            assert "2.0" in msg or "2.00" in msg


def test_measure_media_durations_missing_file_raises_file_not_found(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()  # no clip.mp4 inside

    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
            }
        ]
    }

    with pytest.raises(FileNotFoundError) as ctx:
        measure_media_durations(script, str(media_dir))
    msg = str(ctx.value)
    assert "s1" in msg
    assert "clip.mp4" in msg


def test_check_footage_fit_missing_file_raises_file_not_found(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()  # no clip.mp4 inside

    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "narration": "Một hai ba.",
                "props": {"mediaPath": "video/clip.mp4"},
            }
        ]
    }

    with pytest.raises(FileNotFoundError) as ctx:
        check_footage_fit(script, str(media_dir))
    msg = str(ctx.value)
    assert "s1" in msg
    assert "clip.mp4" in msg


def test_check_footage_fit_skips_shots_without_narration(tmp_path):
    media_dir = tmp_path / "media"
    media_dir.mkdir()
    script = {
        "shots": [
            {
                "id": "s1", "type": "real_footage",
                "props": {"mediaPath": "video/clip.mp4", "useOriginalAudio": True},
            }
        ]
    }
    check_footage_fit(script, str(media_dir))  # should not raise, no ffprobe call needed
