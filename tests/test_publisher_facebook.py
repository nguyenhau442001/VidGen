from unittest.mock import MagicMock, patch

import pytest

import vidgen.publisher_facebook as pub


def test_get_page_token_raises_when_no_token_saved(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "TOKENS_FILE", tmp_path / "none.json")
    with pytest.raises(RuntimeError, match="No Facebook Page access token"):
        pub._get_page_token()


def test_get_page_token_returns_existing_token(tmp_path, monkeypatch):
    tokens_file = tmp_path / "tokens.json"
    tokens_file.write_text('{"page_access_token": "page-tok", "page_id": "123"}')
    monkeypatch.setattr(pub, "TOKENS_FILE", tokens_file)
    assert pub._get_page_token() == "page-tok"
