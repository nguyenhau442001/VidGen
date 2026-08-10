from cryptography.fernet import Fernet

from vidgen.publisher.store import PublisherStore


def test_tokens_are_encrypted_at_rest(tmp_path):
    store = PublisherStore(tmp_path / "publisher.db", Fernet.generate_key().decode())
    store.put_tokens("session", {"open_id": "creator", "access_token": "secret-access"})
    raw = (tmp_path / "publisher.db").read_bytes()
    assert b"secret-access" not in raw
    assert store.get_tokens("session")["access_token"] == "secret-access"


def test_draft_can_only_be_claimed_once_by_one_session(tmp_path):
    store = PublisherStore(tmp_path / "publisher.db", Fernet.generate_key().decode())
    store.put_draft("draft", "handoff", {"caption": "editable"})
    assert store.claim_draft("draft", "creator-a")["caption"] == "editable"
    assert store.claim_draft("draft", "creator-b") is None
