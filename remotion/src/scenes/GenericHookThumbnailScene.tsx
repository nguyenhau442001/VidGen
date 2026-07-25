import React from "react";
import { AbsoluteFill } from "remotion";
import { GenericHookThumbnailSceneProps } from "../types";
import { colors, BE_VIETNAM_PRO } from "../styles";

const CANVAS_W = 1080;
const CANVAS_H = 1920;
// Was hardcoded near-white (#f8fafc / rgba(226,232,240,0.7)) from before the
// channel's light-theme switch — invisible against the now-light colors.bg
// background. Token-based so it stays legible in either theme.
const HEADLINE_COLOR = colors.textPrimary;
const SUBTEXT_COLOR = colors.textDim;

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
    .split(/\n|\.\s+|—/)
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
  illustration = "map",
}) => {
  const lines = splitHeadlineLines(headline);
  const isBrandSwap = illustration === "brandSwap";

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

      {/* Layer 3 — topic illustration */}
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * (isBrandSwap ? 0.18 : 0.3),
          left: 0,
          width: CANVAS_W,
          height: CANVAS_H * 0.25,
        }}
      >
        {illustration === "brandSwap" ? (
          <svg width={CANVAS_W} height={CANVAS_H * 0.25} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.25}`}>
            <defs>
              <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0f172a" floodOpacity="0.16" />
              </filter>
            </defs>
            <g transform="translate(190,18)">
              <rect
                x={0}
                y={28}
                width={700}
                height={338}
                rx={30}
                fill="rgba(255,255,255,0.96)"
                stroke="rgba(15,23,42,0.12)"
                strokeWidth={3}
                filter="url(#cardShadow)"
              />

              <rect
                x={40}
                y={62}
                width={154}
                height={58}
                rx={14}
                fill="none"
                stroke={colors.errorRed}
                strokeWidth={3}
                strokeDasharray="9 7"
              />
              <text
                x={117}
                y={99}
                textAnchor="middle"
                fontFamily={BE_VIETNAM_PRO}
                fontSize={20}
                fontWeight={700}
                fill={colors.errorRed}
              >
                LOGO?
              </text>
              <line x1={48} y1={68} x2={186} y2={114} stroke={colors.errorRed} strokeWidth={6} strokeLinecap="round" />

              <text
                x={40}
                y={164}
                fontFamily={BE_VIETNAM_PRO}
                fontSize={25}
                fontWeight={700}
                fill={colors.textPrimary}
              >
                “Khởi đầu ngày mới đầy năng lượng
              </text>
              <text
                x={40}
                y={202}
                fontFamily={BE_VIETNAM_PRO}
                fontSize={25}
                fontWeight={700}
                fill={colors.textPrimary}
              >
                cùng hương vị mát lạnh.”
              </text>

              <g transform="translate(112,252) rotate(-2 238 40)">
                <rect
                  x={0}
                  y={0}
                  width={476}
                  height={80}
                  rx={16}
                  fill="#fff1f2"
                  stroke={colors.errorRed}
                  strokeWidth={4}
                />
                <text
                  x={238}
                  y={50}
                  textAnchor="middle"
                  fontFamily={BE_VIETNAM_PRO}
                  fontSize={22}
                  fontWeight={800}
                  letterSpacing={1.5}
                  fill={colors.errorRed}
                >
                  BRAND NÀO CŨNG ĐĂNG ĐƯỢC
                </text>
              </g>
            </g>
          </svg>
        ) : illustration === "notebook" ? (
          <svg width={CANVAS_W} height={CANVAS_H * 0.25} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.25}`}>
            <g transform="translate(370,44)">
              <rect
                x={0}
                y={0}
                width={340}
                height={310}
                rx={28}
                fill="rgba(255,255,255,0.92)"
                stroke={colors.green}
                strokeWidth={6}
              />
              <line x1={72} y1={0} x2={72} y2={310} stroke={colors.green} strokeWidth={4} opacity={0.45} />
              {[70, 130, 190, 250].map((y, i) => (
                <g key={y}>
                  <rect
                    x={102}
                    y={y - 21}
                    width={202}
                    height={42}
                    rx={12}
                    fill={i === 3 ? "rgba(22,163,74,0.14)" : "rgba(2,132,199,0.10)"}
                    stroke={i === 3 ? colors.green : colors.cyan}
                    strokeWidth={2}
                  />
                  <circle cx={126} cy={y} r={7} fill={i === 3 ? colors.green : colors.cyan} />
                  <line
                    x1={145}
                    y1={y}
                    x2={278}
                    y2={y}
                    stroke={colors.textPrimary}
                    strokeWidth={5}
                    strokeLinecap="round"
                    opacity={0.62}
                  />
                </g>
              ))}
              {[42, 102, 162, 222, 282].map((y) => (
                <circle key={y} cx={0} cy={y} r={10} fill={colors.bg} stroke={colors.green} strokeWidth={4} />
              ))}
            </g>
          </svg>
        ) : (
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
        )}
      </div>

      {/* Layer 4 — headline (max 3 lines, accent word highlighted) */}
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * (isBrandSwap ? 0.49 : 0.58),
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
              fontWeight: 800,
              fontSize: isBrandSwap ? 76 : 72,
              lineHeight: isBrandSwap ? 1.1 : 1.15,
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
            top: CANVAS_H * (isBrandSwap ? 0.72 : 0.8),
            left: 56,
            right: 56,
            minHeight: isBrandSwap ? 62 : undefined,
            padding: isBrandSwap ? "14px 20px" : 0,
            borderRadius: isBrandSwap ? 16 : 0,
            border: isBrandSwap ? `1.5px solid ${colors.errorRed}55` : "none",
            backgroundColor: isBrandSwap ? "#fff1f2" : "transparent",
            boxSizing: "border-box",
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: isBrandSwap ? 800 : 400,
            fontSize: isBrandSwap ? 30 : 32,
            color: isBrandSwap ? colors.errorRed : SUBTEXT_COLOR,
            textAlign: isBrandSwap ? "center" : "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtext}
        </div>
      )}


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
