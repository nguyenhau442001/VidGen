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
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { Ios18AndroidSceneProps, Ios18AndroidCompareSide } from "../types";

// Resolve an authored image path ("images/foo.jpg" or a bare basename) to a
// staticFile() URL. The pipeline copies every referenced asset to
// remotion/public/images/<basename>, so only the basename matters here.
const assetUrl = (p: string): string =>
  staticFile("images/" + p.split("/").pop());

// Cinematic near-black backdrop for a "tech documentary" feel — deliberately
// NOT the light channel theme: this video is a moody comparison piece.
const BG = "#08090d";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.58)";
const FAINT = "rgba(255,255,255,0.4)";
const PANEL = "rgba(255,255,255,0.045)";
const BORDER = "rgba(255,255,255,0.13)";
// One colour per side — a deliberate A/B, not two accents fighting in one card.
const APPLE = "#63b3ff"; // iOS 18 side
const ANDROID = "#37d67a"; // Android side
const GOLD = "#f5c451"; // climax price beat
const DANGER = "#ff5c5c";

const clamp = (v: number): number => Math.max(0, Math.min(1, v));

const fade = (frame: number, start: number, duration = 14): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const accentText = (
  text: string,
  accentWord: string | undefined,
  color: string,
): React.ReactNode => {
  if (!accentWord || !text.includes(accentWord)) return text;
  const i = text.indexOf(accentWord);
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color, textShadow: `0 0 26px ${color}88` }}>{accentWord}</span>
      {text.slice(i + accentWord.length)}
    </>
  );
};

