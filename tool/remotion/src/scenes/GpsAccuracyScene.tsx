import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {GpsAccuracySceneProps} from "../types";
import {BE_VIETNAM_PRO} from "../styles";

const C = {
  bg: "#070d14",
  ink: "#f7fbff",
  dim: "rgba(247,251,255,0.7)",
  green: "#00d26a",
  cyan: "#5ee7ff",
  amber: "#ffb84d",
  red: "#ff5d73",
  panel: "rgba(5,13,22,0.84)",
};

const ALLEY = staticFile("images/grab_gps/alley-35-35a.png");

const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};

const fade = (frame: number, start = 0, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], clamp);

const AccentText: React.FC<{
  text: string;
  accentWord?: string;
  size?: number;
  align?: "left" | "center";
}> = ({text, accentWord, size = 58, align = "center"}) => {
  const index = accentWord ? text.indexOf(accentWord) : -1;
  return (
    <div
      style={{
        color: C.ink,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.08,
        letterSpacing: -1.8,
        textAlign: align,
        whiteSpace: "pre-line",
        textWrap: "balance",
      }}
    >
      {index < 0 ? text : <>{text.slice(0, index)}<span style={{color: C.green}}>{accentWord}</span>{text.slice(index + accentWord!.length)}</>}
    </div>
  );
};

const Pill: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.green}) => (
  <div
    style={{
      minHeight: 48,
      padding: "10px 20px",
      borderRadius: 999,
      border: `1.5px solid ${color}`,
      background: `${color}20`,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      lineHeight: 1,
      fontWeight: 900,
      letterSpacing: 1.2,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const AlleyPlate: React.FC<{
  frame: number;
  dim?: number;
  blur?: number;
  scaleFrom?: number;
  scaleTo?: number;
  position?: string;
}> = ({frame, dim = 0.2, blur = 0, scaleFrom = 1.04, scaleTo = 1.1, position = "center"}) => {
  const scale = interpolate(frame, [0, 360], [scaleFrom, scaleTo], clamp);
  return (
    <AbsoluteFill>
      <Img
        src={ALLEY}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: position,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px) saturate(0.92)`,
        }}
      />
      <AbsoluteFill style={{background: `rgba(2,8,15,${dim})`}} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg,rgba(3,8,14,.72) 0%,rgba(3,8,14,.08) 28%,rgba(3,8,14,.08) 65%,rgba(3,8,14,.86) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const PhoneStatus: React.FC<{label: string; x: number; y: number; color?: string; delay?: number}> = ({
  label,
  x,
  y,
  color = C.green,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 15, stiffness: 150}});
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 350,
        height: 170,
        padding: 22,
        boxSizing: "border-box",
        borderRadius: 34,
        border: "3px solid rgba(255,255,255,.2)",
        background: "linear-gradient(180deg,#182431,#0b121b)",
        boxShadow: "0 24px 70px rgba(0,0,0,.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30}px) scale(${0.9 + enter * 0.1})`,
      }}
    >
      <div style={{width: 48, height: 48, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#04100a", fontSize: 30, fontWeight: 1000}}>✓</div>
      <div style={{fontSize: 24, fontWeight: 900, color: C.ink, textAlign: "center", lineHeight: 1.05}}>{label}</div>
    </div>
  );
};

const AddressPlaque: React.FC<{label: string; x: number; y: number; color: string; delay?: number}> = ({label, x, y, color, delay = 0}) => {
  const frame = useCurrentFrame();
  const appear = fade(frame, delay, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 280,
        height: 106,
        padding: "12px 20px",
        boxSizing: "border-box",
        borderRadius: 18,
        background: "rgba(8,17,26,.92)",
        border: `3px solid ${color}`,
        boxShadow: `0 0 35px ${color}55`,
        color: C.ink,
        fontSize: 42,
        fontWeight: 1000,
        letterSpacing: -1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: appear,
        transform: `scale(${0.85 + appear * 0.15})`,
      }}
    >
      {label}
    </div>
  );
};

