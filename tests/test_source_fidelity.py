import json

import pytest

from vidgen.quality.source_fidelity import (
    audit_source_fidelity,
    extract_voiceover_scenes,
)


SOURCE = """# VIDEO

## Cảnh 1 — Hook

**Hình ảnh:**

Một bản đồ.

**Voice-over:**

“Câu đầu tiên.”

“Câu thứ hai.”

---

## Cảnh 2 — Kết

**Voice-over:**

“Một câu
nằm trên hai dòng.”

**Chữ kết và Voice-over:**

**“Câu kết giữ nguyên.”**
"""


def _write_pair(tmp_path, narrations):
    source_dir = tmp_path / "text"
    source_dir.mkdir()
    source_path = source_dir / "demo.txt"
    json_path = tmp_path / "demo.json"
    source_path.write_text(SOURCE, encoding="utf-8")
    json_path.write_text(
        json.dumps(
            {
                "shots": [
                    {"id": f"shot_{index}", "narration": narration}
                    for index, narration in enumerate(narrations, start=1)
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return source_path, json_path


def test_extract_voiceover_scenes_combines_blocks_in_scene_order():
    assert extract_voiceover_scenes(SOURCE) == [
        "Câu đầu tiên. Câu thứ hai.",
        "Một câu nằm trên hai dòng. Câu kết giữ nguyên.",
    ]


def test_audit_source_fidelity_accepts_whitespace_only_differences(tmp_path):
    source_path, json_path = _write_pair(
        tmp_path,
        [
            "Câu đầu tiên.   Câu thứ hai.",
            "Một câu nằm trên hai dòng.\nCâu kết giữ nguyên.",
        ],
    )

    result = audit_source_fidelity(source_path, json_path)

    assert result["status"] == "PASS"
    assert result["narrated_scenes"] == 2


def test_audit_source_fidelity_rejects_reworded_narration(tmp_path):
    source_path, json_path = _write_pair(
        tmp_path,
        ["Câu đầu tiên. Câu thứ hai.", "Câu kết đã bị sửa."],
    )

    with pytest.raises(ValueError, match="narration 2 differs"):
        audit_source_fidelity(source_path, json_path)


def test_audit_source_fidelity_requires_matching_filename_stems(tmp_path):
    source_path, json_path = _write_pair(
        tmp_path,
        [
            "Câu đầu tiên. Câu thứ hai.",
            "Một câu nằm trên hai dòng. Câu kết giữ nguyên.",
        ],
    )
    renamed_json = json_path.with_name("other.json")
    json_path.rename(renamed_json)

    with pytest.raises(ValueError, match="filename stems differ"):
        audit_source_fidelity(source_path, renamed_json)
