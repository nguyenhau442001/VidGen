import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, INTER, JETBRAINS_MONO, type as t } from "../styles";
import { SafeZone } from "../SafeZone";

export interface CoverSceneProps {
  headline: string; // supports **bold** → rendered in errorRed
  body: string;
  terminalLines: string[];
}

function parseHighlight(text: string): { word: string; highlighted: boolean }[] {
  const segs: { text: string; highlighted: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), highlighted: false });
    segs.push({ text: m[1], highlighted: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last), highlighted: false });
  return segs.flatMap((s) =>
    s.text.split(/\s+/).filter(Boolean).map((word) => ({ word, highlighted: s.highlighted }))
  );
}

export const CoverScene: React.FC<CoverSceneProps> = ({ headline, body, terminalLines }) => {
  const words = parseHighlight(headline);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Red ambient glow + grid */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            left: "calc(50% - 450px)",
            top: "18%",
            background: `radial-gradient(circle, ${colors.errorRed} 0%, transparent 70%)`,
            opacity: 0.14,
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <SafeZone style={{ flexDirection: "column", alignItems: "flex-start", fontFamily: INTER }}>
        {/* Channel label */}
        <div style={{ ...t.label, color: "rgba(255,255,255,0.35)", marginBottom: 56 }}>
          60s Công Nghệ · Bảo Mật
        </div>

        {/* Red accent bar */}
        <div
          style={{
            width: 6,
            height: 64,
            backgroundColor: colors.errorRed,
            borderRadius: 3,
            marginBottom: 32,
          }}
        />

        {/* Headline — inline spans, natural wrap */}
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            fontFamily: INTER,
            marginBottom: 28,
          }}
        >
          {words.map(({ word, highlighted }, i, arr) => (
            <span key={i} style={{ color: highlighted ? colors.errorRed : colors.textPrimary }}>
              {word}
              {i < arr.length - 1 ? " " : ""}
            </span>
          ))}
        </div>

        {/* Body */}
        <div style={{ ...t.body, color: colors.textDim, fontFamily: INTER, marginBottom: 56 }}>
          {body}
        </div>

        {/* Terminal block */}
        <div
          style={{
            backgroundColor: colors.terminalBg,
            border: `1px solid ${colors.terminalBorder}`,
            borderRadius: 12,
            padding: "28px 32px",
            width: "100%",
          }}
        >
          <div style={{ ...t.label, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>
            Terminal — live
          </div>
          {terminalLines.map((line, i) => {
            const parts = line.split("←");
            return (
              <div
                key={i}
                style={{
                  ...t.terminal,
                  fontFamily: JETBRAINS_MONO,
                  display: "flex",
                  marginBottom: i < terminalLines.length - 1 ? 10 : 0,
                }}
              >
                <span style={{ color: colors.textPrimary, flex: 1 }}>{parts[0]}</span>
                {parts[1] && <span style={{ color: colors.errorRed }}>←{parts[1]}</span>}
              </div>
            );
          })}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
