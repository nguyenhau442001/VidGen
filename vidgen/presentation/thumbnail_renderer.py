import json
import os
import re
import subprocess
from pathlib import Path

from vidgen.pipeline.shot_schema import script_shots

SCENE_TYPE_TO_STYLE = {
    "CharacterIconScene": "characterIcon",
    "HSKFlashCardThumbnailScene": "hskFlashCard",
}

BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")


def _style_for_scene(scene_type: str) -> str:
    return SCENE_TYPE_TO_STYLE.get(scene_type, "generic")


def _longest_bold_span(text: str) -> str | None:
    matches = BOLD_RE.findall(text)
    if not matches:
        return None
    return max(matches, key=len)


def _strip_bold_markers(text: str) -> str:
    return BOLD_RE.sub(r"\1", text)


def _extract_generic_props(script: dict, scene_index: int = 0) -> dict:
    scene = script_shots(script)[scene_index]
    props = scene.get("props", {})
    raw_headline = props.get("headline", "")

    headline = (scene.get("narration") or "").rstrip(".")

    accent_word = props.get("accentWord") or _longest_bold_span(raw_headline)

    subtext = _strip_bold_markers(props.get("body") or raw_headline)

    part_label = None
    for s in script_shots(script):
        label = s.get("props", {}).get("partLabel")
        if label:
            part_label = label
            break

    result = {"headline": headline, "subtext": subtext}
    if accent_word:
        result["accentWord"] = accent_word
    if part_label:
        result["partLabel"] = part_label
    return result


def _split_into_three_lines(text: str) -> tuple[str, str, str]:
    """line1/line2/line3 all render at the same 36px font size in
    CharacterIconCoverScene's fixed 390px-wide canvas, so they share the
    same tight budget. line2 additionally sits inside a fixed 214px
    highlight box, which is why its budget is tighter still. Confirmed by
    rendering a real script: content longer than ~16 chars visibly
    overflows both edges of the frame at this font size."""

    def fill(budget: int, words: list, target: list) -> None:
        length = 0
        while words:
            candidate_len = length + len(words[0]) + (1 if length else 0)
            if candidate_len > budget:
                break
            length = candidate_len
            target.append(words.pop(0))

    remaining = text.split()
    line1_words: list = []
    line2_words: list = []
    line3_words: list = []
    fill(16, remaining, line1_words)
    fill(10, remaining, line2_words)
    fill(16, remaining, line3_words)

    line3 = " ".join(line3_words)
    if remaining:
        line3 = (line3.rstrip() + "…") if line3 else "…"

    return " ".join(line1_words), " ".join(line2_words), line3


def _truncate_subtitle(text: str, max_chars: int = 40) -> str:
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars].rsplit(" ", 1)[0]
    return truncated + "…"


def _extract_character_icon_props(
    script: dict, scene_index: int = 0, channel_name: str = "Ủa là sao"
) -> dict:
    scene = script_shots(script)[scene_index]
    props = scene.get("props", {})

    headline_source = scene.get("on_screen_text") or scene.get("narration") or ""
    line1, line2, line3 = _split_into_three_lines(headline_source)

    result = {
        "eyebrowText": channel_name,
        "line1": line1,
        "line2": line2,
        "line3": line3,
        "subtitle": _truncate_subtitle(scene.get("narration") or ""),
    }

    if props.get("accentColor"):
        result["accentColor"] = props["accentColor"]
    if props.get("partLabel"):
        result["seriesLabel"] = props["partLabel"]
    if props.get("rejectedPin", {}).get("label"):
        result["rejectedLabel"] = f"{props['rejectedPin']['label']} ✕"
    if props.get("selectedPin", {}).get("label"):
        result["selectedLabel"] = f"{props['selectedPin']['label']} ✓"

    return result


def _extract_hsk_flash_card_props(script: dict, scene_index: int = 0) -> dict:
    scene = script_shots(script)[scene_index]
    return dict(scene.get("props", {}))


def generate_thumbnail(
    script_path: str,
    output_path: str,
    scene_index: int = 0,
    channel_name: str = "Ủa là sao",
    overwrite: bool = True,
    remotion_dir: str = "remotion",
) -> str:
    """Render a thumbnail PNG from scenes[scene_index] of a VidGen script JSON.

    Raises FileNotFoundError if script_path doesn't exist, RuntimeError if
    npx is missing or the Remotion still render exits non-zero.
    """
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Script not found: {script_path}")

    output_path = os.path.abspath(output_path)
    if not overwrite and os.path.exists(output_path):
        print(f"Thumbnail already exists, skipping: {output_path}")
        return output_path

    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    scene = script_shots(script)[scene_index]
    style = _style_for_scene(scene["type"])
    if style == "characterIcon":
        props = _extract_character_icon_props(script, scene_index, channel_name)
    elif style == "hskFlashCard":
        props = _extract_hsk_flash_card_props(script, scene_index)
    else:
        props = _extract_generic_props(script, scene_index)
        props["channelName"] = channel_name
    props["style"] = style

    print(f"🎨 Rendering thumbnail for: {script_path}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = ["npx", "remotion", "still", "Thumbnail", output_path, f"--props={json.dumps(props)}"]
    try:
        result = subprocess.run(cmd, cwd=remotion_dir, capture_output=True, text=True)
    except FileNotFoundError:
        raise RuntimeError("npx not found. Run: npm install")

    if result.returncode != 0:
        stderr_tail = "\n".join(result.stderr.strip().splitlines()[-5:])
        print(f"❌ Remotion error (exit {result.returncode}): {stderr_tail}")
        raise RuntimeError(f"renderStill failed:\n{result.stderr}")

    print(f"✅ Thumbnail saved: {output_path}")
    return output_path


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Render a thumbnail from an approved VidGen script.")
    parser.add_argument("script", help="Path to the authored content JSON")
    parser.add_argument("--output", help="Thumbnail output path")
    parser.add_argument("--scene-index", type=int, default=0)
    parser.add_argument("--channel-name", default="DevFasterr")
    parser.add_argument("--overwrite", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--remotion-dir", default="remotion")
    args = parser.parse_args()

    output = args.output or f"output/thumbnails/{Path(args.script).stem}_thumb.png"
    generate_thumbnail(
        args.script,
        output,
        scene_index=args.scene_index,
        channel_name=args.channel_name,
        overwrite=args.overwrite,
        remotion_dir=args.remotion_dir,
    )
