"""Checkpoint state for video_pipeline.py: records, per step, a hash of
that step's relevant inputs and a small JSON-serializable summary of its
result. Lets main() skip re-running a step on the next invocation when the
recorded hash still matches and the step's output artifacts still exist —
automatic resume without relying solely on manual flags like --reuse-tts."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path


def compute_input_hash(*parts: object) -> str:
    canonical = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass
class PipelineState:
    steps: dict[str, dict] = field(default_factory=dict)

    def get(self, step_name: str) -> dict | None:
        return self.steps.get(step_name)

    def set(self, step_name: str, input_hash: str, result: dict) -> None:
        self.steps[step_name] = {"input_hash": input_hash, "result": result}


def load_state(path: str | Path) -> PipelineState:
    path = Path(path)
    if not path.exists():
        return PipelineState()
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return PipelineState()
    return PipelineState(steps=data.get("steps", {}))


def save_state(state: PipelineState, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"steps": state.steps}, f, indent=2, ensure_ascii=False)
