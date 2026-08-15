from pathlib import Path

from vidgen.pipeline.pipeline_state import (
    PipelineState,
    compute_input_hash,
    load_state,
    save_state,
)


def test_hash_is_stable_for_same_input():
    a = compute_input_hash({"x": 1, "y": [1, 2]})
    b = compute_input_hash({"x": 1, "y": [1, 2]})
    assert a == b


def test_hash_changes_with_input():
    a = compute_input_hash({"x": 1})
    b = compute_input_hash({"x": 2})
    assert a != b


def test_hash_stable_regardless_of_dict_key_order():
    a = compute_input_hash({"x": 1, "y": 2})
    b = compute_input_hash({"y": 2, "x": 1})
    assert a == b


def test_load_state_missing_file_returns_empty(tmp_path):
    state = load_state(tmp_path / "does_not_exist.json")
    assert state.get("any_step") is None


def test_save_then_load_round_trip(tmp_path):
    path = tmp_path / "state.json"
    state = PipelineState(steps={})
    state.set("synthesize_tts", "hash123", {"job_ids": ["a", "b"]})
    save_state(state, path)

    loaded = load_state(path)
    entry = loaded.get("synthesize_tts")
    assert entry == {"input_hash": "hash123", "result": {"job_ids": ["a", "b"]}}


def test_load_state_malformed_json_returns_empty(tmp_path):
    path = tmp_path / "state.json"
    path.write_text("not json", encoding="utf-8")
    state = load_state(path)
    assert state.get("any_step") is None
