import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BatterySwapPolicyMetric, BatterySwapPolicySceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { XanhSMBirdIcon } from "./shared/greensmBikePalette";

const BG = "#03070D";
const BLUE = "#18BFF2";
const BLUE_DEEP = "#0579A8";
const RED = "#FF4D5E";
const AMBER = "#FFB547";
const INK = "#F4FAFF";
const DIM = "#7690A3";

const toneColor = (tone: BatterySwapPolicyMetric["tone"]) =>
  tone === "red" ? RED : tone === "amber" ? AMBER : BLUE;

const enter = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: frame - delay,
    fps,
    config: { stiffness: 190, damping: 20, mass: 0.75 },
    durationInFrames: 26,
  });

const AccentText: React.FC<{ text: string; accentWord?: string; accent?: string }> = ({
  text,
  accentWord,
  accent = BLUE,
}) => {
  if (!accentWord || !text.includes(accentWord)) return <>{text}</>;
  const at = text.indexOf(accentWord);
  return (
    <>
      {text.slice(0, at)}
      <span style={{ color: accent, textShadow: `0 0 24px ${accent}66` }}>{accentWord}</span>
      {text.slice(at + accentWord.length)}
    </>
  );
};

const BatteryGlyph: React.FC<{ level?: number; color?: string; width?: number }> = ({
  level = 0.82,
  color = BLUE,
  width = 120,
}) => {
  const gradientId = `battery-${color.replace("#", "")}`;
  return (
    <svg width={width} height={width * 1.55} viewBox="0 0 120 186" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={BLUE_DEEP} />
        </linearGradient>
      </defs>
      <rect x="44" y="3" width="32" height="13" rx="5" fill={color} opacity="0.9" />
      <rect x="12" y="15" width="96" height="164" rx="22" fill="#06101A" stroke={color} strokeWidth="4" />
      <rect x="20" y={171 - 145 * level} width="80" height={145 * level} rx="14" fill={`url(#${gradientId})`} opacity="0.92" />
      <path d="M67 50 43 93h19l-9 42 29-53H62l5-32Z" fill="#E9FBFF" opacity="0.95" />
    </svg>
  );
};

const RiderGlyph: React.FC<{ color?: string; width?: number }> = ({ color = BLUE, width = 260 }) => (
  <svg width={width} height={width * 0.65} viewBox="0 0 320 208" fill="none">
    <circle cx="72" cy="160" r="35" stroke={INK} strokeWidth="10" opacity="0.9" />
    <circle cx="253" cy="160" r="35" stroke={INK} strokeWidth="10" opacity="0.9" />
    <path d="M72 160h79l36-62h54l24 62" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m109 112 35 48 38-62" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="173" cy="49" r="21" fill={INK} />
    <path d="m160 76-31 45m31-45 43 36m-43-36 50-7" stroke={INK} strokeWidth="14" strokeLinecap="round" />
    <path d="M204 68h45" stroke={color} strokeWidth="8" strokeLinecap="round" />
  </svg>
);

