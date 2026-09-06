import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { PlateColorSceneProps } from "../types";

// Asphalt-at-night backdrop so each plate card's real color (white/blue/red/
// yellow/NG) reads as the dominant hue on screen instead of competing with a
// themed accent palette like other bespoke scenes use.
const BG = "#0b0d10";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.6)";
const PANEL = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.14)";
const NEUTRAL_ACCENT = "#f0a830";

// Real plate colors — background + text, per research (Thông tư 79/2024/TT-BCA,
// Thông tư 169/2021/TT-BQP, Thông tư liên bộ 01/1988). Do not alter these hexes
// without re-checking input/research/bien-so-xe-mau-sac/source-log.md.
const PLATE_COLORS = {
  white: { bg: "#f5f5f0", text: "#161616" },
  blue: { bg: "#1a5fb4", text: "#ffffff" },
  red: { bg: "#c0201f", text: "#ffffff" },
  yellow: { bg: "#f2c230", text: "#161616" },
  ng: { bg: "#f5f5f0", text: "#161616", markText: "#c0201f" },
} as const;

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const fade = (frame: number, start: number, duration = 14): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const accentText = (text: string, accentWord?: string): React.ReactNode => {
  if (!accentWord || !text.includes(accentWord)) return text;
  const index = text.indexOf(accentWord);
  return (
    <>
      {text.slice(0, index)}
      <span style={{ color: NEUTRAL_ACCENT, textShadow: `0 0 26px ${NEUTRAL_ACCENT}88` }}>{accentWord}</span>
      {text.slice(index + accentWord.length)}
    </>
  );
};

