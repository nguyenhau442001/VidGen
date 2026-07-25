"""Cross-check scene-type schema drift between Python and TypeScript.

TYPE_MAP / VALID_SCENE_TYPES in render_manifest_builder.py must agree with
the ManifestScene union in remotion/src/types.ts and the switch (shot.type)
dispatch in remotion/src/TikTokVideo.tsx. remotion/scripts/check_scene_types.mjs
is the source-of-truth extractor on the TS side (parses the real AST, not
regex) and writes remotion/scene_types.generated.json; this module runs that
script, then diffs its output against VALID_SCENE_TYPES.

Run directly: python -m vidgen.pipeline.check_scene_types
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from vidgen.pipeline.render_manifest_builder import DIRECT_SNAKE_CASE_SCENE_TYPES, TYPE_MAP

REPO_ROOT = Path(__file__).resolve().parents[2]
REMOTION_ROOT = REPO_ROOT / "remotion"
GENERATED_JSON = REMOTION_ROOT / "scene_types.generated.json"


class SceneTypeDriftError(RuntimeError):
    pass


def _run_extractor() -> None:
    result = subprocess.run(
        ["node", "scripts/check_scene_types.mjs"],
        cwd=REMOTION_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SceneTypeDriftError(
            "remotion/scripts/check_scene_types.mjs found drift between "
            "types.ts and TikTokVideo.tsx:\n"
            f"{result.stdout}{result.stderr}"
        )


def check() -> None:
    """Raise SceneTypeDriftError if Python and TypeScript scene types disagree.

    Compares against the render-time snake_case surface only (TYPE_MAP.values()
    | DIRECT_SNAKE_CASE_SCENE_TYPES) — TYPE_MAP's PascalCase keys are an
    author-time convenience with no TS-side counterpart, so they're excluded.
    """
    _run_extractor()

    generated = json.loads(GENERATED_JSON.read_text())
    ts_types = set(generated["sceneTypes"])
    python_types = set(TYPE_MAP.values()) | DIRECT_SNAKE_CASE_SCENE_TYPES

    missing_from_python = ts_types - python_types
    missing_from_ts = python_types - ts_types

    if missing_from_python or missing_from_ts:
        lines = ["scene type cross-check FAILED between Python and TypeScript:"]
        if missing_from_python:
            lines.append(
                f"  - in remotion (types.ts/TikTokVideo.tsx) but not in "
                f"render_manifest_builder's TYPE_MAP/DIRECT_SNAKE_CASE_SCENE_TYPES: "
                f"{sorted(missing_from_python)}"
            )
        if missing_from_ts:
            lines.append(
                f"  - in render_manifest_builder's TYPE_MAP/DIRECT_SNAKE_CASE_SCENE_TYPES "
                f"but not in remotion (types.ts/TikTokVideo.tsx): {sorted(missing_from_ts)}"
            )
        raise SceneTypeDriftError("\n".join(lines))


def main() -> int:
    try:
        check()
    except SceneTypeDriftError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    python_types = set(TYPE_MAP.values()) | DIRECT_SNAKE_CASE_SCENE_TYPES
    print(f"scene type cross-check OK — {len(python_types)} types agree (Python ↔ TypeScript)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
