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
import { RatingThresholdSceneProps } from "../types";

const ACCENT = "#ff5470";
const CYAN = "#61dafb";
const BG = "#0a0a0f";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.58)";
const PANEL = "rgba(255,255,255,0.055)";
const BORDER = "rgba(255,255,255,0.14)";
const MUTED = "rgba(255,255,255,0.09)";
const SAFE = "#3ddc84";
const WARN = "#ffb454";

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
  const drift = Math.sin(frame * 0.018) * 34;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          left: -170 + drift,
          top: 140,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 68%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -160 - drift * 0.7,
          bottom: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${CYAN}18 0%, transparent 70%)`,
          filter: "blur(28px)",
        }}
      />
      {Array.from({ length: 16 }, (_, i) => {
        const x = (i * 191) % 1000;
        const y = 100 + ((i * 337) % 1560);
        const opacity = 0.06 + 0.07 * (0.5 + 0.5 * Math.sin(frame * 0.033 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              borderRadius: "50%",
              background: ACCENT,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; opacity?: number; tone?: "accent" | "cyan" }> = ({
  children,
  opacity = 1,
  tone = "accent",
}) => {
  const color = tone === "cyan" ? CYAN : ACCENT;
  return (
    <div
      style={{
        opacity,
        alignSelf: "center",
        minHeight: 38,
        padding: "8px 18px",
        borderRadius: 999,
        border: `1px solid ${color}66`,
        background: `${color}16`,
        color,
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
};

const Headline: React.FC<{
  text: string;
  accentWord?: string;
  opacity?: number;
  fontSize?: number;
}> = ({ text, accentWord, opacity = 1, fontSize = 52 }) => (
  <div
    style={{
      opacity,
      width: "100%",
      color: TEXT,
      fontSize,
      fontWeight: 900,
      lineHeight: 1.14,
      letterSpacing: "-0.035em",
      textAlign: "center",
      whiteSpace: "pre",
    }}
  >
    {accentText(text, accentWord)}
  </div>
);

const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
}> = ({ children, style, accent = false }) => (
  <div
    style={{
      borderRadius: 24,
      border: `1.5px solid ${accent ? `${ACCENT}99` : BORDER}`,
      background: accent ? `${ACCENT}12` : PANEL,
      boxShadow: accent ? `0 0 38px ${ACCENT}1f` : "0 22px 60px rgba(0,0,0,0.3)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Mode 1 — Hook: threatened driver, star icon looming
// ---------------------------------------------------------------------------
const HookVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const titleSpring = spring({ frame: frame - 8, fps, config: { stiffness: 190, damping: 17 } });
  const cardSpring = spring({ frame: frame - 22, fps, config: { stiffness: 170, damping: 18 } });
  const starPulse = 1 + Math.sin(frame * 0.14) * 0.08;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 38 }}>
      <Eyebrow opacity={fade(frame, 0, 12)}>TÌNH HUỐNG MINH HỌA</Eyebrow>
      <div
        style={{
          opacity: clamp(titleSpring),
          transform: `translateY(${(1 - clamp(titleSpring)) * 26}px) scale(${0.92 + clamp(titleSpring) * 0.08})`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} fontSize={54} />
      </div>
      <Card
        accent
        style={{
          opacity: clamp(cardSpring),
          transform: `scale(${0.92 + clamp(cardSpring) * 0.08})`,
          width: 760,
          minHeight: 420,
          padding: "40px 38px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        <div
          style={{
            fontSize: 90,
            transform: `scale(${starPulse})`,
            filter: `drop-shadow(0 0 24px ${ACCENT}aa)`,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            width: 640,
            minHeight: 110,
            borderRadius: 18,
            border: `1px solid ${BORDER}`,
            background: MUTED,
            padding: "18px 26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <span style={{ color: TEXT, fontSize: 24, fontWeight: 800, fontStyle: "italic" }}>
            "Để tôi chấm 1 sao đó."
          </span>
        </div>
        <div style={{ color: DIM, fontSize: 16, fontWeight: 700 }}>KHÁCH NÓI · TÀI XẾ IM LẶNG</div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 2 — Timeline: case Minh Khang, 3 mốc mốc thời gian
// ---------------------------------------------------------------------------
const TimelineVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; note?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
  note,
}) => {
  const stages: [string, string, "warning" | "danger"][] = [
    ["12/3", "GRAB LIÊN HỆ", "warning"],
    ["13/3", "TIẾP TỤC LIÊN HỆ", "warning"],
    ["16/3", "KHÓA VĨNH VIỄN", "danger"],
  ];
  const lineProgress = fade(frame, 30, 60);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
      <Eyebrow opacity={fade(frame, 0)}>CASE THẬT · 03/2026</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card style={{ width: 820, minHeight: 480, padding: "54px 36px 34px", position: "relative" }}>
        <div style={{ position: "absolute", left: 100, right: 100, top: 140, height: 4, background: MUTED, borderRadius: 999 }}>
          <div
            style={{
              width: `${lineProgress * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${WARN}, ${ACCENT})`,
              borderRadius: 999,
              boxShadow: `0 0 18px ${ACCENT}`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
          {stages.map(([date, label, state], i) => {
            const s = spring({ frame: frame - 26 - i * 22, fps, config: { stiffness: 190, damping: 18 } });
            const isDanger = state === "danger";
            const dotColor = isDanger ? ACCENT : WARN;
            return (
              <div key={date} style={{ width: 220, display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(s) }}>
                <div style={{ color: dotColor, fontSize: 19, fontWeight: 900, minHeight: 30 }}>{date}</div>
                <div
                  style={{
                    marginTop: 10,
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: isDanger ? dotColor : BG,
                    border: `3px solid ${dotColor}`,
                    boxShadow: `0 0 26px ${dotColor}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    zIndex: 1,
                  }}
                >
                  {isDanger ? (
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="10.5" width="14" height="10" rx="2" stroke={BG} strokeWidth={2} />
                      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke={BG} strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2.2 2C11.6 18.8 5.2 12.4 4.5 6.2A2 2 0 0 1 6.5 4Z"
                        stroke={dotColor}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <Card
                  accent={isDanger}
                  style={{
                    marginTop: 30,
                    width: 214,
                    minHeight: 96,
                    padding: "16px 14px",
                    color: isDanger ? ACCENT : TEXT,
                    fontSize: 17,
                    lineHeight: 1.28,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  {label}
                </Card>
              </div>
            );
          })}
        </div>
        {note ? (
          <div style={{ marginTop: 44, color: DIM, fontSize: 15, lineHeight: 1.4, fontWeight: 700, textAlign: "center" }}>
            {note}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 3 — Mechanism: hidden-threshold gauge
// ---------------------------------------------------------------------------
const GaugeVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; revealThreshold?: boolean }> = ({
  frame,
  fps,
  headline,
  accentWord,
  revealThreshold = false,
}) => {
  const needleProgress = interpolate(frame, [30, 130], [0.15, revealThreshold ? 0.7 : 0.62], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const angle = 180 + needleProgress * 180;
  const dangerReveal = revealThreshold ? fade(frame, 60, 24) : 0;
  const cx = 400;
  const cy = 360;
  const r = 220;
  const arcPoints = (start: number, end: number) => {
    const toXY = (t: number) => {
      const a = (Math.PI * (start + (end - start) * t)) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const steps = 40;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const [x, y] = toXY(i / steps);
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>CƠ CHẾ RATING</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card style={{ width: 800, minHeight: 520, padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={800} height={440} viewBox="0 0 800 440" style={{ overflow: "visible" }}>
          <path d={arcPoints(180, 360)} stroke={MUTED} strokeWidth={26} fill="none" strokeLinecap="round" />
          <path d={arcPoints(180, 180 + needleProgress * 180)} stroke={SAFE} strokeWidth={26} fill="none" strokeLinecap="round" opacity={0.85} />
          {revealThreshold ? (
            <line
              x1={cx + r * Math.cos((Math.PI * 262) / 180)}
              y1={cy + r * Math.sin((Math.PI * 262) / 180)}
              x2={cx + (r + 34) * Math.cos((Math.PI * 262) / 180)}
              y2={cy + (r + 34) * Math.sin((Math.PI * 262) / 180)}
              stroke={ACCENT}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={dangerReveal}
              style={{ filter: `drop-shadow(0 0 10px ${ACCENT})` }}
            />
          ) : null}
          <line
            x1={cx}
            y1={cy}
            x2={cx + (r - 30) * Math.cos((Math.PI * angle) / 180)}
            y2={cy + (r - 30) * Math.sin((Math.PI * angle) / 180)}
            stroke={TEXT}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={16} fill={TEXT} />
        </svg>
        <div style={{ marginTop: -30, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ color: revealThreshold ? ACCENT : DIM, fontSize: 20, fontWeight: 900, opacity: revealThreshold ? dangerReveal : 1 }}>
            {revealThreshold ? "VẠCH ĐỎ ẨN" : "NGƯỠNG: ???"}
          </div>
          <div style={{ color: DIM, fontSize: 15, fontWeight: 700 }}>
            {revealThreshold ? "THEO CHIA SẺ TÀI XẾ, CHƯA XÁC THỰC CHÍNH THỨC" : "TÀI XẾ KHÔNG BIẾT VẠCH ĐỎ Ở ĐÂU"}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 5 — Reframe: star splits open to reveal a switch
// ---------------------------------------------------------------------------
const SwitchVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const splitProgress = fade(frame, 20, 30);
  const switchFlip = fade(frame, 55, 20);
  const starSpring = spring({ frame: frame - 4, fps, config: { stiffness: 180, damping: 16 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 42 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="cyan">
        LẬT GÓC NHÌN
      </Eyebrow>
      <div
        style={{
          opacity: clamp(starSpring),
          transform: `scale(${0.9 + clamp(starSpring) * 0.1})`,
          position: "relative",
          width: 320,
          height: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            fontSize: 220,
            opacity: 1 - splitProgress,
            transform: `scale(${1 + splitProgress * 0.3})`,
            filter: `drop-shadow(0 0 30px ${WARN}aa)`,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: "absolute",
            opacity: splitProgress,
            width: 180,
            height: 180,
            borderRadius: 32,
            border: `3px solid ${switchFlip > 0.5 ? ACCENT : CYAN}`,
            background: `${switchFlip > 0.5 ? ACCENT : CYAN}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 40px ${switchFlip > 0.5 ? ACCENT : CYAN}55`,
          }}
        >
          <div
            style={{
              width: 64,
              height: 100,
              borderRadius: 999,
              border: `4px solid ${TEXT}`,
              position: "relative",
              display: "flex",
              alignItems: switchFlip > 0.5 ? "flex-start" : "flex-end",
              padding: 6,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: switchFlip > 0.5 ? ACCENT : SAFE,
              }}
            />
          </div>
        </div>
      </div>
      <Headline text={headline} accentWord={accentWord} fontSize={50} />
      <div style={{ color: DIM, fontSize: 16, fontWeight: 700, opacity: fade(frame, 80, 14) }}>
        TẮT QUYỀN LỢI NGAY · KHÔNG BÁO TRƯỚC
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 6 — Objection: policy stamp
// ---------------------------------------------------------------------------
const PolicyVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const stampSpring = spring({ frame: frame - 30, fps, config: { stiffness: 260, damping: 14 } });
  const lines = ["Cancellation Rate", "Acceptance Rate", "Driver Rating"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="cyan">
        GÓC NHÌN NỀN TẢNG
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card style={{ width: 780, minHeight: 440, padding: "36px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ color: DIM, fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>CODE OF CONDUCT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {lines.map((line, i) => {
            const s = spring({ frame: frame - 12 - i * 8, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div
                key={line}
                style={{
                  minHeight: 58,
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  background: MUTED,
                  color: TEXT,
                  fontSize: 19,
                  fontWeight: 800,
                  opacity: clamp(s),
                  transform: `translateX(${(1 - clamp(s)) * -18}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            right: 30,
            bottom: 24,
            opacity: clamp(stampSpring),
            transform: `rotate(-14deg) scale(${0.7 + clamp(stampSpring) * 0.3})`,
            border: `5px solid ${CYAN}`,
            borderRadius: 16,
            padding: "14px 22px",
            color: CYAN,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 1,
            boxShadow: `0 0 30px ${CYAN}55`,
          }}
        >
          ĐÃ ĐỒNG Ý
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 7 — Asymmetry: split scale
// ---------------------------------------------------------------------------
const AsymmetryVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const leftSpring = spring({ frame: frame - 24, fps, config: { stiffness: 190, damping: 18 } });
  const rightSpring = spring({ frame: frame - 40, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <Eyebrow opacity={fade(frame, 0)}>HẬU QUẢ BẤT CÂN XỨNG</Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={44} />
      <div style={{ display: "flex", gap: 22, width: 840 }}>
        <Card
          style={{
            flex: 1,
            minHeight: 460,
            padding: "30px 26px",
            opacity: clamp(leftSpring),
            transform: `translateY(${(1 - clamp(leftSpring)) * 20}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke={DIM} strokeWidth={1.8} />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke={DIM} strokeWidth={1.8} strokeLinecap="round" />
          </svg>
          <div style={{ color: DIM, fontSize: 16, fontWeight: 800, textAlign: "center" }}>KHÁCH ĐÁNH GIÁ 1 SAO</div>
          <div
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 140,
              borderRadius: 16,
              border: `1px solid ${BORDER}`,
              background: MUTED,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <span style={{ color: TEXT, fontSize: 18, fontWeight: 800 }}>KHÔNG CƠ CHẾ TƯƠNG XỨNG ĐƯỢC BIẾT ĐẾN CÔNG KHAI</span>
          </div>
        </Card>
        <Card
          accent
          style={{
            flex: 1,
            minHeight: 460,
            padding: "30px 26px",
            opacity: clamp(rightSpring),
            transform: `translateY(${(1 - clamp(rightSpring)) * 20}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 16.5 5.4 12a2 2 0 0 1 1.9-1.4h9.4a2 2 0 0 1 1.9 1.4l1.4 4.5"
              stroke={ACCENT}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="3.4" y="16.5" width="17.2" height="3.6" rx="1.4" stroke={ACCENT} strokeWidth={1.8} />
            <circle cx="7.2" cy="18.3" r="1" fill={ACCENT} />
            <circle cx="16.8" cy="18.3" r="1" fill={ACCENT} />
          </svg>
          <div style={{ color: ACCENT, fontSize: 16, fontWeight: 800, textAlign: "center" }}>TÀI XẾ NHẬN 1 SAO</div>
          <div
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 140,
              borderRadius: 16,
              border: `1px solid ${ACCENT}55`,
              background: `${ACCENT}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 16px",
              textAlign: "center",
            }}
          >
            <span style={{ color: TEXT, fontSize: 18, fontWeight: 800 }}>CÓ THỂ MẤT QUYỀN LỢI NGAY LẬP TỨC</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 8 — CTA
// ---------------------------------------------------------------------------
const CtaVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const qSpring = spring({ frame: frame - 16, fps, config: { stiffness: 190, damping: 17 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)}>MỜI CHIA SẺ</Eyebrow>
      <div
        style={{
          opacity: clamp(qSpring),
          transform: `scale(${0.92 + clamp(qSpring) * 0.08})`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} fontSize={54} />
      </div>
      <Card
        accent
        style={{
          width: 700,
          minHeight: 200,
          padding: "30px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          opacity: fade(frame, 40, 18),
        }}
      >
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
            stroke={ACCENT}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ color: TEXT, fontSize: 20, fontWeight: 700, textAlign: "center" }}>
          Để lại bình luận: bạn từng gặp chưa?
        </div>
      </Card>
    </div>
  );
};

export const RatingThresholdScene: React.FC<RatingThresholdSceneProps> = ({
  mode,
  headline,
  accentWord,
  note,
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
    if (mode === "timeline") return <TimelineVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} note={note} />;
    if (mode === "mechanism") return <GaugeVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} revealThreshold={false} />;
    if (mode === "driver_claim") return <GaugeVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} revealThreshold />;
    if (mode === "reframe") return <SwitchVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "objection") return <PolicyVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "asymmetry") return <AsymmetryVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    return <CtaVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, opacity: exit, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
    </AbsoluteFill>
  );
};

export default RatingThresholdScene;
