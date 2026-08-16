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
import { RtoOwnershipSceneProps } from "../types";

// Vault / ledger palette — amber-gold reward vs. red-lock risk, on a near-black safe-door bg.
const GOLD = "#f0a830";
const LOCK_RED = "#ff5252";
const BG = "#0a0906";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.58)";
const PANEL = "rgba(255,255,255,0.055)";
const BORDER = "rgba(255,255,255,0.14)";
const MUTED = "rgba(255,255,255,0.09)";
const SAFE_GREEN = "#3ddc84";

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
      <span style={{ color: GOLD, textShadow: `0 0 26px ${GOLD}88` }}>{accentWord}</span>
      {text.slice(index + accentWord.length)}
    </>
  );
};

const Backdrop: React.FC<{ frame: number }> = ({ frame }) => {
  const drift = Math.sin(frame * 0.016) * 30;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          left: -170 + drift,
          top: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}1e 0%, transparent 68%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -160 - drift * 0.7,
          bottom: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${LOCK_RED}14 0%, transparent 70%)`,
          filter: "blur(28px)",
        }}
      />
      {/* faint ledger grid lines to suggest a vault/finance surface */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 260 + i * 260,
            height: 1,
            background: "rgba(240,168,48,0.05)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; opacity?: number; tone?: "gold" | "red" }> = ({
  children,
  opacity = 1,
  tone = "gold",
}) => {
  const color = tone === "red" ? LOCK_RED : GOLD;
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
      whiteSpace: "pre-line",
    }}
  >
    {accentText(text, accentWord)}
  </div>
);

const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
  danger?: boolean;
}> = ({ children, style, accent = false, danger = false }) => (
  <div
    style={{
      borderRadius: 24,
      border: `1.5px solid ${danger ? `${LOCK_RED}99` : accent ? `${GOLD}99` : BORDER}`,
      background: danger ? `${LOCK_RED}12` : accent ? `${GOLD}12` : PANEL,
      boxShadow: danger ? `0 0 38px ${LOCK_RED}1f` : accent ? `0 0 38px ${GOLD}1f` : "0 22px 60px rgba(0,0,0,0.3)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Icon set — inline SVG only, matched to scene stroke width / palette
// ---------------------------------------------------------------------------
const PhoneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = TEXT }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="6" y="2.5" width="12" height="19" rx="2.4" stroke={color} strokeWidth={1.8} />
    <line x1="6" y1="17.5" x2="18" y2="17.5" stroke={color} strokeWidth={1.6} />
  </svg>
);

const DriverIcon: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = DIM }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7.4" r="3.6" stroke={color} strokeWidth={1.8} />
    <path d="M4.4 20c0-4.1 3.4-6.6 7.6-6.6s7.6 2.5 7.6 6.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

const BikeIcon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> = ({
  size = 120,
  color = TEXT,
  strokeWidth = 2.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="14" cy="46" r="9" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="50" cy="46" r="9" stroke={color} strokeWidth={strokeWidth} />
    <path
      d="M14 46 24 26h14l6 12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M24 26h-6M38 26l6 20M14 46h20l6-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="27" y="16" width="12" height="7" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <path d="M30 23v3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

const LockIcon: React.FC<{ size?: number; color?: string; open?: boolean; opacity?: number }> = ({
  size = 40,
  color = LOCK_RED,
  open = false,
  opacity = 1,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity }}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" stroke={color} strokeWidth={2} />
    {open ? (
      <path d="M8 10.5V7a4 4 0 0 1 7.4-2.1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    ) : (
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    )}
    <circle cx="12" cy="15.2" r="1.5" fill={color} />
  </svg>
);

const DocumentIcon: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <path d="M14.5 3.5V7a1 1 0 0 0 1 1h3.3" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <line x1="8.3" y1="12" x2="15.7" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    <line x1="8.3" y1="15.2" x2="13.4" y2="15.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);

const CommentIcon: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Mode 1 — hook: phone ad, driver reading approvingly
// ---------------------------------------------------------------------------
const HookVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const titleSpring = spring({ frame: frame - 8, fps, config: { stiffness: 190, damping: 17 } });
  const cardSpring = spring({ frame: frame - 22, fps, config: { stiffness: 170, damping: 18 } });
  const nod = Math.sin(Math.max(0, frame - 60) * 0.16) * (frame > 60 ? 3 : 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0, 12)}>QUẢNG CÁO XANH SM RTO</Eyebrow>
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
          width: 720,
          minHeight: 400,
          padding: "34px 34px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            width: 300,
            minHeight: 190,
            borderRadius: 22,
            border: `2px solid ${GOLD}77`,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "18px 16px",
            boxSizing: "border-box",
          }}
        >
          <PhoneIcon size={26} color={GOLD} />
          <div style={{ color: GOLD, fontSize: 26, fontWeight: 900 }}>CHỈ 3 TRIỆU</div>
          <div style={{ color: TEXT, fontSize: 15, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
            SỞ HỮU XE ĐIỆN
            <br />
            SAU 2 NĂM
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, transform: `rotate(${nod}deg)` }}>
          <DriverIcon size={40} color={SAFE_GREEN} />
          <div style={{ color: DIM, fontSize: 16, fontWeight: 700 }}>TÀI XẾ GẬT ĐẦU HÀI LÒNG</div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 2 — question: bike with ghosted lock overlay
// ---------------------------------------------------------------------------
const QuestionVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const bikeSpring = spring({ frame: frame - 10, fps, config: { stiffness: 170, damping: 18 } });
  const lockOpacity = interpolate(frame, [40, 90], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockPulse = 1 + Math.sin(Math.max(0, frame - 40) * 0.1) * 0.05;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="red">
        CÂU HỎI BẬT RA
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={46} />
      <Card style={{ width: 760, minHeight: 460, padding: "40px 30px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            opacity: clamp(bikeSpring),
            transform: `scale(${0.9 + clamp(bikeSpring) * 0.1})`,
          }}
        >
          <BikeIcon size={260} color={TEXT} strokeWidth={2.2} />
        </div>
        <div
          style={{
            position: "absolute",
            opacity: lockOpacity,
            transform: `scale(${lockPulse})`,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: `${LOCK_RED}14`,
            border: `2px solid ${LOCK_RED}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 40px ${LOCK_RED}55`,
          }}
        >
          <LockIcon size={64} color={LOCK_RED} />
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 3 — reframe: marketing language fading to reveal contract language
// ---------------------------------------------------------------------------
const ReframeVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; sourceLabel?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
  sourceLabel,
}) => {
  const marketingOpacity = interpolate(frame, [20, 55], [1, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const realSpring = spring({ frame: frame - 46, fps, config: { stiffness: 170, damping: 18 } });
  const arrowFade = fade(frame, 60, 16);
  const marketingLabels = ["TẶNG XE", "BẢO ĐẢM THU NHẬP"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="gold">
        HAI CÁCH GỌI, MỘT CHIẾC XE
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={42} />
      <Card style={{ width: 800, minHeight: 460, padding: "44px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: marketingOpacity }}>
          {marketingLabels.map((label) => (
            <div
              key={label}
              style={{
                minWidth: 400,
                minHeight: 62,
                borderRadius: 16,
                border: `1.5px solid ${GOLD}55`,
                background: `${GOLD}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "10px 24px",
              }}
            >
              <span style={{ color: GOLD, fontSize: 24, fontWeight: 900, letterSpacing: 0.5 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ opacity: arrowFade, color: DIM, fontSize: 28 }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <path d="M12 4v14M6 13l6 6 6-6" stroke={DIM} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          style={{
            opacity: clamp(realSpring),
            transform: `translateY(${(1 - clamp(realSpring)) * 18}px)`,
            minWidth: 460,
            minHeight: 78,
            borderRadius: 16,
            border: `2px solid ${LOCK_RED}88`,
            background: `${LOCK_RED}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "14px 28px",
          }}
        >
          <span style={{ color: TEXT, fontSize: 25, fontWeight: 900 }}>HỢP ĐỒNG CÓ ĐIỀU KIỆN</span>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center", opacity: clamp(realSpring) }}>
            {sourceLabel}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 4 — revenue_gauge: dial with needle dipping into red zone below threshold
// ---------------------------------------------------------------------------
const RevenueGaugeVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  metrics?: RtoMetric[];
  footer?: string;
}> = ({ frame, fps, headline, accentWord, metrics, footer }) => {
  const needleProgress = interpolate(frame, [30, 120], [0.72, 0.32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dangerReveal = fade(frame, 70, 20);
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
  const thresholdAngle = 180 + 0.55 * 180;
  const angle = 180 + needleProgress * 180;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="red">
        NGƯỠNG DOANH SỐ HÀNG NGÀY
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={42} />
      <Card style={{ width: 800, minHeight: 500, padding: "28px 30px 22px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={800} height={420} viewBox="0 0 800 420" style={{ overflow: "visible" }}>
          <path d={arcPoints(180, 180 + 0.55 * 180)} stroke={LOCK_RED} strokeWidth={26} fill="none" strokeLinecap="round" opacity={0.35} />
          <path d={arcPoints(180 + 0.55 * 180, 360)} stroke={SAFE_GREEN} strokeWidth={26} fill="none" strokeLinecap="round" opacity={0.35} />
          <line
            x1={cx + r * Math.cos((Math.PI * thresholdAngle) / 180)}
            y1={cy + r * Math.sin((Math.PI * thresholdAngle) / 180)}
            x2={cx + (r + 30) * Math.cos((Math.PI * thresholdAngle) / 180)}
            y2={cy + (r + 30) * Math.sin((Math.PI * thresholdAngle) / 180)}
            stroke={GOLD}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + (r - 30) * Math.cos((Math.PI * angle) / 180)}
            y2={cy + (r - 30) * Math.sin((Math.PI * angle) / 180)}
            stroke={needleProgress < 0.55 ? LOCK_RED : TEXT}
            strokeWidth={7}
            strokeLinecap="round"
            style={needleProgress < 0.55 ? { filter: `drop-shadow(0 0 10px ${LOCK_RED})` } : undefined}
          />
          <circle cx={cx} cy={cy} r={16} fill={TEXT} />
        </svg>
        <div style={{ marginTop: -26, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: dangerReveal }}>
          <div style={{ color: LOCK_RED, fontSize: 19, fontWeight: 900 }}>DƯỚI 280.000Đ/NGÀY → VÙNG ĐỎ</div>
        </div>
        {metrics && metrics.length > 0 ? (
          <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
            {metrics.map((m) => (
              <div
                key={m.label + m.value}
                style={{
                  minWidth: 220,
                  minHeight: 64,
                  borderRadius: 14,
                  border: `1px solid ${m.tone === "red" ? LOCK_RED : GOLD}55`,
                  background: `${m.tone === "red" ? LOCK_RED : GOLD}14`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 16px",
                  textAlign: "center",
                }}
              >
                {m.label ? <div style={{ color: DIM, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>{m.label}</div> : null}
                <div style={{ color: m.tone === "red" ? LOCK_RED : GOLD, fontSize: 17, fontWeight: 900 }}>{m.value}</div>
              </div>
            ))}
          </div>
        ) : null}
        {footer ? (
          <div style={{ marginTop: 14, color: DIM, fontSize: 14, fontWeight: 700, textAlign: "center" }}>{footer}</div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 5 — lockout_timeline: 24-month bar with KPI checkpoints, OWNERSHIP node
// ---------------------------------------------------------------------------
const LockoutTimelineVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; footer?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
  footer,
}) => {
  const lineProgress = fade(frame, 28, 70);
  const checkpoints: [string, string][] = [
    ["TRỄ 7 NGÀY", "KHÓA XE TỪ XA"],
    ["VI PHẠM 3 TUẦN", "THU HỒI XE"],
  ];
  const finalSpring = spring({ frame: frame - 110, fps, config: { stiffness: 200, damping: 16 } });
  const finalLit = interpolate(frame, [110, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="red">
        24 THÁNG · TIMELINE VẬN HÀNH
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={40} />
      <Card style={{ width: 840, minHeight: 480, padding: "50px 40px 34px", position: "relative" }}>
        <div style={{ position: "absolute", left: 70, right: 70, top: 140, height: 4, background: MUTED, borderRadius: 999 }}>
          <div
            style={{
              width: `${lineProgress * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${LOCK_RED}, ${GOLD})`,
              borderRadius: 999,
              boxShadow: `0 0 18px ${GOLD}`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
          {checkpoints.map(([label, sub], i) => {
            const s = spring({ frame: frame - 30 - i * 26, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div key={label} style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(s) }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: BG,
                    border: `3px solid ${LOCK_RED}`,
                    boxShadow: `0 0 22px ${LOCK_RED}77`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <LockIcon size={22} color={LOCK_RED} />
                </div>
                <Card
                  danger
                  style={{
                    marginTop: 26,
                    width: 196,
                    minHeight: 92,
                    padding: "14px 12px",
                    color: LOCK_RED,
                    fontSize: 15,
                    lineHeight: 1.28,
                    fontWeight: 900,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    gap: 4,
                  }}
                >
                  <div>{label}</div>
                  <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{sub}</div>
                </Card>
              </div>
            );
          })}
          <div style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(finalSpring) }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: finalLit > 0.5 ? GOLD : BG,
                border: `3px solid ${GOLD}`,
                boxShadow: `0 0 ${18 + finalLit * 20}px ${GOLD}${finalLit > 0.5 ? "cc" : "44"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
                transform: `scale(${1 + finalLit * 0.12})`,
              }}
            >
              <BikeIcon size={30} color={finalLit > 0.5 ? BG : GOLD} strokeWidth={2.6} />
            </div>
            <Card
              accent={finalLit > 0.5}
              style={{
                marginTop: 26,
                width: 196,
                minHeight: 92,
                padding: "14px 12px",
                color: GOLD,
                fontSize: 16,
                lineHeight: 1.28,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              SỞ HỮU
              <br />
              THÁNG 24
            </Card>
          </div>
        </div>
        {footer ? (
          <div style={{ marginTop: 40, color: DIM, fontSize: 14, lineHeight: 1.4, fontWeight: 700, textAlign: "center" }}>
            {footer}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 6 — transfer_condition: ad claim vs. real clause callout
// ---------------------------------------------------------------------------
const TransferConditionVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; sourceLabel?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
  sourceLabel,
}) => {
  const adSpring = spring({ frame: frame - 16, fps, config: { stiffness: 190, damping: 18 } });
  const clauseSpring = spring({ frame: frame - 42, fps, config: { stiffness: 190, damping: 18 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="gold">
        ĐIỀU KIỆN CHUYỂN GIAO
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={40} />
      <Card style={{ width: 820, minHeight: 480, padding: "38px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            opacity: clamp(adSpring),
            transform: `translateX(${(1 - clamp(adSpring)) * -18}px)`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            minHeight: 76,
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            background: MUTED,
            padding: "16px 22px",
          }}
        >
          <PhoneIcon size={26} color={DIM} />
          <div style={{ color: DIM, fontSize: 17, fontWeight: 700, textAlign: "left" }}>
            QUẢNG CÁO: "3 TRIỆU, SỞ HỮU XE SAU 2 NĂM"
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", opacity: fade(frame, 34, 12) }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <path d="M12 4v14M6 13l6 6 6-6" stroke={DIM} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          style={{
            opacity: clamp(clauseSpring),
            transform: `translateX(${(1 - clamp(clauseSpring)) * 18}px)`,
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            minHeight: 150,
            borderRadius: 16,
            border: `2px solid ${GOLD}77`,
            background: `${GOLD}12`,
            padding: "20px 22px",
          }}
        >
          <DocumentIcon size={30} color={GOLD} />
          <div style={{ color: TEXT, fontSize: 18, fontWeight: 800, textAlign: "left", lineHeight: 1.4 }}>
            ĐIỀU KHOẢN THẬT: SỞ HỮU CHUYỂN GIAO SAU 24 THÁNG —
            <br />
            KHI TRẢ ĐỦ TIỀN <span style={{ color: GOLD }}>VÀ</span> ĐẠT ĐỦ KPI VẬN HÀNH.
          </div>
        </div>
        {sourceLabel ? (
          <div style={{ color: DIM, fontSize: 13, fontWeight: 700, textAlign: "center", opacity: clamp(clauseSpring) }}>
            {sourceLabel}
          </div>
        ) : null}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 7 — payoff: bike icon locked -> unlocked as timeline hits month 24
// ---------------------------------------------------------------------------
const PayoffVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const unlockProgress = interpolate(frame, [50, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bikeGlow = interpolate(frame, [50, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bikeSpring = spring({ frame: frame - 10, fps, config: { stiffness: 170, damping: 18 } });
  const lockShake = unlockProgress > 0 && unlockProgress < 1 ? Math.sin(frame * 0.9) * 3 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)} tone="gold">
        CHÌA KHÓA THẬT NẰM Ở ĐÂU
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} fontSize={40} />
      <Card style={{ width: 760, minHeight: 460, padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div
          style={{
            position: "relative",
            width: 280,
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: clamp(bikeSpring),
            transform: `scale(${0.9 + clamp(bikeSpring) * 0.1})`,
          }}
        >
          <div
            style={{
              filter: `drop-shadow(0 0 ${8 + bikeGlow * 26}px ${GOLD}${Math.round(bikeGlow * 200).toString(16).padStart(2, "0")})`,
              opacity: 0.35 + bikeGlow * 0.65,
            }}
          >
            <BikeIcon size={230} color={bikeGlow > 0.6 ? GOLD : TEXT} strokeWidth={2.2} />
          </div>
          <div
            style={{
              position: "absolute",
              opacity: 1 - unlockProgress,
              transform: `translateX(${lockShake}px)`,
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: `${LOCK_RED}14`,
              border: `2px solid ${LOCK_RED}88`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockIcon size={50} color={LOCK_RED} open={unlockProgress > 0.5} />
          </div>
        </div>
        <div
          style={{
            minHeight: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: unlockProgress > 0.8 ? GOLD : DIM, fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>
            {unlockProgress > 0.8 ? "THÁNG 24 · MỞ KHÓA HOÀN TOÀN" : "24 THÁNG · CÒN KHÓA"}
          </span>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode 8 — cta
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
        <Headline text={headline} accentWord={accentWord} fontSize={36} />
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
        <CommentIcon size={40} color={GOLD} />
        <div style={{ color: TEXT, fontSize: 20, fontWeight: 700, textAlign: "center" }}>
          Để lại bình luận: chính sách nào bạn nghĩ tới?
        </div>
      </Card>
    </div>
  );
};

type RtoMetric = { label: string; value: string; tone?: "gold" | "red" };

export const RtoOwnershipScene: React.FC<RtoOwnershipSceneProps> = ({
  mode,
  headline,
  accentWord,
  metrics,
  sourceLabel,
  footer,
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
    if (mode === "reframe")
      return <ReframeVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} sourceLabel={sourceLabel} />;
    if (mode === "revenue_gauge")
      return (
        <RevenueGaugeVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          metrics={metrics}
          footer={footer}
        />
      );
    if (mode === "lockout_timeline")
      return <LockoutTimelineVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} footer={footer} />;
    if (mode === "transfer_condition")
      return (
        <TransferConditionVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} sourceLabel={sourceLabel} />
      );
    if (mode === "payoff") return <PayoffVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    return <CtaVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, opacity: exit, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
    </AbsoluteFill>
  );
};

export default RtoOwnershipScene;
