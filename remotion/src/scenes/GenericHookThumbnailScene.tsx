import React from "react";
import { AbsoluteFill } from "remotion";
import { GenericHookThumbnailSceneProps } from "../types";
import { colors, BE_VIETNAM_PRO } from "../styles";
import { XanhSMBirdIcon } from "./shared/greensmBikePalette";

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

function renderLineWithAccent(line: string, accentWord: string | undefined, accentColor: string): React.ReactNode {
  if (!accentWord) return line;
  const idx = line.indexOf(accentWord);
  if (idx === -1) return line;
  return (
    <>
      {line.slice(0, idx)}
      <span style={{ color: accentColor }}>{accentWord}</span>
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
  accentColor,
}) => {
  const lines = splitHeadlineLines(headline);
  const isBrandSwap = illustration === "brandSwap";
  const isLazadaEconomics = illustration === "lazadaEconomics";
  const isXanhSM = illustration === "xanhsm";
  const isBatterySwap = illustration === "batterySwap";
  const isDarkBrand = isXanhSM || isBatterySwap;
  const accent = accentColor ?? (isBatterySwap ? "#FF425F" : isXanhSM ? "#0EA5E9" : colors.green);
  const gridRgb = isBatterySwap
    ? "15,191,255"
    : isXanhSM
      ? "14,165,233"
      : isLazadaEconomics
        ? "255,79,154"
        : "0,255,65";

  return (
    <AbsoluteFill style={{ backgroundColor: isDarkBrand ? "#04111A" : colors.bg }}>
      {/* Layer 0 — background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            `linear-gradient(rgba(${gridRgb},0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(${gridRgb},0.06) 1px, transparent 1px)`,
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
          background: `radial-gradient(ellipse at center, rgba(${gridRgb},${isDarkBrand ? 0.22 : 0.12}) 0%, transparent 70%)`,
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
            border: `1px solid rgba(${gridRgb},0.5)`,
            backgroundColor: `rgba(${gridRgb},0.08)`,
            fontFamily: BE_VIETNAM_PRO,
            fontSize: 22,
            letterSpacing: "0.08em",
            color: accent,
          }}
        >
          {partLabel}
        </div>
      )}

      {/* Layer 3 — topic illustration */}
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * (isBrandSwap || isLazadaEconomics ? 0.18 : isDarkBrand ? 0.13 : 0.3),
          left: 0,
          width: CANVAS_W,
          height: CANVAS_H * (isDarkBrand ? 0.36 : 0.25),
        }}
      >
        {illustration === "batterySwap" ? (
          <svg width={CANVAS_W} height={CANVAS_H * 0.36} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.36}`}>
            <defs>
              <radialGradient id="batterySwapGlow" cx="50%" cy="45%" r="58%">
                <stop offset="0%" stopColor="#0FBFFF" stopOpacity={0.28} />
                <stop offset="65%" stopColor="#FF425F" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#04111A" stopOpacity={0} />
              </radialGradient>
              <linearGradient id="batterySwapCabinet" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0B2635" />
                <stop offset="100%" stopColor="#07141D" />
              </linearGradient>
              <filter id="batterySwapShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="#FF425F" floodOpacity="0.3" />
              </filter>
            </defs>

            <ellipse cx={540} cy={320} rx={430} ry={290} fill="url(#batterySwapGlow)" />

            <g transform="translate(290,48)" filter="url(#batterySwapShadow)">
              <rect width={500} height={510} rx={44} fill="url(#batterySwapCabinet)" stroke="#FF425F" strokeWidth={4} />
              <text x={38} y={58} fontFamily={BE_VIETNAM_PRO} fontSize={24} fontWeight={800} letterSpacing={3} fill="#F5FBFF">
                V-GREEN · SWAP
              </text>
              <circle cx={455} cy={48} r={9} fill="#FF425F" />
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const x = 34 + column * 222;
                const y = 84 + row * 128;
                const locked = index === 2;
                return (
                  <g key={index} transform={`translate(${x},${y})`}>
                    <rect width={200} height={108} rx={20} fill="#04111A" stroke={locked ? "#FF425F" : "#174156"} strokeWidth={3} />
                    {locked ? (
                      <text x={100} y={66} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={25} fontWeight={900} fill="#FF425F">
                        LOCKED
                      </text>
                    ) : (
                      <g transform="translate(78,17)">
                        <rect x={0} y={10} width={44} height={68} rx={10} fill="#082E42" stroke="#0FBFFF" strokeWidth={3} />
                        <rect x={15} y={3} width={14} height={8} rx={3} fill="#0FBFFF" />
                        <path d="M25 21 L13 45 H25 L19 67 L34 39 H22 Z" fill="#F5FBFF" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            <g transform="translate(745,470) rotate(-7)">
              <rect x={-172} y={-42} width={344} height={84} rx={18} fill="#200A12" stroke="#FF425F" strokeWidth={3} />
              <text x={0} y={11} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={27} fontWeight={900} fill="#FF425F">
                KPI HÔM QUA
              </text>
            </g>
          </svg>
        ) : illustration === "xanhsm" ? (
          <svg width={CANVAS_W} height={CANVAS_H * 0.32} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.32}`}>
            <defs>
              <radialGradient id="xanhsmBadgeGlow" cx="50%" cy="42%" r="60%">
                <stop offset="0%" stopColor={accent} stopOpacity={0.55} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </radialGradient>
              <filter id="xanhsmDropShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor={accent} floodOpacity="0.5" />
              </filter>
            </defs>

            <circle cx={CANVAS_W / 2} cy={280} r={280} fill="url(#xanhsmBadgeGlow)" />

            {/* Route line sweeping behind the badge — motion/mobility motif */}
            <path
              d={`M -40 380 C 220 300, 420 460, ${CANVAS_W / 2} 340 S ${CANVAS_W - 220} 260, ${CANVAS_W + 40} 360`}
              fill="none"
              stroke={accent}
              strokeWidth={5}
              strokeDasharray="2 26"
              strokeLinecap="round"
              opacity={0.55}
            />

            {/* Ticket/promo-code chip floating near the badge, tying the visual to "mã 20k" */}
            <g transform={`translate(${CANVAS_W / 2 + 210}, 150) rotate(10)`} filter="url(#xanhsmDropShadow)">
              <rect x={-78} y={-34} width={156} height={68} rx={16} fill="#ffffff" opacity={0.97} />
              <rect x={-78} y={-34} width={156} height={68} rx={16} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="7 6" />
              <text x={0} y={10} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={30} fontWeight={800} fill={accent}>
                20K
              </text>
            </g>

            {/* Large bird logomark badge — the visual anchor of the thumbnail */}
            <g transform={`translate(${CANVAS_W / 2}, 240)`} filter="url(#xanhsmDropShadow)">
              <circle r={128} fill="#ffffff" opacity={0.97} />
              <circle r={128} fill="none" stroke={accent} strokeWidth={5} />
              <g transform="translate(-64,-64)">
                <XanhSMBirdIcon size={128} color={accent} />
              </g>
            </g>
          </svg>
        ) : illustration === "lazadaEconomics" ? (
          <svg width={CANVAS_W} height={CANVAS_H * 0.25} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H * 0.25}`}>
            <defs>
              <filter id="lazadaCardShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor={accent} floodOpacity="0.22" />
              </filter>
              <linearGradient id="lazadaCardFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#170A18" />
                <stop offset="100%" stopColor="#250C20" />
              </linearGradient>
            </defs>

            <g transform="translate(150,18)" filter="url(#lazadaCardShadow)">
              <rect width={780} height={362} rx={34} fill="url(#lazadaCardFill)" stroke={accent} strokeWidth={3} />

              <g transform="translate(46,34)">
                <rect width={186} height={46} rx={23} fill={`${accent}22`} stroke={accent} strokeWidth={2} />
                <text x={93} y={31} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={19} fontWeight={800} letterSpacing={1.5} fill={accent}>
                  LAZADA · SALE DAY
                </text>
              </g>

              {[
                { x: 472, label: "9.9", active: false },
                { x: 564, label: "11.11", active: false },
                { x: 670, label: "12.12", active: true },
              ].map(({ x, label, active }) => (
                <g key={label} transform={`translate(${x},34)`}>
                  <rect width={active ? 78 : 72} height={46} rx={14} fill={active ? accent : "#342437"} />
                  <text x={active ? 39 : 36} y={31} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={19} fontWeight={900} fill="#FFFFFF">
                    {label}
                  </text>
                </g>
              ))}

              <g transform="translate(46,112)">
                <rect width={326} height={184} rx={24} fill="#2D1E30" stroke="#5A3A58" strokeWidth={2} />
                <text x={163} y={48} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={21} fontWeight={800} letterSpacing={1.2} fill="#C8BBC8">
                  ĐƠN HÀNG
                </text>
                <text x={163} y={132} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={86} fontWeight={900} fill={accent}>
                  ↗
                </text>
              </g>

              <g transform="translate(408,112)">
                <rect width={326} height={184} rx={24} fill="#2D1E30" stroke="#5A3A58" strokeWidth={2} />
                <text x={163} y={48} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={21} fontWeight={800} letterSpacing={1.2} fill="#C8BBC8">
                  LỢI NHUẬN
                </text>
                <text x={163} y={137} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={82} fontWeight={900} fill="#FFFFFF">
                  ?
                </text>
              </g>

              <g transform="translate(240,316)">
                <rect width={300} height={64} rx={20} fill={accent} />
                <text x={150} y={42} textAnchor="middle" fontFamily={BE_VIETNAM_PRO} fontSize={25} fontWeight={900} fill="#FFFFFF">
                  VOUCHER −100K
                </text>
              </g>
            </g>
          </svg>
        ) : illustration === "brandSwap" ? (
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
          top: CANVAS_H * (isBrandSwap ? 0.49 : isBatterySwap ? 0.52 : isXanhSM ? 0.6 : 0.58),
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
              color: isDarkBrand ? "#f5fbff" : HEADLINE_COLOR,
              textShadow: isDarkBrand ? "0 4px 24px rgba(0,0,0,0.45)" : undefined,
            }}
          >
            {renderLineWithAccent(line, accentWord, accent)}
          </div>
        ))}
      </div>

      {/* Layer 5 — subtext */}
      {subtext && (
        <div
          style={{
            position: "absolute",
            top: CANVAS_H * (isBrandSwap ? 0.72 : isBatterySwap ? 0.75 : 0.8),
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
            color: isBrandSwap ? colors.errorRed : isDarkBrand ? "rgba(245,251,255,0.75)" : SUBTEXT_COLOR,
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
          borderTop: `1px solid rgba(${gridRgb},0.15)`,
        }}
      >
        <span
          style={{
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 500,
            fontSize: 26,
            color: isDarkBrand ? "rgba(15,191,255,0.9)" : "rgba(0,255,65,0.8)",
          }}
        >
          {channelName}
        </span>
        <span style={{ color: accent, fontSize: 22 }}>▶</span>
      </div>
    </AbsoluteFill>
  );
};