const Cabinet: React.FC<{
  frame: number;
  fps: number;
  locked?: boolean;
  low?: boolean;
  compact?: boolean;
}> = ({ frame, fps, locked = false, low = false, compact = false }) => {
  const s = enter(frame, fps, 8);
  const pulse = 0.6 + Math.sin(frame / 8) * 0.2;
  const width = compact ? 330 : 440;
  return (
    <div
      style={{
        position: "relative",
        width,
        padding: compact ? 18 : 24,
        borderRadius: 34,
        background: "linear-gradient(155deg, rgba(21,45,62,.98), rgba(5,12,19,.98))",
        border: `2px solid ${locked ? RED : BLUE}66`,
        boxShadow: `0 32px 90px rgba(0,0,0,.55), 0 0 55px ${locked ? RED : BLUE}22`,
        opacity: Math.min(1, s),
        transform: `perspective(900px) rotateY(-7deg) translateY(${(1 - Math.min(1, s)) * 46}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: compact ? 14 : 17, fontWeight: 850, color: INK, letterSpacing: 1.8 }}>V-GREEN · SWAP</div>
        <div style={{ width: 11, height: 11, borderRadius: 99, background: locked ? RED : BLUE, boxShadow: `0 0 18px ${locked ? RED : BLUE}`, opacity: pulse }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 10 : 14 }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const cell = enter(frame, fps, 15 + i * 4);
          const isLocked = locked && i === 2;
          return (
            <div
              key={i}
              style={{
                height: compact ? 90 : 116,
                borderRadius: 18,
                border: `1px solid ${isLocked ? RED : "rgba(109,190,224,.25)"}`,
                background: "linear-gradient(180deg, rgba(5,11,17,.92), rgba(8,20,31,.88))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                opacity: Math.min(1, cell),
                transform: `scale(${0.9 + Math.min(1, cell) * 0.1})`,
              }}
            >
              {isLocked ? (
                <div style={{ color: RED, fontSize: compact ? 17 : 21, fontWeight: 900, letterSpacing: 1.2 }}>LOCKED</div>
              ) : (
                <BatteryGlyph width={compact ? 40 : 52} level={low && i === 0 ? 0.12 : 0.82 - i * 0.04} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DocumentaryBackdrop: React.FC<{ frame: number; accent?: string }> = ({ frame, accent = BLUE }) => {
  const drift = Math.sin(frame / 45) * 32;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${48 + drift / 20}% 34%, ${accent}18, transparent 38%), linear-gradient(180deg, #03070D, #06111C 70%, #02050A)`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.16, backgroundImage: "linear-gradient(rgba(97,196,235,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(97,196,235,.12) 1px, transparent 1px)", backgroundSize: "76px 76px", transform: `translate(${drift}px, ${-drift * 0.3}px) scale(1.08)` }} />
      <div style={{ position: "absolute", left: -170, bottom: -250, width: 760, height: 760, borderRadius: "50%", border: `1px solid ${accent}22`, boxShadow: `0 0 120px ${accent}16 inset` }} />
      <div style={{ position: "absolute", right: -230, top: 140, width: 660, height: 660, borderRadius: "50%", background: `radial-gradient(circle, ${accent}10, transparent 68%)` }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.035, backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 4px)" }} />
    </AbsoluteFill>
  );
};

const Chrome: React.FC<{
  eyebrow?: string;
  sourceLabel?: string;
  frame: number;
  children: React.ReactNode;
}> = ({ eyebrow, sourceLabel, frame, children }) => (
  <>
    <div style={{ position: "absolute", top: 76, left: 72, right: 72, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <XanhSMBirdIcon size={34} color={BLUE} />
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 2.2, color: DIM }}>{eyebrow ?? "POLICY AUDIT"}</div>
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: i === 2 ? 30 : 7, height: 7, borderRadius: 99, background: i === 2 ? BLUE : "#274154" }} />)}
      </div>
    </div>
    {children}
    {sourceLabel && (
      <div style={{ position: "absolute", left: 74, right: 74, bottom: 84, paddingTop: 16, borderTop: "1px solid rgba(112,155,181,.22)", fontSize: 15, lineHeight: 1.35, fontWeight: 650, color: DIM, letterSpacing: 0.15 }}>
        {sourceLabel}
      </div>
    )}
  </>
);

const Headline: React.FC<{
  text: string;
  accentWord?: string;
  frame: number;
  compact?: boolean;
  accent?: string;
}> = ({ text, accentWord, frame, compact = false, accent = BLUE }) => {
  const s = enter(frame, 30, 3);
  return (
    <div style={{ fontSize: compact ? 50 : 66, lineHeight: 1.08, fontWeight: 950, color: INK, letterSpacing: -2.2, whiteSpace: "pre-line", opacity: Math.min(1, s), transform: `translateY(${(1 - Math.min(1, s)) * 24}px)` }}>
      <AccentText text={text} accentWord={accentWord} accent={accent} />
    </div>
  );
};

