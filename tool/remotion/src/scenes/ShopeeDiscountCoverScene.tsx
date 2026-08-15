import React from "react";
import { AbsoluteFill } from "remotion";
import { BE_VIETNAM_PRO } from "../styles";
import { hash01 } from "./shared/cinematicPrimitives";

// Static cover (durationInFrames: 1, rendered via `remotion still`) for
// shopee_discount_who_pays — built as its own scene per owner request rather
// than reusing CharacterIconCoverScene, since the brief called for a denser,
// emoji-forward Gen-Z cover than that component's fixed mobile-mockup layout
// supports.

const ACCENT = "#EE4D2D";

const FLOAT_EMOJI = ["🛍️", "🏷️", "💸", "👗", "👟", "📦", "🧴", "🔥"];

// Text block (headline + accent lines + tag chips) occupies roughly this
// vertical band across nearly the full width — keep floating emoji out of
// it so nothing overlaps the copy. Particles that land inside get pushed
// into the clear top or bottom strip instead (their x is left alone).
const TEXT_ZONE_Y_MIN = 34;
const TEXT_ZONE_Y_MAX = 68;

const particles = Array.from({ length: FLOAT_EMOJI.length * 2 }, (_, i) => {
  const x = hash01(i * 3.7) * 100;
  let y = hash01(i * 6.1 + 2) * 100;
  if (y > TEXT_ZONE_Y_MIN && y < TEXT_ZONE_Y_MAX) {
    const toTop = hash01(i * 8.3 + 5) < 0.5;
    y = toTop ? hash01(i * 2.3 + 7) * 12 : 84 + hash01(i * 2.3 + 7) * 13;
  }
  return {
    x,
    y,
    size: 30 + hash01(i * 4.9 + 4) * 26,
    rot: (hash01(i * 5.5 + 6) - 0.5) * 40,
    emoji: FLOAT_EMOJI[i % FLOAT_EMOJI.length],
  };
});

export type ShopeeDiscountCoverLine = { text: string; accent?: boolean };

export type ShopeeDiscountCoverProps = {
  eyebrowText?: string;
  lines?: ShopeeDiscountCoverLine[];
  tags?: string[];
};

const DEFAULT_TAGS = [
  "1.1", "2.2", "3.3", "4.4", "5.5", "6.6",
  "7.7", "8.8", "9.9", "10.10", "11.11", "12.12",
];

const DEFAULT_LINES: ShopeeDiscountCoverLine[] = [
  { text: "TẠI SAO SHOPEE LUÔN" },
  { text: "KHUYẾN MÃI VÀO" },
  { text: "NGÀY ĐÔI", accent: true },
  { text: "& NGÀY LƯƠNG VỀ?", accent: true },
];

export const ShopeeDiscountCoverScene: React.FC<ShopeeDiscountCoverProps> = ({
  eyebrowText,
  lines = DEFAULT_LINES,
  tags = DEFAULT_TAGS,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 34%, ${ACCENT}55 0%, #170a06 55%, #0a0505 100%)`,
        fontFamily: BE_VIETNAM_PRO,
        overflow: "hidden",
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            transform: `rotate(${p.rot}deg)`,
            opacity: 0.85,
            filter: `drop-shadow(0 0 18px ${ACCENT}99)`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 60 }}>
        {eyebrowText && (
          <div
            style={{
              padding: "10px 26px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1,
              marginBottom: 46,
            }}
          >
            {eyebrowText}
          </div>
        )}

        <div
          style={{
            width: 920,
            maxWidth: "94%",
            textAlign: "center",
            fontSize: 62,
            fontWeight: 900,
            lineHeight: 1.22,
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.accent ? ACCENT : "#fff",
                textShadow: line.accent ? `0 0 40px ${ACCENT}` : "0 8px 30px rgba(0,0,0,0.55)",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 44,
            width: 780,
            maxWidth: "94%",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                background: `${ACCENT}22`,
                border: `2px solid ${ACCENT}`,
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: `0 0 30px ${ACCENT}55`,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ShopeeDiscountCoverScene;
