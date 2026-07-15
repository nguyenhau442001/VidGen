#!/usr/bin/env python3
"""
preview_av.py — Two Column AV preview for VidGen scripts

Reads a VidGen content/*.json file and renders a Two Column AV table
as either an HTML file (default) or plain terminal text (--text flag).

Usage:
    python vidgen/preview_av.py content/script_grab_dispatch_p2.json
    python vidgen/preview_av.py content/script_grab_dispatch_p2.json --text
    python vidgen/preview_av.py content/script_grab_dispatch_p2.json --out preview.html
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

from vidgen.shot_api import script_shots

# ── Scene type → visual description heuristic ──────────────────────────────

SCENE_COLORS = {
    "HookScene":         ("#EEEDFE", "#3C3489"),
    "ExplanationScene":  ("#E1F5EE", "#0F6E56"),
    "TerminalScene":     ("#2C2C2A", "#B4B2A9"),
    "MapPingScene":      ("#FAEEDA", "#633806"),
    "SplitViewScene":    ("#E6F1FB", "#0C447C"),
    "CTAScene":          ("#FCEBEB", "#791F1F"),
    "GeohashRevealScene":("#FAEEDA", "#633806"),
    "DemandHeatmapScene":("#FAEEDA", "#633806"),
    "SignalFlowScene":   ("#E6F1FB", "#0C447C"),
    "PhoneMockupScene":  ("#EAF3DE", "#27500A"),
    "RippleAggregateScene":("#FBEAF0", "#72243E"),
    "DriverSwarmScene":  ("#EAF3DE", "#27500A"),
    "CounterBlastScene": ("#FCEBEB", "#791F1F"),
    "QuoteCalloutScene": ("#2C2C2A", "#B4B2A9"),
    "CharacterIconScene":("#E6F1FB", "#0C447C"),
    "GoogleMapsRevealScene":("#E6F1FB", "#0C447C"),
}

DEFAULT_COLOR = ("#F1EFE8", "#5F5E5A")


def scene_color(scene_type: str) -> tuple[str, str]:
    return SCENE_COLORS.get(scene_type, DEFAULT_COLOR)


def describe_visual(scene: dict) -> str:
    """Generate a human-readable visual description from scene props."""
    t = scene.get("type", "")
    props = scene.get("props", {})
    parts = []

    headline = props.get("headline", "")
    accent   = props.get("accentWord", "")
    subtext  = props.get("subtext", "")
    bullets  = props.get("bullets", [])
    code     = props.get("code", "")
    lang     = props.get("language", "")
    hi_lines = props.get("highlightLines", [])
    pings    = props.get("pings", [])
    left     = props.get("left", {})
    right    = props.get("right", {})
    teaser   = props.get("teaser", "")

    if headline:
        accent_note = f' — accent: <span class="accent">"{accent}"</span>' if accent else ""
        parts.append(f'Headline: <strong>"{headline}"</strong>{accent_note}')
    if subtext:
        parts.append(f'Subtext: "{subtext}"')
    if bullets:
        b_list = " · ".join(f'"{b}"' for b in bullets[:4])
        parts.append(f"Bullets ({len(bullets)}): {b_list}")
    if code:
        lines = code.strip().split("\\n")
        n = len(lines)
        hl = f", highlight lines {hi_lines}" if hi_lines else ""
        parts.append(f"Code block ({n} lines, {lang}{hl}): <code>{lines[0][:48]}{'…' if len(lines[0])>48 else ''}</code>")
    if pings:
        labels = " · ".join(p.get("label", "") for p in pings)
        parts.append(f"Map pins ({len(pings)}): {labels}")
    if left and right:
        parts.append(
            f'Split: left="{left.get("label","")}" ({len(left.get("bullets",[]))} pts) '
            f'vs right="{right.get("label","")}" ({len(right.get("bullets",[]))} pts)'
        )
    if teaser:
        parts.append(f'Teaser: "{teaser}"')
    if not parts:
        parts.append(f"[{t} — no props]")

    return "<br>".join(parts)


def word_count(text: str) -> int:
    return len(text.split())


def frames_to_seconds(f: int) -> float:
    return round(f / 30, 1)


def expected_frames(narration: str, wps: float = 4.2) -> int:
    wc = word_count(narration)
    return math.ceil(wc / wps * 30)


# ── HTML renderer ───────────────────────────────────────────────────────────

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Two Column AV — {title}</title>
<style>
  :root {{
    --bg: #f8f8f6;
    --surface: #ffffff;
    --surface-alt: #f3f3f0;
    --border: rgba(0,0,0,0.09);
    --text: #1a1a18;
    --muted: #6b6b68;
    --mono: "SFMono-Regular", "Consolas", monospace;
    --accent-green: #00ff41;
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: #141412;
      --surface: #1e1e1c;
      --surface-alt: #252523;
      --border: rgba(255,255,255,0.08);
      --text: #e8e8e4;
      --muted: #888884;
    }}
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.6;
    padding: 2rem 1.5rem 4rem;
  }}
  .page-title {{
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 4px;
  }}
  .page-meta {{
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 1.5rem;
  }}
  .stats-row {{
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }}
  .stat {{
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
  }}
  .stat strong {{ font-weight: 500; font-size: 16px; display: block; }}
  table {{
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }}
  thead th {{
    background: var(--surface-alt);
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
    text-align: left;
    text-transform: uppercase;
    letter-spacing: .05em;
    border-bottom: 0.5px solid var(--border);
  }}
  tr + tr td {{ border-top: 0.5px solid var(--border); }}
  td {{ padding: 10px 12px; vertical-align: top; }}
  .col-shot {{
    width: 52px;
    font-size: 11px;
    color: var(--muted);
    font-family: var(--mono);
    background: var(--surface-alt);
    border-right: 0.5px solid var(--border);
    white-space: nowrap;
  }}
  .col-visual {{
    width: 50%;
    border-right: 0.5px solid var(--border);
  }}
  .col-audio {{ width: auto; }}
  .scene-badge {{
    display: inline-block;
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 20px;
    margin-bottom: 6px;
    letter-spacing: .03em;
  }}
  .visual-body {{
    font-size: 12px;
    color: var(--text);
    line-height: 1.6;
  }}
  .visual-body .accent {{ color: #00bb2d; font-weight: 500; }}
  .visual-body code {{
    font-family: var(--mono);
    font-size: 11px;
    background: var(--surface-alt);
    padding: 1px 4px;
    border-radius: 3px;
  }}
  .dur-tag {{
    margin-top: 6px;
    font-size: 10px;
    color: var(--muted);
    font-family: var(--mono);
  }}
  .dur-warn {{ color: #c9622a; }}
  .narration-label {{
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
    margin-bottom: 4px;
  }}
  .narration-text {{
    font-size: 12px;
    font-style: italic;
    color: var(--text);
    line-height: 1.7;
  }}
  .wc-tag {{
    margin-top: 5px;
    font-size: 10px;
    color: var(--muted);
    font-family: var(--mono);
  }}
  .footer {{
    margin-top: 1.5rem;
    font-size: 11px;
    color: var(--muted);
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }}
  .legend {{
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: .75rem;
  }}
  .legend-item {{
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 20px;
  }}
</style>
</head>
<body>
<h1 class="page-title">Two Column AV — {title}</h1>
<p class="page-meta">Source: {source_file} · {scene_count} scenes · {total_frames} frames · {total_seconds}s @ 30fps</p>

<div class="stats-row">
  <div class="stat"><strong>{scene_count}</strong>Scenes</div>
  <div class="stat"><strong>{total_frames}</strong>Total frames</div>
  <div class="stat"><strong>{total_seconds}s</strong>Duration</div>
  <div class="stat"><strong>{total_words}</strong>Total words</div>
</div>

<table>
<thead>
  <tr>
    <th style="width:52px">Shot</th>
    <th>Visual (trái)</th>
    <th>Audio / Narration (phải)</th>
  </tr>
</thead>
<tbody>
{rows}
</tbody>
</table>

<div class="footer">
  <span>Generated by <code>vidgen/preview_av.py</code></span>
  <div class="legend">
{legend_items}
  </div>
</div>
</body>
</html>"""


