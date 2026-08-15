from vidgen.pipeline.pipeline_steps import should_skip_tts


def test_should_skip_tts_hash_match_and_files_present():
    state_entry = {"input_hash": "abc123"}
    assert should_skip_tts(state_entry, "abc123", wav_files_present=True) is True


def test_should_skip_tts_hash_match_but_file_missing():
    state_entry = {"input_hash": "abc123"}
    assert should_skip_tts(state_entry, "abc123", wav_files_present=False) is False


def test_should_skip_tts_hash_mismatch_even_if_files_present():
    state_entry = {"input_hash": "old-hash"}
    assert should_skip_tts(state_entry, "new-hash", wav_files_present=True) is False


def test_should_skip_tts_no_prior_state_entry():
    assert should_skip_tts(None, "abc123", wav_files_present=True) is False