const SignalChip: React.FC<{icon: string; label: string; x: number; y: number; delay: number; color?: string; dim?: boolean}> = ({
  icon,
  label,
  x,
  y,
  delay,
  color = C.cyan,
  dim = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 140}});
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 310,
        height: 112,
        padding: "14px 22px",
        boxSizing: "border-box",
        borderRadius: 28,
        border: `2px solid ${dim ? "rgba(255,255,255,.18)" : color}`,
        background: dim ? "rgba(20,26,32,.58)" : `${color}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        opacity: enter * (dim ? 0.48 : 1),
        transform: `scale(${0.82 + enter * 0.18})`,
      }}
    >
      <span style={{fontSize: 42}}>{icon}</span>
      <span style={{fontSize: 25, lineHeight: 1.05, fontWeight: 900, color: C.ink, textAlign: "center"}}>{label}</span>
    </div>
  );
};

const MapPhone: React.FC<{frame: number; circleScale?: number; drift?: number}> = ({frame, circleScale = 1, drift = 0}) => {
  const pulse = 1 + Math.sin(frame / 10) * 0.035;
  return (
    <div style={{position: "absolute", left: 200, top: 420, width: 680, height: 1040, borderRadius: 80, background: "#101a24", border: "6px solid #33404d", boxShadow: "0 30px 100px rgba(0,0,0,.55)", overflow: "hidden"}}>
      <div style={{position: "absolute", inset: 24, borderRadius: 58, background: "linear-gradient(150deg,#c9d9d1,#9db5ac)", overflow: "hidden"}}>
        {[0, 1, 2, 3, 4].map((i) => <div key={`v${i}`} style={{position: "absolute", left: 70 + i * 115, top: -50, width: 34, height: 1100, background: i % 2 ? "#809b91" : "#e6ece8", transform: "rotate(13deg)", opacity: .8}} />)}
        {[0, 1, 2, 3].map((i) => <div key={`h${i}`} style={{position: "absolute", left: -60, top: 160 + i * 235, width: 780, height: 26, background: "#eef3f0", transform: "rotate(-9deg)", opacity: .9}} />)}
        <div style={{position: "absolute", left: 250 + drift, top: 400, width: 210 * circleScale, height: 210 * circleScale, marginLeft: -105 * circleScale, marginTop: -105 * circleScale, borderRadius: "50%", background: "rgba(74,163,255,.22)", border: "4px solid rgba(88,182,255,.55)", transform: `scale(${pulse})`, boxShadow: "0 0 55px rgba(74,163,255,.3)"}} />
        <div style={{position: "absolute", left: 250 + drift, top: 400, width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: "50%", background: "#1688ff", border: "6px solid white", boxShadow: "0 0 20px rgba(0,77,255,.6)"}} />
      </div>
      <div style={{position: "absolute", top: 20, left: "50%", width: 150, height: 28, transform: "translateX(-50%)", borderRadius: 20, background: "#06090d"}} />
    </div>
  );
};

const HookSplit: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, dialogue = [], durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const activeIndex = Math.max(0, dialogue.reduce((latest, line, index) => frame >= line.start_frame ? index : latest, 0));
  const active = dialogue[activeIndex];
  const start = active?.start_frame ?? 0;
  const bubble = spring({frame: frame - start, fps, config: {damping: 14, stiffness: 170}});
  const freeze = fade(frame, durationInFrames - 34, 12);
  const driver = active?.speaker === "driver";
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.06} scaleFrom={1.02} scaleTo={1.08} />
      <AbsoluteFill style={{clipPath: "polygon(0 0,50% 0,50% 100%,0 100%)", background: "rgba(0,210,106,.09)"}} />
      <AbsoluteFill style={{clipPath: "polygon(50% 0,100% 0,100% 100%,50% 100%)", background: "rgba(94,231,255,.08)"}} />
      <div style={{position: "absolute", left: 538, top: 0, bottom: 0, width: 4, background: "rgba(255,255,255,.7)"}} />
      <PhoneStatus x={70} y={220} label="ĐÃ TỚI NƠI" delay={6} />
      <PhoneStatus x={660} y={220} label="TÀI XẾ ĐÃ TỚI" color={C.cyan} delay={14} />
      {active && (
        <div style={{position: "absolute", left: driver ? 70 : 560, bottom: 290, width: 450, minHeight: 128, padding: "24px 28px", boxSizing: "border-box", borderRadius: 30, background: driver ? "rgba(0,210,106,.94)" : "rgba(247,251,255,.96)", color: driver ? "#03110a" : "#0a131d", fontSize: 31, lineHeight: 1.18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: bubble * (1 - freeze), transform: `translateY(${(1 - bubble) * 24}px)`}}>
          {active.text}
        </div>
      )}
      <AbsoluteFill style={{background: "rgba(2,7,12,.78)", opacity: freeze}} />
      <div style={{position: "absolute", left: 70, right: 70, top: 650, opacity: freeze, transform: `scale(${0.94 + freeze * 0.06})`}}>
        <AccentText text={headline} accentWord={accentWord} size={62} />
      </div>
    </AbsoluteFill>
  );
};

const AddressCase: React.FC<GpsAccuracySceneProps> = ({headline = "", subheadline, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  const neighbor = continuation ? 1 : fade(frame, 130, 18);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.18} scaleFrom={1.08} scaleTo={1.18} />
      <div style={{position: "absolute", left: 70, right: 70, top: 90}}><AccentText text={headline} size={48} /></div>
      <AddressPlaque label="111/35" x={120} y={620} color={C.amber} delay={continuation ? -30 : 22} />
      <AddressPlaque label="111/35A" x={680} y={620} color={C.green} delay={continuation ? -30 : 42} />
      <div style={{position: "absolute", left: 140, top: 748}}><Pill color={C.amber}>TÀI XẾ</Pill></div>
      <div style={{position: "absolute", left: 735, top: 748}}><Pill>KHÁCH</Pill></div>
      {subheadline && <div style={{position: "absolute", left: 310, right: 310, top: 310, minHeight: 70, padding: "14px 22px", boxSizing: "border-box", borderRadius: 999, background: "rgba(7,13,20,.92)", border: `2px solid ${C.cyan}`, color: C.cyan, fontSize: 22, lineHeight: 1, fontWeight: 1000, letterSpacing: 1.1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", whiteSpace: "nowrap", opacity: fade(frame, 6, 14)}}>{subheadline}</div>}
      <div style={{position: "absolute", left: 110, bottom: 250, width: 440, minHeight: 104, padding: "18px 24px", boxSizing: "border-box", borderRadius: 26, background: C.panel, border: `2px solid ${C.amber}`, color: C.ink, fontSize: 28, lineHeight: 1.15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: neighbor}}>
        Ông hàng xóm:<br />“Lại Grab nữa hả?”
      </div>
    </AbsoluteFill>
  );
};

const BothRight: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord}) => {
  const frame = useCurrentFrame();
  const distance = interpolate(frame, [60, 110], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.72} blur={5} />
      <PhoneStatus x={90} y={360} label="✓ ĐÚNG VỊ TRÍ" delay={8} />
      <PhoneStatus x={640} y={360} label="✓ ĐÚNG VỊ TRÍ" color={C.cyan} delay={18} />
      <div style={{position: "absolute", left: 265, top: 650, width: 550, height: 5, background: `linear-gradient(90deg,${C.green},${C.cyan})`, transform: `scaleX(${distance})`, transformOrigin: "left"}} />
      <div style={{position: "absolute", left: 397, top: 614, width: 286, height: 74, padding: "12px 18px", boxSizing: "border-box", borderRadius: 999, background: C.bg, border: "2px solid rgba(255,255,255,.35)", color: C.ink, fontSize: 24, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", opacity: distance}}>CÁCH NHAU VÀI CĂN</div>
      <div style={{position: "absolute", left: 85, right: 85, bottom: 300, opacity: fade(frame, 115, 20)}}><AccentText text={headline} accentWord={accentWord} size={64} /></div>
    </AbsoluteFill>
  );
};

const Uncertainty: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, subheadline, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  const drift = segment > 2 ? interpolate(frame, [0, 100], [0, 135], clamp) : 0;
  const circleScale = continuation
    ? interpolate(frame, [0, 180], [2.2, 2.7], clamp)
    : interpolate(frame, [35, 150], [0.1, 2.2], clamp);
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <MapPhone frame={frame} circleScale={circleScale} drift={drift} />
      <div style={{position: "absolute", left: 80, right: 80, top: 105, opacity: fade(frame, 0, 18)}}><AccentText text={headline} accentWord={accentWord} size={52} /></div>
      <div style={{position: "absolute", left: 110, right: 110, bottom: 125, minHeight: 110, padding: "20px 28px", boxSizing: "border-box", borderRadius: 28, background: C.panel, border: `2px solid ${C.cyan}`, color: C.ink, fontSize: 29, lineHeight: 1.2, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: continuation ? 1 : fade(frame, 155, 20)}}>{subheadline}</div>
    </AbsoluteFill>
  );
};

const SensorFusion: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, subheadline, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  const converge = continuation ? 1 : interpolate(frame, [55, 180], [0, 1], clamp);
  const nodes = [
    {icon: "🛰️", label: "GPS", x: 80, y: 440, delay: 15},
    {icon: "◉", label: "WI-FI", x: 690, y: 440, delay: 32},
    {icon: "▥", label: "SÓNG DI ĐỘNG", x: 80, y: 1040, delay: 49},
    {icon: "↗", label: "CẢM BIẾN", x: 690, y: 1040, delay: 66},
  ];
  return (
    <AbsoluteFill style={{background: "radial-gradient(circle at 50% 50%,#122337 0%,#070d14 60%)"}}>
      <div style={{position: "absolute", left: 80, right: 80, top: 105}}><AccentText text={headline} accentWord={accentWord} size={50} /></div>
      <svg width="1080" height="1920" style={{position: "absolute", inset: 0}}>
        {nodes.map((n, i) => {
          const x1 = n.x + 155;
          const y1 = n.y + 56;
          return <line key={i} x1={x1} y1={y1} x2={540} y2={810} stroke={i === 0 ? C.green : C.cyan} strokeWidth={5} strokeDasharray="12 14" strokeDashoffset={-frame * 3} opacity={converge * .72} />;
        })}
      </svg>
      {nodes.map((n) => <SignalChip key={n.label} {...n} delay={continuation ? -30 : n.delay} />)}
      <div style={{position: "absolute", left: 370, top: 650, width: 340, height: 340, borderRadius: 76, border: `4px solid ${C.green}`, background: "linear-gradient(145deg,#162530,#09121b)", boxShadow: `0 0 ${40 + converge * 50}px ${C.green}55`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, transform: `scale(${0.86 + converge * .14})`}}>
        <div style={{fontSize: 86}}>📱</div>
        <div style={{fontSize: 28, fontWeight: 1000, color: C.ink, textAlign: "center"}}>ƯỚC LƯỢNG<br />TỐT NHẤT</div>
      </div>
      <div style={{position: "absolute", left: 120, right: 120, bottom: 150, color: C.dim, fontSize: 29, lineHeight: 1.2, fontWeight: 750, textAlign: "center", opacity: continuation ? 1 : fade(frame, 165, 18)}}>{subheadline}</div>
    </AbsoluteFill>
  );
};

const FiveMeters: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, subheadline}) => {
  const frame = useCurrentFrame();
  const spread = interpolate(frame, [25, 115], [0, 1], clamp);
  const punch = fade(frame, 135, 14);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.28} scaleFrom={1.04} scaleTo={1.13} />
      <div style={{position: "absolute", left: 80, right: 80, top: 105}}><AccentText text={headline} accentWord={accentWord} size={54} /></div>
      <div style={{position: "absolute", left: 120, top: 720, width: 840 * spread, height: 8, background: C.green, boxShadow: `0 0 24px ${C.green}`}} />
      <div style={{position: "absolute", left: 108, top: 682, width: 28, height: 84, borderLeft: `6px solid ${C.green}`, borderTop: `6px solid ${C.green}`, borderBottom: `6px solid ${C.green}`}} />
      <div style={{position: "absolute", right: 108, top: 682, width: 28, height: 84, borderRight: `6px solid ${C.green}`, borderTop: `6px solid ${C.green}`, borderBottom: `6px solid ${C.green}`, opacity: spread}} />
      <div style={{position: "absolute", left: 390, top: 626, width: 300, height: 92, padding: "12px 22px", boxSizing: "border-box", borderRadius: 999, background: C.panel, border: `3px solid ${C.green}`, color: C.ink, fontSize: 46, fontWeight: 1000, display: "flex", alignItems: "center", justifyContent: "center", opacity: spread}}>5 MÉT</div>
      <AddressPlaque label="111/35" x={110} y={860} color={C.amber} delay={65} />
      <AddressPlaque label="111/35A" x={690} y={860} color={C.green} delay={75} />
      <div style={{position: "absolute", left: 95, right: 95, bottom: 205, minHeight: 150, padding: "26px 34px", boxSizing: "border-box", borderRadius: 34, background: "rgba(7,13,20,.94)", border: `3px solid ${C.amber}`, color: C.ink, fontSize: 46, lineHeight: 1.05, fontWeight: 1000, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", opacity: punch, transform: `scale(${.92 + punch * .08})`}}>{subheadline}</div>
    </AbsoluteFill>
  );
};

const Multipath: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  const draw = continuation ? 1 : interpolate(frame, [20, 150], [0, 1], clamp);
  const drift = continuation
    ? interpolate(frame, [0, 190], [92, 132], clamp)
    : interpolate(frame, [120, 250], [0, 92], clamp);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.62} scaleFrom={1.03} scaleTo={1.1} />
      <div style={{position: "absolute", left: 70, right: 70, top: 90}}><AccentText text={headline} accentWord={accentWord} size={49} /></div>
      <svg width="1080" height="1920" style={{position: "absolute", inset: 0}}>
        <g opacity={draw}>
          <circle cx="175" cy="290" r="34" fill={C.cyan} /><path d="M145 255l60 70M205 255l-60 70" stroke={C.cyan} strokeWidth="8" />
          <circle cx="535" cy="235" r="34" fill={C.cyan} /><path d="M505 200l60 70M565 200l-60 70" stroke={C.cyan} strokeWidth="8" />
          <circle cx="875" cy="300" r="34" fill={C.cyan} /><path d="M845 265l60 70M905 265l-60 70" stroke={C.cyan} strokeWidth="8" />
          <path d="M175 330 L340 770" stroke={C.red} strokeWidth="8" strokeDasharray="18 14" />
          <path d="M340 770 L410 805" stroke={C.red} strokeWidth="8" opacity=".5" />
          <path d="M535 275 L800 760 L560 1280" fill="none" stroke={C.amber} strokeWidth="9" strokeDasharray="22 16" strokeDashoffset={-frame * 5} />
          <path d="M875 340 L560 1280" fill="none" stroke={C.green} strokeWidth="8" strokeDasharray="18 14" strokeDashoffset={-frame * 4} />
        </g>
      </svg>
      <div style={{position: "absolute", left: 90, top: 760}}><Pill color={C.red}>BỊ CHẮN</Pill></div>
      <div style={{position: "absolute", right: 80, top: 720}}><Pill color={C.amber}>PHẢN XẠ</Pill></div>
      <div style={{position: "absolute", left: 440, top: 1230, width: 210, height: 310, borderRadius: 42, background: "#0b1520", border: "4px solid #52606d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70}}>📱</div>
      <div style={{position: "absolute", left: 520 + drift, top: 1200, width: 42, height: 42, borderRadius: "50%", background: "#1588ff", border: "6px solid white", boxShadow: "0 0 28px #1588ff"}} />
      <div style={{position: "absolute", left: 90, right: 90, bottom: 100, minHeight: 120, padding: "20px 26px", boxSizing: "border-box", borderRadius: 30, background: C.panel, border: `2px solid ${C.red}`, color: C.ink, fontSize: 32, lineHeight: 1.12, fontWeight: 1000, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", opacity: continuation ? 1 : fade(frame, 170, 20)}}>SAI SỐ CÓ THỂ TỪ VÀI MÉT → HÀNG CHỤC MÉT</div>
    </AbsoluteFill>
  );
};

const FallbackSensors: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, subheadline, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  return (
    <AbsoluteFill style={{background: "radial-gradient(circle at 50% 52%,#172431 0%,#070d14 68%)"}}>
      <div style={{position: "absolute", left: 80, right: 80, top: 105}}><AccentText text={headline} accentWord={accentWord} size={51} /></div>
      <SignalChip icon="🛰️" label="GPS YẾU" x={385} y={390} delay={continuation ? -30 : 0} color={C.red} dim />
      <SignalChip icon="◉" label="WI-FI" x={95} y={720} delay={continuation ? -30 : 35} color={C.cyan} />
      <SignalChip icon="▥" label="SÓNG DI ĐỘNG" x={675} y={720} delay={continuation ? -30 : 55} color={C.cyan} />
      <SignalChip icon="↗" label="CẢM BIẾN CHUYỂN ĐỘNG" x={385} y={1020} delay={continuation ? -30 : 75} color={C.green} />
      <div style={{position: "absolute", left: 230, right: 230, top: 1240, height: 6, background: C.amber, transform: `scaleX(${interpolate(frame, [110, 175], [0, 1], clamp)})`}} />
      {[230, 844].map((x) => <div key={x} style={{position: "absolute", left: x, top: 1205, width: 6, height: 76, background: C.amber, opacity: fade(frame, 110, 25)}} />)}
      <div style={{position: "absolute", left: 160, right: 160, bottom: 180, minHeight: 140, padding: "24px 30px", boxSizing: "border-box", borderRadius: 34, background: C.panel, border: `2px solid ${C.amber}`, color: C.ink, fontSize: 34, lineHeight: 1.15, fontWeight: 900, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", opacity: continuation ? 1 : fade(frame, 145, 18)}}>{subheadline}</div>
    </AbsoluteFill>
  );
};

const ThreeLayers: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, segment = 1}) => {
  const frame = useCurrentFrame();
  const continuation = segment > 1;
  const layers = [
    {n: "1", label: "ĐỊA CHỈ KHÁCH CHỌN", value: "111/35A", color: C.green},
    {n: "2", label: "VỊ TRÍ ĐIỆN THOẠI ƯỚC LƯỢNG", value: "QUANH 35–35A", color: C.cyan},
    {n: "3", label: "ĐIỂM TÀI XẾ ĐƯỢC DẪN TỚI", value: "GẦN 111/35", color: C.amber},
  ];
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.74} blur={4} />
      <div style={{position: "absolute", left: 75, right: 75, top: 90}}><AccentText text={headline} accentWord={accentWord} size={48} /></div>
      <div style={{position: "absolute", left: 90, right: 90, top: 380, display: "flex", flexDirection: "column", gap: 30}}>
        {layers.map((layer, i) => {
          const appear = continuation ? 1 : fade(frame, 20 + i * 45, 18);
          const offset = interpolate(frame, [180, 250], [0, (i - 1) * 28], clamp);
          return <div key={layer.n} style={{height: 260, padding: "28px 34px", boxSizing: "border-box", borderRadius: 36, background: "rgba(7,13,20,.9)", border: `3px solid ${layer.color}`, boxShadow: `0 0 38px ${layer.color}35`, display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 24, opacity: appear, transform: `translateX(${(1 - appear) * 55 + offset}px)`}}>
            <div style={{width: 74, height: 74, borderRadius: "50%", background: layer.color, color: "#061018", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 1000}}>{layer.n}</div>
            <div style={{display: "flex", flexDirection: "column", gap: 14}}>
              <div style={{fontSize: 25, lineHeight: 1.1, color: C.dim, fontWeight: 850}}>{layer.label}</div>
              <div style={{fontSize: 46, lineHeight: 1, color: C.ink, fontWeight: 1000}}>{layer.value}</div>
            </div>
          </div>;
        })}
      </div>
      <div style={{position: "absolute", left: 120, right: 120, bottom: 100, color: C.ink, fontSize: 31, lineHeight: 1.15, fontWeight: 900, textAlign: "center", opacity: continuation ? 1 : fade(frame, 215, 18)}}>RẤT GẦN NHAU ≠ CÙNG MỘT CHỖ</div>
    </AbsoluteFill>
  );
};

const Payoff: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, subheadline}) => {
  const frame = useCurrentFrame();
  const circle = interpolate(frame, [20, 100], [.2, 1], clamp);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.2} scaleFrom={1.02} scaleTo={1.08} />
      <div style={{position: "absolute", left: 115, top: 700, width: 850, height: 500, borderRadius: "50%", background: "rgba(67,166,255,.16)", border: "5px solid rgba(87,190,255,.6)", boxShadow: "0 0 80px rgba(67,166,255,.25)", transform: `scale(${circle})`}} />
      <AddressPlaque label="KHÁCH · 35A" x={650} y={760} color={C.green} delay={35} />
      <AddressPlaque label="TÀI XẾ · 35" x={100} y={900} color={C.amber} delay={48} />
      <div style={{position: "absolute", left: 65, right: 65, top: 100}}><AccentText text={headline} accentWord={accentWord} size={51} /></div>
      <div style={{position: "absolute", left: 85, right: 85, bottom: 150, minHeight: 180, padding: "28px 36px", boxSizing: "border-box", borderRadius: 38, background: "rgba(5,12,20,.94)", border: `3px solid ${C.cyan}`, color: C.ink, fontSize: 41, lineHeight: 1.12, fontWeight: 1000, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", opacity: fade(frame, 135, 20)}}>{subheadline}</div>
    </AbsoluteFill>
  );
};

const ActionSteps: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, finalText}) => {
  const frame = useCurrentFrame();
  const steps = [
    {n: "1", label: "SỐ NHÀ ĐẦY ĐỦ", detail: "Kiểm tra cả chữ A, B…", color: C.green},
    {n: "2", label: "ẢNH CỔNG · TÊN HẺM", detail: "Chọn một dấu mốc dễ thấy.", color: C.cyan},
    {n: "3", label: "GỌI XÁC NHẬN", detail: "Chốt mốc gần nhất ngoài đời.", color: C.amber},
  ];
  const final = fade(frame, 190, 18);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.78} blur={5} scaleFrom={1.04} scaleTo={1.1} />
      <div style={{position: "absolute", left: 70, right: 70, top: 90}}><AccentText text={headline} accentWord={accentWord} size={50} /></div>
      <div style={{position: "absolute", left: 90, right: 90, top: 370, display: "flex", flexDirection: "column", gap: 26}}>
        {steps.map((step, index) => {
          const appear = fade(frame, 15 + index * 45, 16);
          return <div key={step.n} style={{height: 218, padding: "26px 30px", boxSizing: "border-box", borderRadius: 34, background: "rgba(7,13,20,.92)", border: `3px solid ${step.color}`, display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: 24, opacity: appear, transform: `translateX(${(1 - appear) * 45}px)`}}>
            <div style={{width: 72, height: 72, borderRadius: "50%", background: step.color, color: "#061018", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 1000}}>{step.n}</div>
            <div style={{display: "flex", flexDirection: "column", gap: 12}}>
              <div style={{fontSize: 31, lineHeight: 1.05, color: C.ink, fontWeight: 1000}}>{step.label}</div>
              <div style={{fontSize: 25, lineHeight: 1.15, color: C.dim, fontWeight: 750}}>{step.detail}</div>
            </div>
          </div>;
        })}
      </div>
      <div style={{position: "absolute", left: 80, right: 80, bottom: 95, minHeight: 180, padding: "28px 34px", boxSizing: "border-box", borderRadius: 38, background: "rgba(5,12,20,.96)", border: `3px solid ${C.green}`, color: C.ink, fontSize: 36, lineHeight: 1.16, fontWeight: 1000, textAlign: "center", whiteSpace: "pre-line", display: "flex", alignItems: "center", justifyContent: "center", opacity: final, transform: `translateY(${(1 - final) * 28}px)`}}>{finalText}</div>
    </AbsoluteFill>
  );
};

const Ending: React.FC<GpsAccuracySceneProps> = ({headline = "", accentWord, finalText}) => {
  const frame = useCurrentFrame();
  const replayFade = 1 - fade(frame, 115, 15);
  const final = fade(frame, 120, 18);
  return (
    <AbsoluteFill>
      <AlleyPlate frame={frame} dim={0.28} scaleFrom={1.12} scaleTo={1.01} />
      <div style={{position: "absolute", right: 70, top: 370, width: 450, minHeight: 126, padding: "24px 28px", boxSizing: "border-box", borderRadius: 30, background: "rgba(247,251,255,.96)", color: "#08131d", fontSize: 32, lineHeight: 1.16, fontWeight: 850, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: replayFade}}>Ủa anh ở đâu vậy anh?</div>
      <div style={{position: "absolute", left: 80, right: 80, top: 180, opacity: final}}><AccentText text={headline} accentWord={accentWord} size={54} /></div>
      <div style={{position: "absolute", left: 70, right: 70, bottom: 90, minHeight: 290, padding: "34px 42px", boxSizing: "border-box", borderRadius: 42, background: "rgba(5,12,20,.95)", border: `3px solid ${C.green}`, color: C.ink, fontSize: 38, lineHeight: 1.18, fontWeight: 1000, textAlign: "center", whiteSpace: "pre-line", display: "flex", alignItems: "center", justifyContent: "center", opacity: final, transform: `translateY(${(1 - final) * 35}px)`}}>{finalText}</div>
    </AbsoluteFill>
  );
};

export const GpsAccuracyScene: React.FC<GpsAccuracySceneProps> = (props) => {
  const render = () => {
    switch (props.mode) {
      case "hook_split": return <HookSplit {...props} />;
      case "address_case": return <AddressCase {...props} />;
      case "both_right": return <BothRight {...props} />;
      case "uncertainty": return <Uncertainty {...props} />;
      case "sensor_fusion": return <SensorFusion {...props} />;
      case "five_meters": return <FiveMeters {...props} />;
      case "multipath": return <Multipath {...props} />;
      case "fallback_sensors": return <FallbackSensors {...props} />;
      case "three_layers": return <ThreeLayers {...props} />;
      case "payoff": return <Payoff {...props} />;
      case "action_steps": return <ActionSteps {...props} />;
      case "ending": return <Ending {...props} />;
    }
  };
  return <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden"}}>{render()}</AbsoluteFill>;
};

export default GpsAccuracyScene;