def build_html(script: dict, source_file: str) -> str:
    scenes = script_shots(script)
    meta   = script.get("meta", {})
    title  = meta.get("title", Path(source_file).stem)

    rows = []
    total_frames = 0
    total_words  = 0
    seen_types: dict[str, tuple[str, str]] = {}

    for i, scene in enumerate(scenes):
        sid      = scene.get("id", f"s{i+1:02d}")
        stype    = scene.get("type", "Unknown")
        frames   = scene.get("durationInFrames", 0)
        narr     = scene.get("narration", "")
        bg, fg   = scene_color(stype)
        seen_types[stype] = (bg, fg)

        wc       = word_count(narr)
        exp_f    = expected_frames(narr)
        secs     = frames_to_seconds(frames)
        total_frames += frames
        total_words  += wc

        diff = abs(frames - exp_f)
        dur_class = "dur-warn" if diff > 20 else "dur-tag"
        dur_note  = f"⚠ expected ~{exp_f}f" if diff > 20 else ""

        visual_html = describe_visual(scene)

        row = f"""  <tr>
    <td class="col-shot">{sid}</td>
    <td class="col-visual">
      <span class="scene-badge" style="background:{bg};color:{fg}">{stype}</span>
      <div class="visual-body">{visual_html}</div>
      <div class="{dur_class}">⏱ {frames}f · {secs}s {dur_note}</div>
    </td>
    <td class="col-audio">
      <div class="narration-label">Narration</div>
      <div class="narration-text">"{narr}"</div>
      <div class="wc-tag">{wc} words · ~{frames_to_seconds(exp_f)}s expected</div>
    </td>
  </tr>"""
        rows.append(row)

    legend_items = "\n".join(
        f'    <span class="legend-item" style="background:{bg};color:{fg}">{t}</span>'
        for t, (bg, fg) in sorted(seen_types.items())
    )

    return HTML_TEMPLATE.format(
        title=title,
        source_file=source_file,
        scene_count=len(scenes),
        total_frames=total_frames,
        total_seconds=frames_to_seconds(total_frames),
        total_words=total_words,
        rows="\n".join(rows),
        legend_items=legend_items,
    )


