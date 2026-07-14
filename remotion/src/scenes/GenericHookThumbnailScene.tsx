import React from "react";
import { AbsoluteFill } from "remotion";
import { GenericHookThumbnailSceneProps } from "../types";
import { colors, BE_VIETNAM_PRO } from "../styles";

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const HEADLINE_COLOR = "#f8fafc";
const SUBTEXT_COLOR = "rgba(226,232,240,0.7)";

function truncateLine(line: string, maxChars: number): string {
  if (line.length <= maxChars) return line;
  const sliced = line.slice(0, maxChars);
  const trimmed = sliced.replace(/\s+\S*$/, "");
  return (trimmed || sliced) + "…";
}

// Splits on Vietnamese sentence-break punctuation into up to 3 lines;
// truncates each line independently when it exceeds maxCharsPerLine,
// and appends "…" to the last line if there were more parts than fit.
function splitHeadlineLines(headline: string, maxLines = 3, maxCharsPerLine = 42): string[] {
  const rawParts = headline
    .split(/\.\s+|—/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = rawParts.length > 0 ? rawParts : [headline];
  const lines = parts.slice(0, maxLines).map((line) => truncateLine(line, maxCharsPerLine));
  const overflowed = parts.length > maxLines;
  const lastIndex = lines.length - 1;
  if (overflowed && lines[lastIndex] && !lines[lastIndex].endsWith("…")) {
    lines[lastIndex] = lines[lastIndex] + "…";
  }
  return lines;
}

function renderLineWithAccent(line: string, accentWord?: string): React.ReactNode {
  if (!accentWord) return line;
  const idx = line.indexOf(accentWord);
  if (idx === -1) return line;
  return (
    <>
      {line.slice(0, idx)}
      <span style={{ color: colors.green }}>{accentWord}</span>
      {line.slice(idx + accentWord.length)}
    </>
  );
}

export const GenericHookThumbnailScene: React.FC<GenericHookThumbnailSceneProps> = ({
  headline,
  accentWord,
  subtext,
  partLabel,
  channelName = "Ủa là sao",
}) => {
  const lines = splitHeadlineLines(headline);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Layer 0 — background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,255,65,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Layer 1 — atmospheric glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 600,
          left: (CANVAS_W - 900) / 2,
          top: 560,
          background: "radial-gradient(ellipse at center, rgba(0,255,65,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Layer 2 — part badge (omitted entirely when no partLabel) */}
      {partLabel && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(0,255,65,0.5)",
            backgroundColor: "rgba(0,255,65,0.08)",
            fontFamily: BE_VIETNAM_PRO,
            fontSize: 22,
            letterSpacing: "0.08em",
            color: colors.green,
          }}
        >
          {partLabel}
        </div>
      )}

      {/* Layer 3 — map pin / car / dashed connector */}
      <div style={{ position: "absolute", top: CANVAS_H * 0.3, left: 0, width: CANVAS_W, height: CANVAS_H * 0.25 }}>
        <svg width={CANVAS_W} height={CANVAS_H * 0.25} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.25}`}>
          <line
            x1={510}
            y1={230}
            x2={540}
            y2={210}
            stroke={colors.green}
            strokeWidth={3}
            strokeDasharray="8 6"
            opacity={0.7}
          />
          <g transform="translate(540,150)">
            <path
              d="M0,-60 C33,-60 60,-33 60,0 C60,45 0,60 0,60 C0,60 -60,45 -60,0 C-60,-33 -33,-60 0,-60 Z"
              fill="none"
              stroke={colors.green}
              strokeWidth={5}
            />
            <circle cx={0} cy={-10} r={20} fill="none" stroke={colors.green} strokeWidth={5} />
          </g>
          <g transform="translate(510,230)">
            <polygon points="0,-24 20,20 -20,20" fill="#22C55E" />
          </g>
        </svg>
      </div>

      {/* Layer 4 — headline (max 3 lines, accent word highlighted) */}
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * 0.58,
          left: 56,
          right: 56,
          height: CANVAS_H * 0.2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 700,
              fontSize: 72,
              lineHeight: 1.15,
              color: HEADLINE_COLOR,
            }}
          >
            {renderLineWithAccent(line, accentWord)}
          </div>
        ))}
      </div>

      {/* Layer 5 — subtext */}
      {subtext && (
        <div
          style={{
            position: "absolute",
            top: CANVAS_H * 0.8,
            left: 56,
            right: 56,
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 400,
            fontSize: 32,
            color: SUBTEXT_COLOR,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtext}
        </div>
      )}

      {/* Layer 7 — bottom scrim, painted before the brand bar so the bar reads on top of it */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 300,
          background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))",
        }}
      />

      {/* Layer 6 — brand bar */}
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          borderTop: "1px solid rgba(0,255,65,0.15)",
        }}
      >
        <span
          style={{
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 500,
            fontSize: 26,
            color: "rgba(0,255,65,0.8)",
          }}
        >
          {channelName}
        </span>
        <span style={{ color: colors.green, fontSize: 22 }}>▶</span>
      </div>
    </AbsoluteFill>
  );
};
