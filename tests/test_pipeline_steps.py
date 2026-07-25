import copy

from vidgen.pipeline.pipeline_steps import (
    DurationChange,
    TTSJob,
    build_tts_jobs,
    tighten_scene_durations,
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