const Backdrop: React.FC<{ frame: number }> = ({ frame }) => {
  const drift = Math.sin(frame * 0.014) * 26;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          left: -160 + drift,
          top: 140,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${NEUTRAL_ACCENT}14 0%, transparent 68%)`,
          filter: "blur(22px)",
        }}
      />
      {/* faint road-lane dashes to suggest asphalt without literal photo */}
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: 220 + i * 320,
            width: 6,
            height: 60,
            marginLeft: -3,
            borderRadius: 3,
            background: "rgba(255,255,255,0.05)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <div
    style={{
      opacity,
      alignSelf: "center",
      minHeight: 38,
      padding: "8px 18px",
      borderRadius: 999,
      border: `1px solid ${NEUTRAL_ACCENT}66`,
      background: `${NEUTRAL_ACCENT}16`,
      color: NEUTRAL_ACCENT,
      fontSize: 15,
      fontWeight: 800,
      letterSpacing: 1.2,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

const Headline: React.FC<{ text: string; accentWord?: string; opacity?: number; fontSize?: number }> = ({
  text,
  accentWord,
  opacity = 1,
  fontSize = 44,
}) => (
  <div
    style={{
      opacity,
      width: "100%",
      color: TEXT,
      fontSize,
      fontWeight: 900,
      lineHeight: 1.16,
      letterSpacing: "-0.03em",
      textAlign: "center",
      whiteSpace: "pre-line",
    }}
  >
    {accentText(text, accentWord)}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      borderRadius: 24,
      border: `1.5px solid ${BORDER}`,
      background: PANEL,
      boxShadow: "0 22px 60px rgba(0,0,0,0.35)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Plate icon — a literal license-plate rectangle rendered in the real color
// pair for the given key, with two big letters as the "ký hiệu" callout.
// ---------------------------------------------------------------------------
const PlateIcon: React.FC<{
  colorKey: keyof typeof PLATE_COLORS;
  width?: number;
  height?: number;
  code?: string; // e.g. "AA", "NG" — overrides default corner mark
  scale?: number;
}> = ({ colorKey, width = 220, height = 120, code, scale = 1 }) => {
  const c = PLATE_COLORS[colorKey];
  const markColor = colorKey === "ng" ? PLATE_COLORS.ng.markText : c.text;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 10,
        background: c.bg,
        border: "3px solid rgba(0,0,0,0.25)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
      }}
    >
      <span style={{ color: markColor, fontSize: height * 0.42, fontWeight: 900, letterSpacing: 1 }}>
        {code ?? "51A"}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: hook — plates of all colors sweeping past
// ---------------------------------------------------------------------------
const HookVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const order: (keyof typeof PLATE_COLORS)[] = ["white", "blue", "red", "yellow", "ng"];
  const titleSpring = spring({ frame: frame - 10, fps, config: { stiffness: 190, damping: 17 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <Eyebrow opacity={fade(frame, 0, 12)}>BIỂN SỐ XE Ô TÔ</Eyebrow>
      <div
        style={{
          opacity: clamp(titleSpring),
          transform: `translateY(${(1 - clamp(titleSpring)) * 24}px) scale(${0.92 + clamp(titleSpring) * 0.08})`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} fontSize={54} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, width: 780 }}>
        {order.map((key, i) => {
          const s = spring({ frame: frame - 30 - i * 8, fps, config: { stiffness: 200, damping: 20 } });
          return (
            <div
              key={key}
              style={{
                opacity: clamp(s),
                transform: `translateY(${(1 - clamp(s)) * 22}px) scale(${0.85 + clamp(s) * 0.15})`,
              }}
            >
              <PlateIcon colorKey={key} width={168} height={92} code={key === "ng" ? "NG" : undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: question — two plates (blue/red) side by side with a big "?"
// ---------------------------------------------------------------------------
const QuestionVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const leftSpring = spring({ frame: frame - 14, fps, config: { stiffness: 180, damping: 18 } });
  const rightSpring = spring({ frame: frame - 30, fps, config: { stiffness: 180, damping: 18 } });
  const qFade = fade(frame, 50, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)}>CÂU HỎI BẬT RA</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={46} />
      <Card style={{ width: 780, minHeight: 420, padding: "40px 30px", display: "flex", alignItems: "center", justifyContent: "center", gap: 46, position: "relative" }}>
        <div style={{ opacity: clamp(leftSpring), transform: `translateX(${(1 - clamp(leftSpring)) * -30}px)` }}>
          <PlateIcon colorKey="blue" width={240} height={132} />
        </div>
        <div
          style={{
            position: "absolute",
            opacity: qFade,
            color: NEUTRAL_ACCENT,
            fontSize: 72,
            fontWeight: 900,
            textShadow: `0 0 30px ${NEUTRAL_ACCENT}88`,
          }}
        >
          ?
        </div>
        <div style={{ opacity: clamp(rightSpring), transform: `translateX(${(1 - clamp(rightSpring)) * 30}px)` }}>
          <PlateIcon colorKey="red" width={240} height={132} />
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: color_reveal — one large plate card + owner-category label + source
// ---------------------------------------------------------------------------
type PlateOwnerLine = { label: string; value: string };

const ColorRevealVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  colorKey: keyof typeof PLATE_COLORS;
  plateCode?: string;
  ownerLines?: PlateOwnerLine[];
  sourceLabel?: string;
  eyebrow: string;
}> = ({ frame, fps, headline, accentWord, colorKey, plateCode, ownerLines, sourceLabel, eyebrow }) => {
  const plateSpring = spring({ frame: frame - 18, fps, config: { stiffness: 180, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>{eyebrow}</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={40} />
      <Card style={{ width: 800, minHeight: 480, padding: "40px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div
          style={{
            opacity: clamp(plateSpring),
            transform: `scale(${0.88 + clamp(plateSpring) * 0.12})`,
          }}
        >
          <PlateIcon colorKey={colorKey} width={300} height={162} code={plateCode} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          {(ownerLines ?? []).map((line, i) => {
            const s = spring({ frame: frame - 48 - i * 16, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div
                key={line.label}
                style={{
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 14}px)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  minHeight: 60,
                  borderRadius: 14,
                  border: `1.5px solid ${NEUTRAL_ACCENT}44`,
                  background: `${NEUTRAL_ACCENT}0f`,
                  padding: "12px 20px",
                }}
              >
                <span style={{ color: DIM, fontSize: 14, fontWeight: 800, letterSpacing: 0.4 }}>{line.label}</span>
                <span style={{ color: TEXT, fontSize: 18, fontWeight: 900, textAlign: "right" }}>{line.value}</span>
              </div>
            );
          })}
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{sourceLabel}</div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: military_code — zoom into a red plate's 2-letter code, decode reveal
// ---------------------------------------------------------------------------
const MilitaryCodeVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  code: string; // e.g. "AA"
  unitLabel: string; // e.g. "QUÂN ĐOÀN 1"
  sourceLabel?: string;
}> = ({ frame, fps, headline, accentWord, code, unitLabel, sourceLabel }) => {
  const plateSpring = spring({ frame: frame - 12, fps, config: { stiffness: 180, damping: 18 } });
  const zoomProgress = interpolate(frame, [40, 78], [1, 1.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const decodeReveal = fade(frame, 82, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>BIỂN ĐỎ · QUÂN ĐỘI</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 800, minHeight: 500, padding: "40px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div
          style={{
            opacity: clamp(plateSpring),
            transform: `scale(${(0.88 + clamp(plateSpring) * 0.12) * zoomProgress})`,
          }}
        >
          <PlateIcon colorKey="red" width={300} height={162} code={code} />
        </div>
        <div
          style={{
            opacity: decodeReveal,
            transform: `translateY(${(1 - decodeReveal) * 16}px)`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            minHeight: 74,
            width: "100%",
            borderRadius: 16,
            border: `2px solid ${NEUTRAL_ACCENT}88`,
            background: `${NEUTRAL_ACCENT}14`,
            padding: "16px 26px",
            justifyContent: "center",
          }}
        >
          <span style={{ color: NEUTRAL_ACCENT, fontSize: 26, fontWeight: 900 }}>{code}</span>
          <span style={{ color: DIM, fontSize: 22 }}>=</span>
          <span style={{ color: TEXT, fontSize: 24, fontWeight: 900 }}>{unitLabel}</span>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center", opacity: decodeReveal }}>
            {sourceLabel}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: code_grid — small list of code -> meaning rows, staggered reveal
// (used for extra military-unit examples and QT/CV/NN diplomatic sub-codes)
// ---------------------------------------------------------------------------
type CodeGridRow = { code: string; meaning: string };

const CodeGridVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  eyebrow: string;
  rows: CodeGridRow[];
  sourceLabel?: string;
}> = ({ frame, fps, headline, accentWord, eyebrow, rows, sourceLabel }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <Eyebrow opacity={fade(frame, 0)}>{eyebrow}</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 800, minHeight: 440, padding: "34px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((row, i) => {
          const s = spring({ frame: frame - 20 - i * 22, fps, config: { stiffness: 190, damping: 18 } });
          return (
            <div
              key={row.code}
              style={{
                opacity: clamp(s),
                transform: `translateX(${(1 - clamp(s)) * -22}px)`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                minHeight: 78,
                borderRadius: 16,
                border: `1.5px solid ${NEUTRAL_ACCENT}55`,
                background: `${NEUTRAL_ACCENT}0f`,
                padding: "14px 22px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  minWidth: 78,
                  textAlign: "center",
                  color: NEUTRAL_ACCENT,
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {row.code}
              </div>
              <div style={{ color: TEXT, fontSize: 19, fontWeight: 800, textAlign: "left" }}>{row.meaning}</div>
            </div>
          );
        })}
        {sourceLabel ? (
          <div style={{ marginTop: 4, color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
            {sourceLabel}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: diplomatic_exception — two columns: immunity vs exception
// ---------------------------------------------------------------------------
const DiplomaticExceptionVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  immunityLabel: string;
  exceptionLabel: string;
  sourceLabel?: string;
}> = ({ frame, fps, headline, accentWord, immunityLabel, exceptionLabel, sourceLabel }) => {
  const plateSpring = spring({ frame: frame - 14, fps, config: { stiffness: 180, damping: 18 } });
  const leftSpring = spring({ frame: frame - 40, fps, config: { stiffness: 190, damping: 18 } });
  const rightSpring = spring({ frame: frame - 60, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <Eyebrow opacity={fade(frame, 0)}>BIỂN NG · NGOẠI GIAO</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 820, minHeight: 500, padding: "36px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ opacity: clamp(plateSpring), transform: `scale(${0.88 + clamp(plateSpring) * 0.12})` }}>
          <PlateIcon colorKey="ng" width={260} height={140} code="NG" />
        </div>
        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <div
            style={{
              flex: 1,
              opacity: clamp(leftSpring),
              transform: `translateY(${(1 - clamp(leftSpring)) * 16}px)`,
              borderRadius: 16,
              border: `1.5px solid ${NEUTRAL_ACCENT}66`,
              background: `${NEUTRAL_ACCENT}14`,
              padding: "18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ color: NEUTRAL_ACCENT, fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>MIỄN TRỪ</div>
            <div style={{ color: TEXT, fontSize: 17, fontWeight: 800, lineHeight: 1.35 }}>{immunityLabel}</div>
          </div>
          <div
            style={{
              flex: 1,
              opacity: clamp(rightSpring),
              transform: `translateY(${(1 - clamp(rightSpring)) * 16}px)`,
              borderRadius: 16,
              border: "1.5px solid rgba(192,32,31,0.66)",
              background: "rgba(192,32,31,0.14)",
              padding: "18px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ color: "#ff6b6b", fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>NGOẠI LỆ</div>
            <div style={{ color: TEXT, fontSize: 17, fontWeight: 800, lineHeight: 1.35 }}>{exceptionLabel}</div>
          </div>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{sourceLabel}</div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: identity_bind — plate detaches from the car icon and binds to a
// person icon instead, then re-attaches to a different car (owner keeps it).
// ---------------------------------------------------------------------------
const PersonIcon: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = TEXT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7.4" r="3.6" stroke={color} strokeWidth={1.8} />
    <path d="M4.4 20c0-4.1 3.4-6.6 7.6-6.6s7.6 2.5 7.6 6.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

const CarIcon: React.FC<{ size?: number; color?: string; opacity?: number }> = ({
  size = 90,
  color = DIM,
  opacity = 1,
}) => (
  <svg width={size} height={size * 0.55} viewBox="0 0 90 50" fill="none" style={{ opacity }}>
    <path
      d="M10 34 14 18h20l10 16h30a4 4 0 0 1 4 4v6H6v-6a4 4 0 0 1 4-4Z"
      stroke={color}
      strokeWidth={2.4}
      strokeLinejoin="round"
    />
    <circle cx="24" cy="40" r="6" stroke={color} strokeWidth={2.4} />
    <circle cx="66" cy="40" r="6" stroke={color} strokeWidth={2.4} />
  </svg>
);

const IdentityBindVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  yearLabel: string;
  sourceLabel?: string;
}> = ({ frame, fps, headline, accentWord, yearLabel, sourceLabel }) => {
  const oldCarFade = interpolate(frame, [10, 40], [1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const plateDetach = interpolate(frame, [24, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const personSpring = spring({ frame: frame - 30, fps, config: { stiffness: 190, damping: 18 } });
  const newCarSpring = spring({ frame: frame - 72, fps, config: { stiffness: 190, damping: 18 } });
  const tagReveal = fade(frame, 100, 18);
  // plate travels from old-car position (left) up toward the person, then
  // back down toward the new-car position (right) as newCarSpring rises.
  const plateX = interpolate(plateDetach, [0, 1], [-190, 0]) + clamp(newCarSpring) * 190;
  const plateY = interpolate(plateDetach, [0, 1], [30, -70]) + clamp(newCarSpring) * 70;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <Eyebrow opacity={fade(frame, 0)}>BIỂN SỐ ĐỊNH DANH</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 820, minHeight: 460, padding: "40px 30px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", position: "relative", height: 200 }}>
          <div style={{ opacity: oldCarFade }}>
            <CarIcon size={200} color={DIM} />
          </div>
          <div style={{ opacity: clamp(personSpring), transform: `translateY(${(1 - clamp(personSpring)) * 14}px)` }}>
            <PersonIcon size={70} color={NEUTRAL_ACCENT} />
          </div>
          <div style={{ opacity: clamp(newCarSpring) }}>
            <CarIcon size={200} color={TEXT} />
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              transform: `translate(${plateX}px, ${plateY}px)`,
            }}
          >
            <PlateIcon colorKey="white" width={130} height={70} />
          </div>
        </div>
        <div
          style={{
            opacity: tagReveal,
            minWidth: 320,
            minHeight: 60,
            borderRadius: 999,
            border: `2px solid ${NEUTRAL_ACCENT}`,
            background: `${NEUTRAL_ACCENT}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 22px",
          }}
        >
          <span style={{ color: NEUTRAL_ACCENT, fontSize: 18, fontWeight: 900 }}>BÁN XE → THU HỒI, GIỮ 5 NĂM</span>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{sourceLabel}</div>
        ) : null}
      </Card>
      <div style={{ color: DIM, fontSize: 14, fontWeight: 700 }}>{yearLabel}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: conversion_fact — plate morphs white -> yellow with a year stamp