const MetricCards: React.FC<{
  metrics: BatterySwapPolicyMetric[];
  frame: number;
  columns?: number;
}> = ({ metrics, frame, columns = 2 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 16, width: "100%" }}>
    {metrics.map((metric, i) => {
      const s = enter(frame, 30, 24 + i * 9);
      const color = toneColor(metric.tone);
      return (
        <div key={`${metric.label}-${i}`} style={{ minHeight: 132, padding: "22px 24px", borderRadius: 22, border: `1px solid ${color}55`, background: `linear-gradient(145deg, ${color}18, rgba(5,12,19,.94))`, boxShadow: "0 18px 45px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: Math.min(1, s), transform: `translateY(${(1 - Math.min(1, s)) * 28}px)` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: DIM, letterSpacing: 1.2 }}>{metric.label}</div>
          <div style={{ fontSize: 30, lineHeight: 1.08, fontWeight: 950, color, whiteSpace: "pre-line" }}>{metric.value}</div>
        </div>
      );
    })}
  </div>
);

const DocumentCard: React.FC<{
  title: string;
  big: string;
  note: string;
  color: string;
  frame: number;
  delay?: number;
  rotate?: number;
}> = ({ title, big, note, color, frame, delay = 0, rotate = 0 }) => {
  const s = enter(frame, 30, delay);
  return (
    <div style={{ width: 650, padding: "34px 38px", borderRadius: 28, background: "linear-gradient(150deg, rgba(18,31,44,.98), rgba(5,11,17,.98))", border: `1px solid ${color}55`, boxShadow: `0 35px 100px rgba(0,0,0,.5), 0 0 48px ${color}17`, opacity: Math.min(1, s), transform: `translateY(${(1 - Math.min(1, s)) * 70}px) rotate(${rotate}deg) scale(${0.92 + Math.min(1, s) * 0.08})` }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: DIM, letterSpacing: 1.4, marginBottom: 20 }}>{title}</div>
      <div style={{ fontSize: 60, fontWeight: 950, color, lineHeight: 1.02, marginBottom: 18 }}>{big}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{note}</div>
    </div>
  );
};

const HookVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  subhead?: string;
}> = ({ frame, fps, headline, accentWord, subhead }) => {
  const cable = interpolate(frame, [20, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: "170px 72px 150px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 770 }}>
        <div style={{ width: 440, zIndex: 2 }}>
          <Headline text={headline} accentWord={accentWord} frame={frame} />
          {subhead && <div style={{ marginTop: 26, fontSize: 25, lineHeight: 1.35, fontWeight: 750, color: DIM, maxWidth: 400 }}>{subhead}</div>}
          <div style={{ marginTop: 58 }}><RiderGlyph width={300} /></div>
          <div style={{ marginTop: 14, display: "inline-flex", padding: "12px 18px", borderRadius: 999, border: `1px solid ${RED}66`, background: `${RED}14`, fontSize: 18, fontWeight: 900, color: RED }}>HÔM QUA · 0/10 CUỐC</div>
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <Cabinet frame={frame} fps={fps} locked low />
          <div style={{ position: "absolute", right: 24, bottom: 28, padding: "12px 16px", borderRadius: 14, background: "rgba(255,77,94,.16)", border: `1px solid ${RED}66`, color: RED, fontWeight: 950, fontSize: 19 }}>PIN 8% · LOCKED</div>
        </div>
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="936" height="770" viewBox="0 0 936 770">
          <path d="M330 575 C480 650 510 360 650 420" fill="none" stroke={RED} strokeWidth="5" strokeDasharray="12 14" strokeDashoffset={(1 - cable) * 420} opacity="0.85" />
          <circle cx={650} cy={420} r={8 + Math.sin(frame / 5) * 2} fill={RED} opacity={cable} />
        </svg>
      </div>
    </div>
  );
};

const PromiseVisual: React.FC<BatterySwapPolicySceneProps & { frame: number }> = ({
  frame,
  headline,
  accentWord,
  subhead,
  metrics = [],
}) => (
  <div style={{ position: "absolute", inset: "190px 72px 145px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <Headline text={headline} accentWord={accentWord} frame={frame} />
    <div style={{ marginTop: 66, position: "relative" }}>
      <DocumentCard title="THÔNG CÁO GSM · 26/03/2026" big={metrics[0]?.value ?? "3 NĂM"} note={subhead ?? "ĐỔI PIN KHÔNG GIỚI HẠN"} color={BLUE} frame={frame} delay={18} rotate={-1.4} />
      <div style={{ position: "absolute", right: -80, bottom: -70, width: 210, height: 210, borderRadius: "50%", border: `2px solid ${BLUE}66`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,10,16,.94)", color: BLUE, fontSize: 92, fontWeight: 300, boxShadow: `0 0 65px ${BLUE}28` }}>∞</div>
    </div>
  </div>
);

const ConditionsVisual: React.FC<BatterySwapPolicySceneProps & { frame: number; fps: number }> = ({
  frame,
  fps,
  headline,
  accentWord,
  metrics = [],
  footer,
}) => (
  <div style={{ position: "absolute", inset: "190px 72px 145px", display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 42, alignItems: "center" }}>
    <div>
      <Headline text={headline} accentWord={accentWord} frame={frame} compact />
      <div style={{ marginTop: 40 }}><Cabinet frame={frame} fps={fps} locked compact /></div>
      {footer && <div style={{ marginTop: 22, fontSize: 18, fontWeight: 850, color: RED }}>{footer}</div>}
    </div>
    <MetricCards metrics={metrics} frame={frame} />
  </div>
);

const AfterJuneVisual: React.FC<BatterySwapPolicySceneProps & { frame: number }> = ({
  frame,
  headline,
  accentWord,
  metrics = [],
  footer,
}) => {
  const rise = interpolate(frame, [18, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: "180px 72px 145px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Headline text={headline} accentWord={accentWord} frame={frame} />
      <div style={{ marginTop: 54, position: "relative", padding: "34px", borderRadius: 30, background: "linear-gradient(140deg, rgba(14,35,49,.92), rgba(4,10,16,.96))", border: "1px solid rgba(77,158,194,.28)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${rise * 68}%`, background: "linear-gradient(180deg, transparent, rgba(255,77,94,.08))" }} />
        <MetricCards metrics={metrics} frame={frame} columns={1} />
        <svg width="100%" height="170" viewBox="0 0 820 170" style={{ marginTop: 20 }}>
          <path d="M24 136 C180 135 230 100 350 104 S570 70 790 28" fill="none" stroke={RED} strokeWidth="7" strokeLinecap="round" strokeDasharray="950" strokeDashoffset={(1 - rise) * 950} />
          <path d="m760 23 34 4-12 31" fill="none" stroke={RED} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity={rise} />
        </svg>
      </div>
      {footer && <div style={{ marginTop: 26, fontSize: 18, color: DIM, fontWeight: 750 }}>{footer}</div>}
    </div>
  );
};

const DriverBindVisual: React.FC<BatterySwapPolicySceneProps & { frame: number; fps: number }> = ({
  frame,
  fps,
  headline,
  accentWord,
  subhead,
  footer,
}) => {
  const scan = interpolate(frame, [18, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: "180px 72px 145px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Headline text={headline} accentWord={accentWord} frame={frame} />
      <div style={{ marginTop: 56, height: 660, position: "relative", borderRadius: 34, background: "linear-gradient(145deg, rgba(13,31,44,.96), rgba(4,10,16,.98))", border: "1px solid rgba(77,158,194,.26)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "linear-gradient(transparent, rgba(24,191,242,.55), transparent)" }} />
        <div style={{ position: "absolute", left: 36, top: 38, fontSize: 16, fontWeight: 900, color: DIM, letterSpacing: 1.6 }}>NGÀY T-1</div>
        <div style={{ position: "absolute", right: 36, top: 38, fontSize: 16, fontWeight: 900, color: DIM, letterSpacing: 1.6 }}>NGÀY T</div>
        <div style={{ position: "absolute", left: 50, top: 150 }}><RiderGlyph width={330} color={RED} /></div>
        <div style={{ position: "absolute", left: 60, bottom: 86, width: 340, padding: "20px 22px", borderRadius: 20, background: `${RED}12`, border: `1px solid ${RED}55` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: DIM }}>NGHỈ ỐM · ÍT CUỐC</div>
          <div style={{ marginTop: 8, fontSize: 35, fontWeight: 950, color: RED }}>0/10 CUỐC</div>
        </div>
        <div style={{ position: "absolute", right: 54, top: 110 }}><Cabinet frame={frame} fps={fps} locked compact /></div>
        <div style={{ position: "absolute", left: "calc(50% - 2px)", top: 70, width: 4, height: `${scan * 520}px`, background: `linear-gradient(${BLUE}, ${RED})`, boxShadow: `0 0 24px ${BLUE}` }} />
        <div style={{ position: "absolute", right: 60, bottom: 86, color: RED, fontSize: 22, fontWeight: 950 }}>QUYỀN MIỄN PHÍ: ?</div>
      </div>
      {subhead && <div style={{ marginTop: 28, fontSize: 24, fontWeight: 780, lineHeight: 1.35, color: INK }}>{subhead}</div>}
      {footer && <div style={{ marginTop: 12, fontSize: 17, color: DIM }}>{footer}</div>}
    </div>
  );
};

const ConflictVisual: React.FC<BatterySwapPolicySceneProps & { frame: number }> = ({
  frame,
  headline,
  accentWord,
  metrics = [],
  footer,
}) => (
  <div style={{ position: "absolute", inset: "185px 72px 145px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <Headline text={headline} accentWord={accentWord} frame={frame} accent={AMBER} />
    <div style={{ marginTop: 66, height: 720, position: "relative" }}>
      <div style={{ position: "absolute", left: 10, top: 10 }}><DocumentCard title={metrics[0]?.label ?? "THÔNG CÁO 26/03"} big={metrics[0]?.value ?? "3 NĂM"} note="ĐĂNG KÝ ĐẾN 30/06" color={BLUE} frame={frame} delay={10} rotate={-4} /></div>
      <div style={{ position: "absolute", right: 0, top: 230 }}><DocumentCard title={metrics[1]?.label ?? "TRANG CẬP NHẬT"} big={metrics[1]?.value ?? "2 NĂM"} note="TRƯỚC 30/05 MỚI GIỮ 3 NĂM" color={AMBER} frame={frame} delay={36} rotate={3} /></div>
      <div style={{ position: "absolute", left: 402, top: 125, height: 370, width: 5, transform: "rotate(18deg)", background: `linear-gradient(transparent, ${RED}, transparent)`, boxShadow: `0 0 30px ${RED}` }} />
    </div>
    {footer && <div style={{ fontSize: 18, color: DIM, fontWeight: 700 }}>{footer}</div>}
  </div>
);

const AmbiguityVisual: React.FC<BatterySwapPolicySceneProps & { frame: number }> = ({
  frame,
  headline,
  accentWord,
  metrics = [],
  footer,
}) => (
  <div style={{ position: "absolute", inset: "185px 72px 145px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
    <Headline text={headline} accentWord={accentWord} frame={frame} />
    <div style={{ marginTop: 60, position: "relative", height: 790 }}>
      {metrics.map((metric, i) => {
        const s = enter(frame, 30, 15 + i * 13);
        const color = toneColor(metric.tone);
        return (
          <div key={i} style={{ position: "absolute", left: 54 + i * 32, right: 54 - i * 18, top: 48 + i * 138, minHeight: 150, padding: "24px 30px", borderRadius: 24, background: `linear-gradient(140deg, ${color}19, rgba(6,14,22,.98))`, border: `1px solid ${color}55`, boxShadow: "0 24px 55px rgba(0,0,0,.4)", opacity: Math.min(1, s), transform: `translateX(${(1 - Math.min(1, s)) * (i % 2 === 0 ? -45 : 45)}px) rotate(${i % 2 === 0 ? -1.2 : 1.2}deg)` }}>
            <div style={{ fontSize: 15, color: DIM, fontWeight: 850, letterSpacing: 1.3 }}>{metric.label}</div>
            <div style={{ marginTop: 12, fontSize: 31, color, fontWeight: 950, lineHeight: 1.16 }}>{metric.value}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 26, bottom: 6, width: 210, height: 210, borderRadius: "50%", background: "rgba(3,8,13,.96)", border: `2px solid ${RED}77`, display: "flex", alignItems: "center", justifyContent: "center", color: RED, fontSize: 110, fontWeight: 950, boxShadow: `0 0 80px ${RED}22` }}>?</div>
    </div>
    {footer && <div style={{ fontSize: 18, color: DIM }}>{footer}</div>}
  </div>
);

const CtaVisual: React.FC<BatterySwapPolicySceneProps & { frame: number; fps: number }> = ({
  frame,
  fps,
  headline,
  accentWord,
  metrics = [],
  footer,
}) => {
  const spotlight = interpolate(frame, [0, 75], [0.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: "165px 72px 135px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.93 + spotlight * 0.07})` }}><Cabinet frame={frame} fps={fps} locked compact /></div>
      <div style={{ marginTop: 54, textAlign: "center", maxWidth: 900 }}><Headline text={headline} accentWord={accentWord} frame={frame} accent={RED} /></div>
      <div style={{ marginTop: 38, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        {metrics.map((metric, i) => {
          const s = enter(frame, fps, 55 + i * 10);
          return (
            <div key={i} style={{ padding: "14px 20px", borderRadius: 999, border: `1px solid ${toneColor(metric.tone)}66`, background: `${toneColor(metric.tone)}12`, color: toneColor(metric.tone), fontSize: 17, fontWeight: 900, opacity: Math.min(1, s) }}>
              {metric.value}
            </div>
          );
        })}
      </div>
      {footer && <div style={{ marginTop: 42, width: "100%", padding: "22px 30px", borderRadius: 20, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.12)", color: INK, textAlign: "center", fontSize: 23, lineHeight: 1.3, fontWeight: 780 }}>{footer}</div>}
    </div>
  );
};

export const BatterySwapPolicyScene: React.FC<BatterySwapPolicySceneProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [props.durationInFrames - 10, props.durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const accent = props.mode === "duration_conflict" ? AMBER : props.mode === "cta" ? RED : BLUE;

  let content: React.ReactNode;
  switch (props.mode) {
    case "hook":
      content = <HookVisual frame={frame} fps={fps} headline={props.headline} accentWord={props.accentWord} subhead={props.subhead} />;
      break;
    case "promise":
      content = <PromiseVisual {...props} frame={frame} />;
      break;
    case "conditions":
      content = <ConditionsVisual {...props} frame={frame} fps={fps} />;
      break;
    case "after_june":
      content = <AfterJuneVisual {...props} frame={frame} />;
      break;
    case "driver_bind":
      content = <DriverBindVisual {...props} frame={frame} fps={fps} />;
      break;
    case "duration_conflict":
      content = <ConflictVisual {...props} frame={frame} />;
      break;
    case "ambiguity":
      content = <AmbiguityVisual {...props} frame={frame} />;
      break;
    case "cta":
      content = <CtaVisual {...props} frame={frame} fps={fps} />;
      break;
    default:
      content = null;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BG, color: INK, fontFamily: BE_VIETNAM_PRO, opacity: exit, overflow: "hidden" }}>
      <DocumentaryBackdrop frame={frame} accent={accent} />
      <SafeZone>
        <Chrome eyebrow={props.eyebrow} sourceLabel={props.sourceLabel} frame={frame}>
          {content}
        </Chrome>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default BatterySwapPolicyScene;