# ── Terminal renderer ────────────────────────────────────────────────────────

def build_text(script: dict, source_file: str) -> str:
    scenes = script_shots(script)
    meta   = script.get("meta", {})
    title  = meta.get("title", Path(source_file).stem)

    lines = []
    lines.append("=" * 72)
    lines.append(f"  TWO COLUMN AV — {title}")
    lines.append(f"  Source: {source_file} | {len(scenes)} scenes")
    lines.append("=" * 72)

    total_frames = 0
    total_words  = 0

    for i, scene in enumerate(scenes):
        sid    = scene.get("id", f"s{i+1:02d}")
        stype  = scene.get("type", "Unknown")
        frames = scene.get("durationInFrames", 0)
        narr   = scene.get("narration", "")
        props  = scene.get("props", {})
        wc     = word_count(narr)
        exp_f  = expected_frames(narr)
        total_frames += frames
        total_words  += wc

        lines.append(f"\n{'─'*72}")
        lines.append(f"  Shot: {sid}  |  {stype}  |  {frames}f ({frames_to_seconds(frames)}s)")
        if abs(frames - exp_f) > 20:
            lines.append(f"  ⚠ timing drift: {frames}f actual vs ~{exp_f}f expected")
        lines.append(f"{'─'*72}")
        lines.append("  VISUAL")

        headline = props.get("headline")
        accent   = props.get("accentWord")
        bullets  = props.get("bullets", [])
        code     = props.get("code")

        if headline:
            lines.append(f"    headline : {headline}")
        if accent:
            lines.append(f"    accent   : {accent}")
        if bullets:
            for b in bullets:
                lines.append(f"    • {b}")
        if code:
            code_lines = code.split("\\n")
            lines.append(f"    code ({len(code_lines)} lines): {code_lines[0][:60]}")
        if not any([headline, accent, bullets, code]):
            lines.append(f"    [no props]")

        lines.append(f"\n  NARRATION  ({wc} words)")
        # wrap at 60 chars
        words = narr.split()
        line_buf, cur = [], 0
        for w in words:
            if cur + len(w) > 60:
                lines.append("    " + " ".join(line_buf))
                line_buf, cur = [], 0
            line_buf.append(w)
            cur += len(w) + 1
        if line_buf:
            lines.append("    " + " ".join(line_buf))

    lines.append(f"\n{'='*72}")
    lines.append(f"  TOTAL: {len(scenes)} scenes · {total_frames}f · {frames_to_seconds(total_frames)}s · {total_words} words")
    lines.append("=" * 72)
    return "\n".join(lines)


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="VidGen Two Column AV preview — render script JSON as AV table"
    )
    parser.add_argument("script", help="Path to content/*.json script file")
    parser.add_argument(
        "--text", action="store_true",
        help="Print plain text table to stdout instead of writing HTML"
    )
    parser.add_argument(
        "--out", default=None,
        help="Output HTML path (default: <script_stem>_av_preview.html next to script)"
    )
    args = parser.parse_args()

    script_path = Path(args.script)
    if not script_path.exists():
        print(f"[preview_av] ERROR: file not found: {script_path}", file=sys.stderr)
        sys.exit(1)

    with open(script_path, encoding="utf-8") as f:
        try:
            script = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[preview_av] ERROR: invalid JSON — {e}", file=sys.stderr)
            sys.exit(1)

    if args.text:
        print(build_text(script, str(script_path)))
        return

    html = build_html(script, str(script_path))

    if args.out:
        out_path = Path(args.out)
    else:
        out_path = script_path.parent / (script_path.stem + "_av_preview.html")

    out_path.write_text(html, encoding="utf-8")
    print(f"[preview_av] ✅ Written → {out_path}")
    print(f"             Open in browser: file://{out_path.resolve()}")


if __name__ == "__main__":
    main()