// ---------------------------------------------------------------------------
const ConversionFactVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  yearLabel: string;
  sourceLabel?: string;
}> = ({ frame, fps, headline, accentWord, yearLabel, sourceLabel }) => {
  const morphProgress = interpolate(frame, [30, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowFade = fade(frame, 20, 14);
  const yearSpring = spring({ frame: frame - 96, fps, config: { stiffness: 200, damping: 18 } });
  const plateWhite = PLATE_COLORS.white;
  const plateYellow = PLATE_COLORS.yellow;
  const bg = interpolateColor(morphProgress, plateWhite.bg, plateYellow.bg);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>SỰ THẬT ĐÃ TỪNG ĐỔI</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 800, minHeight: 460, padding: "40px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 260,
              height: 140,
              borderRadius: 10,
              background: bg,
              border: "3px solid rgba(0,0,0,0.25)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#161616", fontSize: 58, fontWeight: 900 }}>51A</span>
          </div>
        </div>
        <div style={{ opacity: arrowFade, color: DIM, fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>
          TRẮNG → VÀNG
        </div>
        <div
          style={{
            opacity: clamp(yearSpring),
            transform: `scale(${0.9 + clamp(yearSpring) * 0.1})`,
            minWidth: 220,
            minHeight: 66,
            borderRadius: 999,
            border: `2px solid ${NEUTRAL_ACCENT}`,
            background: `${NEUTRAL_ACCENT}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: NEUTRAL_ACCENT, fontSize: 26, fontWeight: 900 }}>{yearLabel}</span>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{sourceLabel}</div>
        ) : null}
      </Card>
    </div>
  );
};

function interpolateColor(t: number, from: string, to: string): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Mode: cta — row of all 5 plates lighting up together
// ---------------------------------------------------------------------------
const CtaVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const order: (keyof typeof PLATE_COLORS)[] = ["white", "blue", "red", "yellow", "ng"];
  const rowSpring = spring({ frame: frame - 20, fps, config: { stiffness: 180, damping: 20 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)}>MỜI FOLLOW</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <div
        style={{
          display: "flex",
          gap: 14,
          opacity: clamp(rowSpring),
          transform: `translateY(${(1 - clamp(rowSpring)) * 16}px)`,
        }}
      >
        {order.map((key) => (
          <PlateIcon key={key} colorKey={key} width={130} height={70} code={key === "ng" ? "NG" : undefined} />
        ))}
      </div>
    </div>
  );
};

type PlateColorMetric = { label: string; value: string };

export const PlateColorScene: React.FC<PlateColorSceneProps> = ({
  mode,
  headline,
  accentWord,
  colorKey,
  plateCode,
  eyebrow,
  metrics,
  codeGridRows,
  militaryCode,
  militaryUnitLabel,
  diplomaticImmunityLabel,
  diplomaticExceptionLabel,
  conversionYearLabel,
  sourceLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [Math.max(0, durationInFrames - 10), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const content = (() => {
    if (mode === "hook") return <HookVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "question") return <QuestionVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "color_reveal")
      return (
        <ColorRevealVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          colorKey={colorKey ?? "white"}
          plateCode={plateCode}
          ownerLines={metrics as PlateColorMetric[] | undefined}
          sourceLabel={sourceLabel}
          eyebrow={eyebrow ?? "GIẢI MÃ MÀU BIỂN"}
        />
      );
    if (mode === "code_grid")
      return (
        <CodeGridVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          eyebrow={eyebrow ?? "KÝ HIỆU"}
          rows={(codeGridRows ?? []) as CodeGridRow[]}
          sourceLabel={sourceLabel}
        />
      );
    if (mode === "military_code")
      return (
        <MilitaryCodeVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          code={militaryCode ?? "AA"}
          unitLabel={militaryUnitLabel ?? "QUÂN ĐOÀN 1"}
          sourceLabel={sourceLabel}
        />
      );
    if (mode === "diplomatic_exception")
      return (
        <DiplomaticExceptionVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          immunityLabel={diplomaticImmunityLabel ?? ""}
          exceptionLabel={diplomaticExceptionLabel ?? ""}
          sourceLabel={sourceLabel}
        />
      );
    if (mode === "identity_bind")
      return (
        <IdentityBindVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          yearLabel={conversionYearLabel ?? "2023"}
          sourceLabel={sourceLabel}
        />
      );
    if (mode === "conversion_fact")
      return (
        <ConversionFactVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          yearLabel={conversionYearLabel ?? "2021"}
          sourceLabel={sourceLabel}
        />
      );
    return <CtaVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, opacity: exit, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
    </AbsoluteFill>
  );
};

export default PlateColorScene;
