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
import { PlaceIdSceneProps } from "../types";

// Deep civic-blue backdrop — distinct from PlateColorScene's asphalt palette
// since this topic is about a government ID system, not literal plate colors.
const BG = "#0a0e17";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.6)";
const PANEL = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.14)";
const ACCENT = "#3ea6ff";
const DANGER = "#ff5c5c";
const OK = "#2ecc71";

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
      <span style={{ color: ACCENT, textShadow: `0 0 26px ${ACCENT}88` }}>{accentWord}</span>
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
          background: `radial-gradient(circle, ${ACCENT}14 0%, transparent 68%)`,
          filter: "blur(22px)",
        }}
      />
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
      border: `1px solid ${ACCENT}66`,
      background: `${ACCENT}16`,
      color: ACCENT,
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

const HouseIcon: React.FC<{ size?: number; color?: string }> = ({ size = 120, color = TEXT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 11.5 12 4l9 7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <rect x={10} y={14} width={4} height={6.5} stroke={color} strokeWidth={1.8} />
  </svg>
);

const IdCardIcon: React.FC<{ size?: number; color?: string }> = ({ size = 100, color = TEXT }) => (
  <svg width={size} height={size * 0.64} viewBox="0 0 100 64" fill="none">
    <rect x={2} y={2} width={96} height={60} rx={8} stroke={color} strokeWidth={2.4} />
    <circle cx={24} cy={26} r={9} stroke={color} strokeWidth={2} />
    <path d="M12 50c0-7 5.4-11 12-11s12 4 12 11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <path d="M46 20h42M46 30h42M46 40h26" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const PersonIcon: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = TEXT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7.4" r="3.6" stroke={color} strokeWidth={1.8} />
    <path d="M4.4 20c0-4.1 3.4-6.6 7.6-6.6s7.6 2.5 7.6 6.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

const DocIcon: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = DIM }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x={4} y={2.5} width={16} height={19} rx={1.5} stroke={color} strokeWidth={1.6} />
    <path d="M7.5 7h9M7.5 11h9M7.5 15h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Mode: hook — a messy street address glitches/crosses out, replaced by a
// clean 12-digit code + VNeID badge.
// ---------------------------------------------------------------------------
const HookVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const addressOpacity = interpolate(frame, [0, 24, 40, 56], [1, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const strikeWidth = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const codeSpring = spring({ frame: frame - 52, fps, config: { stiffness: 190, damping: 18 } });
  const titleSpring = spring({ frame: frame - 20, fps, config: { stiffness: 190, damping: 17 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <Eyebrow opacity={fade(frame, 0, 12)}>ĐỊNH DANH ĐỊA ĐIỂM</Eyebrow>
      <div
        style={{
          opacity: clamp(titleSpring),
          transform: `translateY(${(1 - clamp(titleSpring)) * 24}px) scale(${0.92 + clamp(titleSpring) * 0.08})`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} fontSize={50} />
      </div>
      <Card style={{ width: 800, minHeight: 300, padding: "40px 30px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "relative", opacity: addressOpacity }}>
          <span style={{ color: DIM, fontSize: 56, fontWeight: 900, letterSpacing: 1 }}>111/35A</span>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              height: 4,
              width: `${strikeWidth * 100}%`,
              background: DANGER,
              transform: "translateY(-50%)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            opacity: clamp(codeSpring),
            transform: `scale(${0.85 + clamp(codeSpring) * 0.15})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: ACCENT, fontSize: 44, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 24px ${ACCENT}66` }}>
            091012345678
          </span>
          <span style={{ color: DIM, fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>VNEID</span>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: problem — 4 disconnected system icons, no lines between them.
// ---------------------------------------------------------------------------
type SystemBox = { label: string; icon?: "doc" | "house" };

const ProblemVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  systems: SystemBox[];
}> = ({ frame, fps, headline, accentWord, systems }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>VẤN ĐỀ</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={40} />
      <Card style={{ width: 820, minHeight: 420, padding: "36px 30px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18 }}>
        {systems.map((sys, i) => {
          const s = spring({ frame: frame - 20 - i * 14, fps, config: { stiffness: 190, damping: 18 } });
          return (
            <div
              key={sys.label}
              style={{
                opacity: clamp(s),
                transform: `translateY(${(1 - clamp(s)) * 18}px)`,
                width: 340,
                minHeight: 150,
                borderRadius: 16,
                border: `1.5px solid ${DANGER}55`,
                background: `${DANGER}0f`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "18px 14px",
              }}
            >
              <DocIcon size={44} color={DIM} />
              <span style={{ color: TEXT, fontSize: 18, fontWeight: 800, textAlign: "center" }}>{sys.label}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: id_merge — many old documents fly in and merge into one CCCD card.
// ---------------------------------------------------------------------------
const IdMergeVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const docs = [
    { x: -220, y: -90 },
    { x: 220, y: -90 },
    { x: -240, y: 60 },
    { x: 240, y: 60 },
  ];
  const mergeProgress = interpolate(frame, [20, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardSpring = spring({ frame: frame - 66, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>PHÉP SO SÁNH</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 800, minHeight: 460, padding: "40px 30px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {docs.map((d, i) => {
          const docFade = interpolate(frame, [10 + i * 4, 24 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const dissolve = interpolate(mergeProgress, [0.7, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const tx = d.x * (1 - mergeProgress);
          const ty = d.y * (1 - mergeProgress);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                opacity: docFade * dissolve,
                transform: `translate(${tx}px, ${ty}px) scale(${1 - mergeProgress * 0.3})`,
              }}
            >
              <DocIcon size={64} color={DIM} />
            </div>
          );
        })}
        <div
          style={{
            opacity: clamp(cardSpring),
            transform: `scale(${0.85 + clamp(cardSpring) * 0.15})`,
          }}
        >
          <div
            style={{
              width: 320,
              height: 200,
              borderRadius: 16,
              border: `2px solid ${ACCENT}`,
              background: `${ACCENT}14`,
              boxShadow: `0 0 40px ${ACCENT}44`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <IdCardIcon size={140} color={TEXT} />
            <span style={{ color: ACCENT, fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>1 MÃ DUY NHẤT</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: mechanism — a house/plot icon gets stamped with a 12-digit code.
// ---------------------------------------------------------------------------
const MechanismVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  metrics?: { label: string; value: string }[];
}> = ({ frame, fps, headline, accentWord, metrics }) => {
  const houseSpring = spring({ frame: frame - 10, fps, config: { stiffness: 180, damping: 18 } });
  const stampSpring = spring({ frame: frame - 46, fps, config: { stiffness: 210, damping: 16 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>CƠ CHẾ</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <Card style={{ width: 800, minHeight: 480, padding: "40px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ position: "relative", opacity: clamp(houseSpring), transform: `scale(${0.88 + clamp(houseSpring) * 0.12})` }}>
          <HouseIcon size={180} color={TEXT} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -18,
              transform: `translateX(-50%) scale(${0.7 + clamp(stampSpring) * 0.3})`,
              opacity: clamp(stampSpring),
              whiteSpace: "nowrap",
              padding: "8px 16px",
              borderRadius: 999,
              border: `2px solid ${ACCENT}`,
              background: `${ACCENT}1a`,
              color: ACCENT,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 1.5,
            }}
          >
            091012345678
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginTop: 12 }}>
          {(metrics ?? []).map((m, i) => {
            const s = spring({ frame: frame - 66 - i * 16, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div
                key={m.label}
                style={{
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 14}px)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  minHeight: 60,
                  borderRadius: 14,
                  border: `1.5px solid ${ACCENT}44`,
                  background: `${ACCENT}0f`,
                  padding: "12px 20px",
                }}
              >
                <span style={{ color: DIM, fontSize: 14, fontWeight: 800, letterSpacing: 0.4 }}>{m.label}</span>
                <span style={{ color: TEXT, fontSize: 18, fontWeight: 900, textAlign: "right" }}>{m.value}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: vneid — phone mockup showing the 12-digit code inside the VNeID app.
// ---------------------------------------------------------------------------
const VneidVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const phoneSpring = spring({ frame: frame - 12, fps, config: { stiffness: 180, damping: 18 } });
  const codeReveal = fade(frame, 50, 16);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>HIỂN THỊ TRÊN VNEID</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={38} />
      <div
        style={{
          opacity: clamp(phoneSpring),
          transform: `scale(${0.9 + clamp(phoneSpring) * 0.1})`,
          width: 320,
          minHeight: 520,
          borderRadius: 36,
          border: "6px solid rgba(255,255,255,0.16)",
          background: "#0d1420",
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "30px 22px",
          gap: 18,
          boxSizing: "border-box",
        }}
      >
        <span style={{ color: ACCENT, fontSize: 16, fontWeight: 900, letterSpacing: 1.5 }}>VNEID</span>
        <div
          style={{
            width: "100%",
            minHeight: 130,
            borderRadius: 16,
            border: `1.5px solid ${BORDER}`,
            background: PANEL,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px 10px",
          }}
        >
          <span style={{ color: DIM, fontSize: 13, fontWeight: 800, letterSpacing: 0.6 }}>MÃ ĐỊNH DANH ĐỊA ĐIỂM</span>
          <span
            style={{
              opacity: codeReveal,
              color: ACCENT,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 1.5,
              textShadow: `0 0 20px ${ACCENT}66`,
            }}
          >
            091012345678
          </span>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => {
            const s = spring({ frame: frame - 70 - i * 12, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div
                key={i}
                style={{
                  opacity: clamp(s) * 0.7,
                  height: 34,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: link_key — one central code with lines radiating to service icons,
// each lighting up green once "connected".
// ---------------------------------------------------------------------------
const LinkKeyVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  systems: SystemBox[];
}> = ({ frame, fps, headline, accentWord, systems }) => {
  const coreSpring = spring({ frame: frame - 10, fps, config: { stiffness: 190, damping: 18 } });
  const radius = 200;
  const count = systems.length || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>LỢI ÍCH THỰC TẾ</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 800, minHeight: 520, padding: "30px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <svg width={520} height={460} style={{ position: "absolute" }}>
          {systems.map((_, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const cx = 260 + Math.cos(angle) * radius;
            const cy = 230 + Math.sin(angle) * radius;
            const lineFade = fade(frame, 30 + i * 10, 16);
            const connected = fade(frame, 60 + i * 10, 14);
            return (
              <line
                key={i}
                x1={260}
                y1={230}
                x2={cx}
                y2={cy}
                stroke={connected > 0.5 ? OK : ACCENT}
                strokeWidth={2.5}
                opacity={lineFade}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 260 - 70,
            top: 230 - 70,
            width: 140,
            height: 140,
            opacity: clamp(coreSpring),
            transform: `scale(${0.85 + clamp(coreSpring) * 0.15})`,
            borderRadius: "50%",
            border: `2.5px solid ${ACCENT}`,
            background: `${ACCENT}1a`,
            boxShadow: `0 0 40px ${ACCENT}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <span style={{ color: ACCENT, fontSize: 15, fontWeight: 900, letterSpacing: 0.5 }}>1 MÃ{"\n"}KHÓA LIÊN KẾT</span>
        </div>
        {systems.map((sys, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const cx = 260 + Math.cos(angle) * radius;
          const cy = 230 + Math.sin(angle) * radius;
          const s = spring({ frame: frame - 55 - i * 10, fps, config: { stiffness: 190, damping: 18 } });
          const connected = fade(frame, 60 + i * 10, 14);
          return (
            <div
              key={sys.label}
              style={{
                position: "absolute",
                left: cx - 65,
                top: cy - 40,
                width: 130,
                minHeight: 80,
                opacity: clamp(s),
                transform: `scale(${0.85 + clamp(s) * 0.15})`,
                borderRadius: 14,
                border: `1.5px solid ${connected > 0.5 ? OK : ACCENT}66`,
                background: connected > 0.5 ? `${OK}18` : `${ACCENT}0f`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 6px",
                textAlign: "center",
              }}
            >
              <DocIcon size={30} color={connected > 0.5 ? OK : DIM} />
              <span style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>{sys.label}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

const BridgeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = DIM }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 56 34" fill="none">
    <path d="M2 26c8-14 44-14 52 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <path d="M2 26h52M10 26v6M46 26v6M28 8v18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const TempleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = DIM }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3 5 8h14L12 3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M4 8h16M6 8v11M18 8v11M4 19h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <path d="M10 19v-5h4v5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
  </svg>
);

const RiverIcon: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = DIM }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 56 34" fill="none">
    <path d="M2 10c8 6 8-6 16 0s8-6 16 0 8-6 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <path d="M2 22c8 6 8-6 16 0s8-6 16 0 8-6 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Mode: scope — camera "pulls out" from the house icon to reveal more
// location-type icons (bridge, road handled by house reuse, temple, river),
// then a big "71" count.
// ---------------------------------------------------------------------------
const ScopeVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const houseScale = interpolate(frame, [0, 30], [1.4, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const houseFade = interpolate(frame, [0, 30], [1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const icons = [
    { Icon: BridgeIcon, delay: 24 },
    { Icon: TempleIcon, delay: 36 },
    { Icon: RiverIcon, delay: 48 },
  ];
  const countSpring = spring({ frame: frame - 70, fps, config: { stiffness: 200, damping: 16 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>PHẠM VI ÁP DỤNG</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 800, minHeight: 440, padding: "36px 30px", display: "flex", alignItems: "center", justifyContent: "center", gap: 24, position: "relative" }}>
        <div style={{ opacity: houseFade, transform: `scale(${houseScale})` }}>
          <HouseIcon size={100} color={TEXT} />
        </div>
        {icons.map(({ Icon, delay }, i) => {
          const s = spring({ frame: frame - delay, fps, config: { stiffness: 190, damping: 18 } });
          return (
            <div key={i} style={{ opacity: clamp(s), transform: `translateY(${(1 - clamp(s)) * 16}px)` }}>
              <Icon size={70} color={DIM} />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            opacity: clamp(countSpring),
            transform: `scale(${0.8 + clamp(countSpring) * 0.2})`,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <span style={{ color: ACCENT, fontSize: 64, fontWeight: 900, textShadow: `0 0 24px ${ACCENT}66` }}>71</span>
          <span style={{ color: DIM, fontSize: 16, fontWeight: 800 }}>LOẠI ĐỊA ĐIỂM</span>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: permanence — a fixed house + 12-digit code in the centre while the
// "owner" icon above it swaps (person A fades out, person B fades in). The
// code never flickers: it belongs to the land, not the owner.
// ---------------------------------------------------------------------------
const PermanenceVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const houseSpring = spring({ frame: frame - 10, fps, config: { stiffness: 180, damping: 18 } });
  // Three owner "generations" cross-fade over the scene.
  const owners = ["Chủ A", "Chủ B", "Chủ C"];
  const cycle = 46;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>TÍNH ỔN ĐỊNH</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 780, minHeight: 460, padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, position: "relative" }}>
        <div style={{ position: "relative", height: 92, width: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {owners.map((name, i) => {
            const start = 20 + i * cycle;
            const o = interpolate(
              frame,
              [start, start + 12, start + cycle - 12, start + cycle],
              i === owners.length - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={name}
                style={{
                  position: "absolute",
                  opacity: o,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <PersonIcon size={52} color={DIM} />
                <span style={{ color: DIM, fontSize: 15, fontWeight: 800 }}>{name}</span>
              </div>
            );
          })}
        </div>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
          <path d="M12 5v14M6 13l6 6 6-6" stroke={DIM} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ position: "relative", opacity: clamp(houseSpring), transform: `scale(${0.9 + clamp(houseSpring) * 0.1})` }}>
          <HouseIcon size={150} color={TEXT} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -16,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              padding: "8px 16px",
              borderRadius: 999,
              border: `2px solid ${ACCENT}`,
              background: `${ACCENT}1a`,
              color: ACCENT,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 1.5,
            }}
          >
            091012345678
          </div>
        </div>
        <span style={{ color: OK, fontSize: 15, fontWeight: 900, letterSpacing: 0.6, marginTop: 14 }}>
          MÃ KHÔNG ĐỔI
        </span>
      </Card>
    </div>
  );
};

const WaterTowerIcon: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = TEXT }) => (
  // Stylised Turtle Tower (Tháp Rùa) on water — for the Hồ Gươm beat.
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M18 30h12v-3l-2-2h-8l-2 2v3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M20 25v-4h8v4M22 21v-4h4v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <path d="M16 30h16v6H16z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M4 40c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const BayIcon: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = TEXT }) => (
  // Karst islets rising from water — for the Hạ Long beat.
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M8 34c3-10 7-16 10-16s5 4 6 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 34c2-8 5-13 8-13s6 6 8 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 40c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const ShieldIcon: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = ACCENT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Mode: landmark — iconic public places (Hồ Gươm, Hạ Long) each get stamped
// with a 12-digit code; a "BỘ CÔNG AN" badge shows who runs the database.
// ---------------------------------------------------------------------------
const LandmarkVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const items = [
    { Icon: WaterTowerIcon, label: "Hồ Gươm", delay: 16 },
    { Icon: BayIcon, label: "Vịnh Hạ Long", delay: 34 },
  ];
  const badgeSpring = spring({ frame: frame - 66, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>KHÔNG CHỈ NHÀ ĐẤT</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 800, minHeight: 460, padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ display: "flex", gap: 30, alignItems: "flex-start", justifyContent: "center" }}>
          {items.map(({ Icon, label, delay }) => {
            const s = spring({ frame: frame - delay, fps, config: { stiffness: 190, damping: 18 } });
            const codeFade = fade(frame, delay + 20, 14);
            return (
              <div
                key={label}
                style={{
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 16}px)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  width: 300,
                  minHeight: 200,
                  borderRadius: 16,
                  border: `1.5px solid ${ACCENT}44`,
                  background: `${ACCENT}0d`,
                  padding: "20px 14px",
                  boxSizing: "border-box",
                }}
              >
                <Icon size={92} color={TEXT} />
                <span style={{ color: TEXT, fontSize: 18, fontWeight: 900 }}>{label}</span>
                <span
                  style={{
                    opacity: codeFade,
                    color: ACCENT,
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    textShadow: `0 0 18px ${ACCENT}55`,
                  }}
                >
                  091012345678
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            opacity: clamp(badgeSpring),
            transform: `translateY(${(1 - clamp(badgeSpring)) * 14}px)`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 22px",
            borderRadius: 999,
            border: `1.5px solid ${BORDER}`,
            background: PANEL,
          }}
        >
          <ShieldIcon size={30} color={ACCENT} />
          <span style={{ color: TEXT, fontSize: 16, fontWeight: 900, letterSpacing: 0.8 }}>
            KHO DỮ LIỆU · BỘ CÔNG AN QUẢN LÝ
          </span>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: access — one or two labeled access-tier cards (free / by-function /
// paid), reused for both the "who's free" and "who pays" beats.
// ---------------------------------------------------------------------------
type AccessTier = { label: string; detail: string; tone: "free" | "paid" };

const AccessVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  tiers: AccessTier[];
}> = ({ frame, fps, headline, accentWord, tiers }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>QUYỀN KHAI THÁC DỮ LIỆU</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 800, minHeight: 400, padding: "36px 30px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {tiers.map((tier, i) => {
          const s = spring({ frame: frame - 18 - i * 22, fps, config: { stiffness: 190, damping: 18 } });
          const tone = tier.tone === "free" ? OK : DANGER;
          return (
            <div
              key={tier.label}
              style={{
                opacity: clamp(s),
                transform: `translateY(${(1 - clamp(s)) * 16}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                minHeight: 84,
                borderRadius: 16,
                border: `1.5px solid ${tone}66`,
                background: `${tone}14`,
                padding: "16px 22px",
              }}
            >
              <span style={{ color: TEXT, fontSize: 19, fontWeight: 900 }}>{tier.label}</span>
              <span style={{ color: tone, fontSize: 16, fontWeight: 800, textAlign: "right" }}>{tier.detail}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = ACCENT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x={5} y={11} width={14} height={10} rx={2} stroke={color} strokeWidth={1.8} />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <circle cx={12} cy={16} r={1.6} fill={color} />
  </svg>
);

// ---------------------------------------------------------------------------
// Mode: privacy — the 12-digit code sits in a locked box; outward arrows
// trying to leave the box are blocked at the border.
// ---------------------------------------------------------------------------
const PrivacyVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const lockSpring = spring({ frame: frame - 10, fps, config: { stiffness: 190, damping: 18 } });
  const boxSpring = spring({ frame: frame - 24, fps, config: { stiffness: 180, damping: 18 } });
  const arrowAngles = [-60, 0, 60, 180];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>QUYỀN RIÊNG TƯ</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={36} />
      <Card style={{ width: 780, minHeight: 420, padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, position: "relative" }}>
        <div style={{ opacity: clamp(lockSpring), transform: `translateY(${(1 - clamp(lockSpring)) * -10}px)` }}>
          <LockIcon size={54} color={ACCENT} />
        </div>
        <div
          style={{
            position: "relative",
            opacity: clamp(boxSpring),
            transform: `scale(${0.9 + clamp(boxSpring) * 0.1})`,
            width: 300,
            height: 160,
            borderRadius: 16,
            border: `2px solid ${ACCENT}`,
            background: `${ACCENT}14`,
            boxShadow: `0 0 40px ${ACCENT}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: ACCENT, fontSize: 26, fontWeight: 900, letterSpacing: 1.5 }}>091012345678</span>
          {arrowAngles.map((angle, i) => {
            const outFade = fade(frame, 50 + i * 8, 14);
            const blockFade = fade(frame, 66 + i * 8, 12);
            const rad = (angle * Math.PI) / 180;
            const dist = 90 + outFade * 40;
            const blocked = blockFade > 0.4;
            const arrowColor = blocked ? DANGER : DIM;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px) rotate(${angle}deg)`,
                  opacity: outFade,
                }}
              >
                {blocked ? (
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke={arrowColor} strokeWidth={2.6} strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width={26} height={16} viewBox="0 0 26 16" fill="none">
                    <path d="M0 8h22M15 1l8 7-8 7" stroke={arrowColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: cta — split screen: person's CCCD on left, house's 12-digit tag on
// right, lighting up symmetrically.
// ---------------------------------------------------------------------------
const CtaVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const leftSpring = spring({ frame: frame - 16, fps, config: { stiffness: 190, damping: 18 } });
  const rightSpring = spring({ frame: frame - 30, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>MỜI THEO DÕI</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={34} />
      <Card style={{ width: 820, minHeight: 420, padding: "40px 30px", display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div
          style={{
            opacity: clamp(leftSpring),
            transform: `translateX(${(1 - clamp(leftSpring)) * -26}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <PersonIcon size={70} color={ACCENT} />
          <IdCardIcon size={140} color={TEXT} />
          <span style={{ color: DIM, fontSize: 14, fontWeight: 800 }}>NGƯỜI · CCCD</span>
        </div>
        <div style={{ width: 2, alignSelf: "stretch", background: BORDER }} />
        <div
          style={{
            opacity: clamp(rightSpring),
            transform: `translateX(${(1 - clamp(rightSpring)) * 26}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <HouseIcon size={90} color={ACCENT} />
          <span style={{ color: ACCENT, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>091012345678</span>
          <span style={{ color: DIM, fontSize: 14, fontWeight: 800 }}>ĐỊA ĐIỂM · MÃ 12 SỐ</span>
        </div>
      </Card>
    </div>
  );
};

export const PlaceIdScene: React.FC<PlaceIdSceneProps> = ({
  mode,
  headline,
  accentWord,
  systems,
  metrics,
  tiers,
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
    if (mode === "problem")
      return <ProblemVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} systems={systems ?? []} />;
    if (mode === "id_merge") return <IdMergeVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "mechanism")
      return <MechanismVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} metrics={metrics} />;
    if (mode === "vneid") return <VneidVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "link_key")
      return <LinkKeyVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} systems={systems ?? []} />;
    if (mode === "privacy") return <PrivacyVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "scope") return <ScopeVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "permanence")
      return <PermanenceVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "landmark")
      return <LandmarkVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "access")
      return <AccessVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} tiers={tiers ?? []} />;
    return <CtaVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, opacity: exit, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
    </AbsoluteFill>
  );
};

export default PlaceIdScene;