const Backdrop: React.FC<{ frame: number; tint: string }> = ({ frame, tint }) => {
  const drift = Math.sin(frame * 0.013) * 30;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: -180 + drift,
          top: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tint}12 0%, transparent 70%)`,
          filter: "blur(26px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          right: -160 - drift,
          bottom: 60,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tint}0d 0%, transparent 72%)`,
          filter: "blur(30px)",
        }}
      />
    </AbsoluteFill>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; opacity?: number }> = ({
  children,
  color = TEXT,
  opacity = 1,
}) => (
  <div
    style={{
      opacity,
      alignSelf: "center",
      minHeight: 38,
      padding: "8px 20px",
      borderRadius: 999,
      border: `1px solid ${color}55`,
      background: `${color}14`,
      color,
      fontSize: 15,
      fontWeight: 800,
      letterSpacing: 1.4,
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

const Headline: React.FC<{
  text: string;
  accentWord?: string;
  accentColor?: string;
  opacity?: number;
  fontSize?: number;
}> = ({ text, accentWord, accentColor = APPLE, opacity = 1, fontSize = 42 }) => (
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
    {accentText(text, accentWord, accentColor)}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      borderRadius: 24,
      border: `1.5px solid ${BORDER}`,
      background: PANEL,
      boxShadow: "0 22px 60px rgba(0,0,0,0.4)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

// --- primitive icons (SVG only, no emoji) -----------------------------------

const AndroidMark: React.FC<{ size?: number; color?: string }> = ({ size = 30, color = ANDROID }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 10.5v6.2a1.3 1.3 0 0 0 1.3 1.3h9.4a1.3 1.3 0 0 0 1.3-1.3v-6.2Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <path d="M4 11v4.5M20 11v4.5M9 19v2.2M15 19v2.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <path
      d="M6 9.6C6 6.5 8.7 4.2 12 4.2S18 6.5 18 9.6Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <path d="M8.4 4.4 7.3 2.9M15.6 4.4l1.1-1.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <circle cx={9.4} cy={7} r={0.7} fill={color} />
    <circle cx={14.6} cy={7} r={0.7} fill={color} />
  </svg>
);

const AppleMark: React.FC<{ size?: number; color?: string }> = ({ size = 30, color = APPLE }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 3 2.3 1.2-.05 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.75 1.3-.02 2.1-1.15 2.9-2.28.9-1.3 1.28-2.55 1.3-2.62-.03-.02-2.5-.96-2.5-3.8Z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <path d="M13.6 4.6c.7-.85 1.15-2 1-3.1-1 .04-2.2.68-2.9 1.52-.63.74-1.17 1.9-1 3 1.1.08 2.2-.57 2.9-1.42Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

// Phone shell used across compare / chat modes for the drawn mock UI.
const Phone: React.FC<{
  children?: React.ReactNode;
  accent: string;
  width?: number;
  height?: number;
}> = ({ children, accent, width = 300, height = 460 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 34,
      border: `5px solid rgba(255,255,255,0.16)`,
      background: "#0c111b",
      boxShadow: `0 26px 60px rgba(0,0,0,0.5), inset 0 0 0 1px ${accent}22`,
      padding: 14,
      boxSizing: "border-box",
      overflow: "hidden",
      position: "relative",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: 90,
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.14)",
      }}
    />
    <div style={{ marginTop: 20, width: "100%", height: "calc(100% - 20px)" }}>{children}</div>
  </div>
);

// Official press screenshot — Apple / Google / Samsung renders ship WITH their
// own device frame on a light ground, so we show them on a light card (reads as
// "a pulled press asset") rather than stuffing them inside our drawn bezel.
const PressShot: React.FC<{
  image: string;
  width: number;
  height: number;
  reveal?: number;
  accent?: string;
}> = ({ image, width, height, reveal = 1, accent = "rgba(255,255,255,0.16)" }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 22,
      background: "#f2f3f5",
      border: `1px solid ${accent}`,
      boxShadow: "0 26px 60px rgba(0,0,0,0.5)",
      overflow: "hidden",
      opacity: reveal,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Img src={assetUrl(image)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </div>
);

const IconTile: React.FC<{
  color: string;
  size?: number;
  radius?: number;
  filled?: boolean;
}> = ({ color, size = 42, radius = 12, filled = true }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: filled ? color : "transparent",
      border: filled ? "none" : `2px solid ${color}`,
      boxShadow: filled ? `0 4px 14px ${color}44` : "none",
    }}
  />
);

// ---------------------------------------------------------------------------
// Mode: hook — the mandated line, then a fast 4-pair Android→iOS montage strip.
// ---------------------------------------------------------------------------
const HookVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  heroImage?: string;
}> = ({ frame, fps, headline, accentWord, heroImage }) => {
  const titleSpring = spring({ frame: frame - 6, fps, config: { stiffness: 180, damping: 18 } });
  const pairs = ["Home Screen", "Icon tùy biến", "Bảng điều khiển", "Khóa ứng dụng"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: heroImage ? 22 : 34 }}>
      <Eyebrow color={APPLE} opacity={fade(frame, 0, 12)}>
        iOS 18 · iPHONE vs ANDROID
      </Eyebrow>
      <div
        style={{
          opacity: clamp(titleSpring),
          transform: `translateY(${(1 - clamp(titleSpring)) * 22}px)`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} accentColor={APPLE} fontSize={40} />
      </div>
      {heroImage && (
        <PressShot
          image={heroImage}
          width={224}
          height={330}
          reveal={fade(frame, 12, 16)}
          accent={`${APPLE}55`}
        />
      )}
      <Card style={{ width: 840, padding: heroImage ? "18px 22px" : "26px 22px", display: "flex", flexDirection: "column", gap: heroImage ? 8 : 12 }}>
        {pairs.map((label, i) => {
          const rowIn = spring({ frame: frame - 24 - i * 12, fps, config: { stiffness: 200, damping: 20 } });
          const swap = fade(frame, 40 + i * 12, 10);
          return (
            <div
              key={label}
              style={{
                opacity: clamp(rowIn),
                transform: `translateX(${(1 - clamp(rowIn)) * -20}px)`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                minHeight: 56,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                background: "rgba(255,255,255,0.03)",
                padding: "8px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: 44 }}>
                <AndroidMark size={26} />
              </div>
              <span style={{ color: DIM, fontSize: 17, fontWeight: 800, flex: 1 }}>{label}</span>
              <svg width={26} height={16} viewBox="0 0 26 16" fill="none" style={{ opacity: 0.5 }}>
                <path d="M0 8h22M15 1l8 7-8 7" stroke={FAINT} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: 44, justifyContent: "flex-end", opacity: 0.3 + swap * 0.7 }}>
                <AppleMark size={26} color={APPLE} />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: compare — two phones side by side, Android left / iOS 18 right, each
// with a label, a short bullet list, and a source/era badge.
// ---------------------------------------------------------------------------
const CompareColumn: React.FC<{
  frame: number;
  fps: number;
  side: Ios18AndroidCompareSide;
  accent: string;
  Mark: React.FC<{ size?: number; color?: string }>;
  delay: number;
  align: "left" | "right";
}> = ({ frame, fps, side, accent, Mark, delay, align }) => {
  const s = spring({ frame: frame - delay, fps, config: { stiffness: 180, damping: 20 } });
  return (
    <div
      style={{
        opacity: clamp(s),
        transform: `translateX(${(1 - clamp(s)) * (align === "left" ? -30 : 30)}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: 330,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mark size={26} color={accent} />
        <span style={{ color: accent, fontSize: 18, fontWeight: 900, letterSpacing: 0.4 }}>
          {side.label}
        </span>
      </div>
      {side.image ? (
        <PressShot
          image={side.image}
          width={300}
          height={396}
          reveal={fade(frame, delay + 8, 16)}
          accent={`${accent}55`}
        />
      ) : (
        <Phone accent={accent} width={300} height={396}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 4px" }}>
            {/* mock icon grid — rows morph per side via `side.grid` */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, justifyItems: "center" }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const gap = side.gridGaps?.includes(i);
                const revealed = fade(frame, delay + 14 + i * 3, 10);
                return (
                  <div key={i} style={{ opacity: gap ? 0 : revealed }}>
                    <IconTile color={accent} size={44} radius={side.tinted ? 13 : 11} filled={!side.outlined} />
                  </div>
                );
              })}
            </div>
          </div>
        </Phone>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2, width: 288 }}>
        {side.bullets.map((b, i) => {
          const bs = fade(frame, delay + 26 + i * 8, 10);
          return (
            <div key={b} style={{ opacity: bs, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: accent, marginTop: 8, flexShrink: 0 }} />
              <span style={{ color: TEXT, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{b}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          opacity: fade(frame, delay + 40, 12),
          padding: "7px 14px",
          borderRadius: 999,
          border: `1px solid ${accent}55`,
          background: `${accent}12`,
          color: accent,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.5,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {side.badge}
      </div>
    </div>
  );
};

const CompareVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  left?: Ios18AndroidCompareSide;
  right?: Ios18AndroidCompareSide;
  footnote?: string;
}> = ({ frame, fps, headline, accentWord, left, right, footnote }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
    <Eyebrow color={APPLE} opacity={fade(frame, 0)}>
      ĐỐI CHIẾU
    </Eyebrow>
    <Headline text={headline} accentWord={accentWord} accentColor={APPLE} fontSize={36} />
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start", justifyContent: "center" }}>
      {left && (
        <CompareColumn frame={frame} fps={fps} side={left} accent={ANDROID} Mark={AndroidMark} delay={14} align="left" />
      )}
      {right && (
        <CompareColumn frame={frame} fps={fps} side={right} accent={APPLE} Mark={AppleMark} delay={26} align="right" />
      )}
    </div>
    {footnote && (
      <div
        style={{
          opacity: fade(frame, 60, 14),
          color: FAINT,
          fontSize: 13,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: 720,
          lineHeight: 1.4,
        }}
      >
        {footnote}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Mode: chat — two message threads; a plain SMS bubble upgrades to an RCS
// bubble with a typing indicator + read receipt.
// ---------------------------------------------------------------------------
const ChatVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  footnote?: string;
}> = ({ frame, fps, headline, accentWord, footnote }) => {
  const phoneSpring = spring({ frame: frame - 12, fps, config: { stiffness: 180, damping: 18 } });
  const upgrade = fade(frame, 46, 16);
  const typing = fade(frame, 64, 10);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <Eyebrow color={APPLE} opacity={fade(frame, 0)}>
        RCS TRONG MESSAGES
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} accentColor={APPLE} fontSize={36} />
      <div style={{ display: "flex", gap: 26, alignItems: "flex-start", justifyContent: "center" }}>
        {/* Android side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AndroidMark size={24} />
            <span style={{ color: ANDROID, fontSize: 15, fontWeight: 900 }}>Android</span>
          </div>
          <Phone accent={ANDROID} width={276} height={392}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 6px" }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "78%", padding: "10px 14px", borderRadius: 16, background: "rgba(255,255,255,0.09)", color: TEXT, fontSize: 14, fontWeight: 600 }}>
                Gửi ảnh chuyến đi nhé
              </div>
              <div style={{ opacity: typing, alignSelf: "flex-start", padding: "10px 14px", borderRadius: 16, background: "rgba(255,255,255,0.09)", display: "flex", gap: 5 }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: 999, background: FAINT }} />
                ))}
              </div>
            </div>
          </Phone>
        </div>
        {/* iPhone side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: clamp(phoneSpring) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AppleMark size={24} color={APPLE} />
            <span style={{ color: APPLE, fontSize: 15, fontWeight: 900 }}>iPhone · iOS 18</span>
          </div>
          <Phone accent={APPLE} width={276} height={392}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 6px" }}>
              {/* the bubble stays GREEN — RCS is not iMessage */}
              <div style={{ alignSelf: "flex-end", maxWidth: "80%", padding: "10px 14px", borderRadius: 16, background: ANDROID, color: "#04210f", fontSize: 14, fontWeight: 800 }}>
                Đang gửi...
              </div>
              <div
                style={{
                  opacity: upgrade,
                  alignSelf: "flex-end",
                  maxWidth: "82%",
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: ANDROID,
                  color: "#04210f",
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ width: 110, height: 64, borderRadius: 8, background: "rgba(4,33,15,0.25)" }} />
                Ảnh nét · nhóm chat mượt
              </div>
              <span style={{ opacity: upgrade, alignSelf: "flex-end", color: FAINT, fontSize: 11, fontWeight: 800 }}>
                Đã xem
              </span>
            </div>
          </Phone>
        </div>
      </div>
      {footnote && (
        <div style={{ opacity: fade(frame, 54, 14), color: FAINT, fontSize: 13, fontWeight: 800, textAlign: "center" }}>
          {footnote}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: reframe — the question "Apple chỉ đang copy Android?" then a timeline
// where an Android dot lights first, and an Apple dot lights later but its
// glow spreads across a full ecosystem ring.
// ---------------------------------------------------------------------------
const ReframeVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  question?: string;
  answer?: string;
}> = ({ frame, fps, headline, accentWord, question, answer }) => {
  const qSpring = spring({ frame: frame - 6, fps, config: { stiffness: 180, damping: 18 } });
  const aFade = fade(frame, 34, 14);
  const androidDot = fade(frame, 40, 10);
  const appleDot = fade(frame, 58, 10);
  const ringGrow = fade(frame, 66, 20);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Eyebrow color={APPLE} opacity={fade(frame, 0)}>
        VẬY LÀ COPY?
      </Eyebrow>
      <div style={{ opacity: clamp(qSpring), transform: `scale(${0.94 + clamp(qSpring) * 0.06})` }}>
        <Headline text={question ?? headline} accentWord={accentWord} accentColor={APPLE} fontSize={38} />
      </div>
      {answer && (
        <div style={{ opacity: aFade, color: ANDROID, fontSize: 20, fontWeight: 900, letterSpacing: 0.4 }}>
          {answer}
        </div>
      )}
      <Card style={{ width: 800, minHeight: 300, padding: "34px 30px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* ecosystem ring around the Apple dot */}
        <svg width={360} height={240} style={{ position: "absolute" }}>
          <line x1={70} y1={120} x2={290} y2={120} stroke={BORDER} strokeWidth={2} />
          <circle cx={70} cy={120} r={9} fill={ANDROID} opacity={androidDot} />
          <circle cx={290} cy={120} r={9} fill={APPLE} opacity={appleDot} />
          <circle
            cx={290}
            cy={120}
            r={20 + ringGrow * 70}
            fill="none"
            stroke={APPLE}
            strokeWidth={2}
            opacity={ringGrow * 0.5}
          />
          {["Phần cứng", "Phần mềm", "Dịch vụ"].map((_, i) => {
            const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const r = 20 + ringGrow * 70;
            return (
              <circle
                key={i}
                cx={290 + Math.cos(ang) * r}
                cy={120 + Math.sin(ang) * r}
                r={5}
                fill={APPLE}
                opacity={ringGrow}
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: 40, bottom: 40, color: ANDROID, fontSize: 13, fontWeight: 800 }}>
          Android · thường đi trước
        </div>
        <div style={{ position: "absolute", right: 30, bottom: 40, color: APPLE, fontSize: 13, fontWeight: 800, textAlign: "right" }}>
          Apple · tích hợp cả hệ sinh thái
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: price — iPhone Duo opens like a book, then a split vs Honda SH with
// two near-identical price tags.
// ---------------------------------------------------------------------------
const FoldingPhone: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const open = spring({ frame: frame - 8, fps, config: { stiffness: 120, damping: 20 } });
  const angle = interpolate(clamp(open), [0, 1], [72, 2]);
  return (
    <div style={{ display: "flex", perspective: 900 }}>
      <div
        style={{
          width: 92,
          height: 200,
          borderRadius: "18px 4px 4px 18px",
          background: "linear-gradient(135deg,#1a2230,#0c111b)",
          border: "3px solid rgba(255,255,255,0.18)",
          borderRight: "none",
          transform: `rotateY(${angle}deg)`,
          transformOrigin: "right center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      />
      <div
        style={{
          width: 92,
          height: 200,
          borderRadius: "4px 18px 18px 4px",
          background: "linear-gradient(225deg,#1a2230,#0c111b)",
          border: "3px solid rgba(255,255,255,0.18)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
};

const ScooterMark: React.FC<{ size?: number; color?: string }> = ({ size = 120, color = TEXT }) => (
  <svg width={size} height={size * 0.66} viewBox="0 0 120 80" fill="none">
    <circle cx={26} cy={60} r={13} stroke={color} strokeWidth={3} />
    <circle cx={96} cy={60} r={13} stroke={color} strokeWidth={3} />
    <path
      d="M26 60 46 34h20l10 10h14M46 34c2-9 8-14 16-14M60 44c10 0 18 6 22 16"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M40 24h16" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

const PriceTag: React.FC<{ value: string; label: string; color: string; opacity: number }> = ({
  value,
  label,
  color,
  opacity,
}) => (
  <div
    style={{
      opacity,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      padding: "12px 22px",
      borderRadius: 16,
      border: `2px solid ${color}`,
      background: `${color}14`,
      boxShadow: `0 0 34px ${color}33`,
    }}
  >
    <span style={{ color, fontSize: 30, fontWeight: 900, letterSpacing: 0.5 }}>{value}</span>
    <span style={{ color: DIM, fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>{label}</span>
  </div>
);

const PriceVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  priceLeft?: string;
  priceRight?: string;
  priceLeftLabel?: string;
  priceRightLabel?: string;
  heroImage?: string;
  scooterImage?: string;
  footnote?: string;
}> = ({ frame, fps, headline, accentWord, priceLeft, priceRight, priceLeftLabel, priceRightLabel, heroImage, scooterImage, footnote }) => {
  const splitFade = fade(frame, 40, 16);
  const tagsFade = fade(frame, 64, 14);
  const heroFade = fade(frame, 10, 18);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Eyebrow color={GOLD} opacity={fade(frame, 0)}>
        iPHONE DUO
      </Eyebrow>
      <Headline text={headline} accentWord={accentWord} accentColor={GOLD} fontSize={36} />
      <Card style={{ width: 820, minHeight: 400, padding: "34px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 50 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {heroImage ? (
              <PressShot image={heroImage} width={360} height={210} reveal={heroFade} accent={`${APPLE}55`} />
            ) : (
              <FoldingPhone frame={frame} fps={fps} />
            )}
            <span style={{ color: APPLE, fontSize: 14, fontWeight: 900 }}>iPhone Duo</span>
          </div>
          <div style={{ opacity: splitFade, width: 2, height: 180, background: BORDER }} />
          <div style={{ opacity: splitFade, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {scooterImage ? (
              <Img
                src={assetUrl(scooterImage)}
                style={{ width: 300, height: 200, objectFit: "contain", filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.55))" }}
              />
            ) : (
              <ScooterMark size={150} color={TEXT} />
            )}
            <span style={{ color: GOLD, fontSize: 14, fontWeight: 900 }}>Honda SH 160i</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
          {priceLeft && (
            <PriceTag value={priceLeft} label={priceLeftLabel ?? ""} color={APPLE} opacity={tagsFade} />
          )}
          {priceLeft && priceRight && (
            <span style={{ opacity: tagsFade, color: GOLD, fontSize: 30, fontWeight: 900 }}>≈</span>
          )}
          {priceRight && (
            <PriceTag value={priceRight} label={priceRightLabel ?? ""} color={GOLD} opacity={tagsFade} />
          )}
        </div>
      </Card>
      {footnote && (
        <div style={{ opacity: fade(frame, 78, 14), color: FAINT, fontSize: 13, fontWeight: 700, textAlign: "center", maxWidth: 720, lineHeight: 1.4 }}>
          {footnote}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mode: payoff — the closing line, large, on a clean field.
// ---------------------------------------------------------------------------
const PayoffVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  subline?: string;
}> = ({ frame, fps, headline, accentWord, subline }) => {
  const s = spring({ frame: frame - 8, fps, config: { stiffness: 150, damping: 20 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: fade(frame, 0, 12) }}>
        <AndroidMark size={30} />
        <div style={{ width: 40, height: 1, background: BORDER }} />
        <AppleMark size={30} color={APPLE} />
      </div>
      <div
        style={{
          opacity: clamp(s),
          transform: `translateY(${(1 - clamp(s)) * 20}px)`,
          maxWidth: 780,
        }}
      >
        <Headline text={headline} accentWord={accentWord} accentColor={APPLE} fontSize={40} />
      </div>
      {subline && (
        <div style={{ opacity: fade(frame, 30, 16), color: DIM, fontSize: 18, fontWeight: 700, textAlign: "center", maxWidth: 700, lineHeight: 1.4 }}>
          {subline}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

export const Ios18AndroidScene: React.FC<Ios18AndroidSceneProps> = ({
  mode,
  headline,
  accentWord,
  left,
  right,
  question,
  answer,
  subline,
  priceLeft,
  priceRight,
  priceLeftLabel,
  priceRightLabel,
  heroImage,
  scooterImage,
  footnote,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - 10), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const tint = mode === "price" ? GOLD : mode === "reframe" ? ANDROID : APPLE;

  const content = (() => {
    if (mode === "hook")
      return <HookVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} heroImage={heroImage} />;
    if (mode === "compare")
      return (
        <CompareVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          left={left}
          right={right}
          footnote={footnote}
        />
      );
    if (mode === "chat")
      return <ChatVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} footnote={footnote} />;
    if (mode === "reframe")
      return (
        <ReframeVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          question={question}
          answer={answer}
        />
      );
    if (mode === "price")
      return (
        <PriceVisual
          frame={frame}
          fps={fps}
          headline={headline}
          accentWord={accentWord}
          priceLeft={priceLeft}
          priceRight={priceRight}
          priceLeftLabel={priceLeftLabel}
          priceRightLabel={priceRightLabel}
          heroImage={heroImage}
          scooterImage={scooterImage}
          footnote={footnote}
        />
      );
    return <PayoffVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} subline={subline} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, overflow: "hidden" }}>
      {/* exit fade on content only — never the BG layer, or the light channel
          root behind it flashes white at every scene cut. */}
      <AbsoluteFill style={{ opacity: exit }}>
        <Backdrop frame={frame} tint={tint} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default Ios18AndroidScene;
