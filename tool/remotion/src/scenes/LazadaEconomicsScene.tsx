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
import { LazadaEconomicsSceneProps } from "../types";

const ACCENT = "#ff4f9a";
const BG = "#090711";
const TEXT = "rgba(255,255,255,0.96)";
const DIM = "rgba(255,255,255,0.58)";
const PANEL = "rgba(255,255,255,0.055)";
const BORDER = "rgba(255,255,255,0.14)";
const MUTED = "rgba(255,255,255,0.09)";
const DANGER = "#ff6b81";

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
          width: 650,
          height: 650,
          left: -180 + drift,
          top: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}28 0%, transparent 68%)`,
          filter: "blur(18px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -160 - drift * 0.7,
          bottom: 190,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(117,76,255,0.18) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />
      {Array.from({ length: 18 }, (_, i) => {
        const x = (i * 173) % 1000;
        const y = 120 + ((i * 311) % 1520);
        const opacity = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(frame * 0.035 + i));
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

const Eyebrow: React.FC<{ children: React.ReactNode; opacity?: number }> = ({
  children,
  opacity = 1,
}) => (
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
      boxShadow: accent ? `0 0 38px ${ACCENT}1f` : "0 22px 60px rgba(0,0,0,0.2)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

const HookVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const titleSpring = spring({ frame: frame - 8, fps, config: { stiffness: 190, damping: 17 } });
  const cardSpring = spring({ frame: frame - 20, fps, config: { stiffness: 170, damping: 18 } });
  const tags = ["9.9", "11.11", "12.12"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 38 }}>
      <Eyebrow opacity={fade(frame, 0, 12)}>LAZADA · SALE DAY</Eyebrow>
      <div
        style={{
          opacity: clamp(titleSpring),
          transform: `translateY(${(1 - clamp(titleSpring)) * 26}px) scale(${0.92 + clamp(titleSpring) * 0.08})`,
        }}
      >
        <Headline text={headline} accentWord={accentWord} fontSize={60} />
      </div>
      <Card
        accent
        style={{
          opacity: clamp(cardSpring),
          transform: `scale(${0.92 + clamp(cardSpring) * 0.08})`,
          width: 720,
          height: 470,
          padding: "34px 38px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 18 }}>
          {tags.map((tag, i) => {
            const s = spring({ frame: frame - 24 - i * 6, fps, config: { stiffness: 230, damping: 15 } });
            return (
              <div
                key={tag}
                style={{
                  width: 126,
                  height: 72,
                  borderRadius: 18,
                  background: i === 2 ? ACCENT : MUTED,
                  color: "#fff",
                  fontSize: 26,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * -36}px) rotate(${(i - 1) * 3}deg)`,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 62 }}>
          <Card
            style={{
              flex: 1,
              height: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ color: DIM, fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>ĐƠN HÀNG</div>
            <div style={{ color: ACCENT, fontSize: 56, fontWeight: 900 }}>↗</div>
          </Card>
          <Card
            style={{
              flex: 1,
              height: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ color: DIM, fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>LỢI NHUẬN</div>
            <div
              style={{
                color: TEXT,
                fontSize: 56,
                fontWeight: 900,
                transform: `scale(${1 + Math.sin(frame * 0.18) * 0.06})`,
              }}
            >
              ?
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

const DisclosureVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const platforms = ["AliExpress", "Trendyol", "Lazada", "Alibaba.com"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <Eyebrow opacity={fade(frame, 0)}>ĐỌC ĐÚNG PHẠM VI SỐ LIỆU</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <div style={{ display: "flex", gap: 24, width: 824 }}>
        <Card style={{ width: 400, minHeight: 510, padding: 28 }}>
          <div style={{ color: DIM, fontSize: 17, fontWeight: 800, letterSpacing: 1.2 }}>SỐ ĐƯỢC CÔNG BỐ</div>
          <div style={{ color: TEXT, fontSize: 42, fontWeight: 900, marginTop: 12 }}>AIDC</div>
          <div style={{ color: ACCENT, fontSize: 22, fontWeight: 800, marginTop: 8 }}>CẢ MẢNG QUỐC TẾ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
            {platforms.map((item, i) => {
              const s = spring({ frame: frame - 24 - i * 7, fps, config: { stiffness: 190, damping: 18 } });
              return (
                <div
                  key={item}
                  style={{
                    height: 50,
                    borderRadius: 14,
                    background: item === "Lazada" ? `${ACCENT}1b` : MUTED,
                    border: `1px solid ${item === "Lazada" ? `${ACCENT}77` : BORDER}`,
                    color: item === "Lazada" ? ACCENT : DIM,
                    fontSize: 18,
                    fontWeight: 800,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: clamp(s),
                    transform: `translateX(${(1 - clamp(s)) * -18}px)`,
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>
        </Card>
        <Card accent style={{ width: 400, minHeight: 510, padding: 28 }}>
          <div style={{ color: DIM, fontSize: 17, fontWeight: 800, letterSpacing: 1.2 }}>RIÊNG LAZADA</div>
          <div style={{ color: TEXT, fontSize: 38, fontWeight: 900, marginTop: 22, lineHeight: 1.16, whiteSpace: "pre" }}>
            KHÔNG CÔNG BỐ{`\n`}LỢI NHUẬN RIÊNG
          </div>
          <div style={{ height: 1, background: BORDER, margin: "34px 0" }} />
          <div style={{ color: DIM, fontSize: 16, fontWeight: 800 }}>MỐC ĐƯỢC BÁO CÁO</div>
          <div
            style={{
              marginTop: 16,
              minHeight: 118,
              padding: "18px 20px",
              borderRadius: 18,
              background: ACCENT,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 900 }}>07/2024</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>EBITDA DƯƠNG THEO THÁNG</div>
          </div>
        </Card>
      </div>
      <div style={{ color: DIM, fontSize: 16, fontWeight: 700 }}>AIDC ≠ số lợi nhuận riêng của Lazada</div>
    </div>
  );
};

const GmvVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const platformItems = ["HOA HỒNG", "QUẢNG CÁO", "PHÍ DỊCH VỤ"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
      <Eyebrow opacity={fade(frame, 0)}>DÒNG TIỀN CỦA MỘT ĐƠN</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card accent style={{ width: 760, padding: "30px 34px" }}>
        <div style={{ color: DIM, fontSize: 16, fontWeight: 800, textAlign: "center", letterSpacing: 1.1 }}>TỔNG GIÁ TRỊ HÀNG HÓA</div>
        <div style={{ color: TEXT, fontSize: 58, fontWeight: 900, textAlign: "center", marginTop: 8 }}>500.000Đ GMV</div>
        <div style={{ height: 3, background: MUTED, borderRadius: 999, margin: "28px 0" }}>
          <div
            style={{
              height: "100%",
              width: `${fade(frame, 26, 34) * 100}%`,
              background: ACCENT,
              borderRadius: 999,
              boxShadow: `0 0 18px ${ACCENT}`,
            }}
          />
        </div>
        <Card
          style={{
            minHeight: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
          }}
        >
          <div style={{ fontSize: 28 }}>🏪</div>
          <div style={{ color: TEXT, fontSize: 24, fontWeight: 900 }}>PHẦN LỚN → NGƯỜI BÁN</div>
        </Card>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          {platformItems.map((item, i) => {
            const s = spring({ frame: frame - 68 - i * 8, fps, config: { stiffness: 200, damping: 18 } });
            return (
              <div
                key={item}
                style={{
                  flex: 1,
                  minHeight: 76,
                  padding: "14px 10px",
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: MUTED,
                  color: i === 0 ? ACCENT : TEXT,
                  fontSize: 16,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 18}px)`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{ color: DIM, fontSize: 15, fontWeight: 700 }}>MINH HỌA CƠ CHẾ · KHÔNG PHẢI TAKE RATE LAZADA</div>
    </div>
  );
};

const CostVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
}) => {
  const rows = [
    ["VẬN HÀNH + HỆ THỐNG", "TRỪ"],
    ["CHĂM SÓC KHÁCH HÀNG", "TRỪ"],
    ["KHO + LOGISTICS", "TRỪ"],
    ["VOUCHER / SHIP SÀN TÀI TRỢ", "TRỪ"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <Eyebrow opacity={fade(frame, 0)}>UNIT ECONOMICS</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card style={{ width: 760, padding: "26px 34px" }}>
        <div
          style={{
            minHeight: 74,
            padding: "16px 22px",
            borderRadius: 16,
            background: `${ACCENT}18`,
            border: `1px solid ${ACCENT}66`,
            color: ACCENT,
            fontSize: 22,
            fontWeight: 900,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>DOANH THU TỪ ĐƠN</span>
          <span>GIỮ LẠI</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {rows.map(([label, value], i) => {
            const s = spring({ frame: frame - 30 - i * 10, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div
                key={label}
                style={{
                  minHeight: 62,
                  padding: "12px 20px",
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  background: MUTED,
                  color: TEXT,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: clamp(s),
                  transform: `translateX(${(1 - clamp(s)) * -18}px)`,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800 }}>{label}</span>
                <span style={{ fontSize: 17, fontWeight: 900, color: DANGER }}>{value}</span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            opacity: fade(frame, 82, 18),
            marginTop: 20,
            minHeight: 82,
            padding: "16px 20px",
            borderRadius: 16,
            background: `${DANGER}18`,
            border: `1px solid ${DANGER}66`,
            color: TEXT,
            fontSize: 24,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          DOANH THU − CHI PHÍ = <span style={{ color: DANGER, marginLeft: 8 }}>CÓ THỂ ÂM</span>
        </div>
      </Card>
      <div style={{ color: DIM, fontSize: 15, fontWeight: 700 }}>SƠ ĐỒ CƠ CHẾ · KHÔNG PHẢI SỐ NỘI BỘ LAZADA</div>
    </div>
  );
};

const FlowVisual: React.FC<{
  frame: number;
  fps: number;
  headline: string;
  accentWord?: string;
  variant: "objective" | "scale";
}> = ({ frame, fps, headline, accentWord, variant }) => {
  const steps =
    variant === "objective"
      ? [
          ["NGÂN SÁCH", "💳"],
          ["KHÁCH MỚI", "👤"],
          ["THÓI QUEN", "↻"],
          ["MẬT ĐỘ ĐƠN", "▦"],
        ]
      : [
          ["ĐƠN ĐỦ DÀY", "▦"],
          ["GOM NHIỀU KIỆN", "📦"],
          ["KHO HIỆU QUẢ", "⌂"],
          ["LỖ / ĐƠN GIẢM", "↘"],
        ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Eyebrow opacity={fade(frame, 0)}>{variant === "objective" ? "HIDDEN OBJECTIVE" : "OPERATING LEVERAGE"}</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <div style={{ width: 720, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {steps.map(([label, icon], i) => {
          const s = spring({ frame: frame - 24 - i * 16, fps, config: { stiffness: 190, damping: 18 } });
          const active = i === steps.length - 1;
          return (
            <React.Fragment key={label}>
              <Card
                accent={active}
                style={{
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 18}px)`,
                  width: 650,
                  minHeight: 106,
                  padding: "18px 26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: active ? ACCENT : MUTED,
                    color: "#fff",
                    fontSize: 27,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {icon}
                </div>
                <div style={{ color: active ? ACCENT : TEXT, fontSize: 25, fontWeight: 900 }}>{label}</div>
                <div style={{ color: active ? ACCENT : DIM, fontSize: 30, fontWeight: 900 }}>{i + 1}</div>
              </Card>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 3,
                    height: 34,
                    background: `linear-gradient(${ACCENT}, ${ACCENT}33)`,
                    opacity: fade(frame, 38 + i * 16, 12),
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ color: DIM, fontSize: 15, fontWeight: 700 }}>
        {variant === "objective" ? "VOUCHER = CHI PHÍ MUA TĂNG TRƯỞNG" : "CƠ CHẾ MINH HỌA · KHÔNG PHẢI DỮ LIỆU LAZADA"}
      </div>
    </div>
  );
};

const TimelineVisual: React.FC<{ frame: number; fps: number; headline: string; accentWord?: string; sourceLabel?: string }> = ({
  frame,
  fps,
  headline,
  accentWord,
  sourceLabel,
}) => {
  const stages = [
    ["GIAI ĐOẠN ĐẦU", "ĐẦU TƯ TĂNG TRƯỞNG"],
    ["THU HẸP LỖ", "MONETIZATION + HIỆU QUẢ"],
    ["07/2024", "EBITDA DƯƠNG THEO THÁNG"],
  ];
  const lineProgress = fade(frame, 30, 58);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 38 }}>
      <Eyebrow opacity={fade(frame, 0)}>DỮ KIỆN ĐÓNG VÒNG LẶP</Eyebrow>
      <Headline text={headline} accentWord={accentWord} />
      <Card style={{ width: 800, minHeight: 500, padding: "56px 36px 34px", position: "relative" }}>
        <div style={{ position: "absolute", left: 96, right: 96, top: 142, height: 4, background: MUTED, borderRadius: 999 }}>
          <div style={{ width: `${lineProgress * 100}%`, height: "100%", background: ACCENT, borderRadius: 999, boxShadow: `0 0 18px ${ACCENT}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
          {stages.map(([date, label], i) => {
            const s = spring({ frame: frame - 24 - i * 22, fps, config: { stiffness: 190, damping: 18 } });
            return (
              <div key={date} style={{ width: 220, display: "flex", flexDirection: "column", alignItems: "center", opacity: clamp(s) }}>
                <div style={{ color: i === 2 ? ACCENT : DIM, fontSize: 17, fontWeight: 900, minHeight: 48, textAlign: "center" }}>{date}</div>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: i === 2 ? ACCENT : BG,
                    border: `3px solid ${i === 2 ? ACCENT : BORDER}`,
                    boxShadow: i === 2 ? `0 0 28px ${ACCENT}88` : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 900,
                    zIndex: 1,
                  }}
                >
                  {i + 1}
                </div>
                <Card
                  accent={i === 2}
                  style={{
                    marginTop: 34,
                    width: 216,
                    minHeight: 128,
                    padding: "18px 16px",
                    color: i === 2 ? ACCENT : TEXT,
                    fontSize: 18,
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
        <div style={{ marginTop: 54, color: DIM, fontSize: 15, lineHeight: 1.4, fontWeight: 700, textAlign: "center" }}>
          {sourceLabel}
        </div>
      </Card>
    </div>
  );
};

const CtaVisual: React.FC<{ frame: number; fps: number; durationInFrames: number }> = ({
  frame,
  fps,
  durationInFrames,
}) => {
  const switchFrame = Math.round(durationInFrames * 0.43);
  const verdictOut = interpolate(frame, [switchFrame - 16, switchFrame + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const questionIn = fade(frame, switchFrame, 18);
  const payers = [
    ["Lazada", "L"],
    ["Shop", "🏪"],
    ["Ngân hàng", "🏦"],
  ];
  return (
    <div style={{ width: 824, minHeight: 940, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: verdictOut,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <Eyebrow>ĐÓNG VÒNG LẶP</Eyebrow>
        <Headline text={"SALE ≠ LỜI\nSALE ≠ LỖ"} accentWord="≠" fontSize={70} />
        <Card accent style={{ minWidth: 520, minHeight: 96, padding: "18px 28px", color: ACCENT, fontSize: 28, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          SALE MUA QUY MÔ
        </Card>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: questionIn,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <Eyebrow>OPEN LOOP TIẾP THEO</Eyebrow>
        <Headline text={"AI TRẢ VOUCHER\n100.000Đ?"} accentWord="AI" fontSize={58} />
        <div
          style={{
            minWidth: 270,
            height: 92,
            padding: "0 28px",
            borderRadius: 999,
            background: ACCENT,
            color: "#fff",
            fontSize: 32,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 46px ${ACCENT}77`,
          }}
        >
          −100.000Đ
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {payers.map(([label, icon], i) => {
            const s = spring({ frame: frame - switchFrame - 20 - i * 7, fps, config: { stiffness: 190, damping: 17 } });
            return (
              <Card
                key={label}
                accent={i === 0}
                style={{
                  width: 248,
                  minHeight: 170,
                  padding: "20px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  opacity: clamp(s),
                  transform: `translateY(${(1 - clamp(s)) * 24}px)`,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: i === 0 ? ACCENT : MUTED,
                    color: "#fff",
                    fontSize: 28,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {icon}
                </div>
                <div style={{ color: i === 0 ? ACCENT : TEXT, fontSize: 21, fontWeight: 900, textAlign: "center" }}>{label}</div>
              </Card>
            );
          })}
        </div>
        <div style={{ color: DIM, fontSize: 16, fontWeight: 700 }}>TÙY TỪNG CHƯƠNG TRÌNH</div>
      </div>
    </div>
  );
};

export const LazadaEconomicsScene: React.FC<LazadaEconomicsSceneProps> = ({
  mode,
  headline,
  accentWord,
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
    if (mode === "disclosure") return <DisclosureVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "gmv_split") return <GmvVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "cost_ledger") return <CostVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} />;
    if (mode === "hidden_objective") {
      return <FlowVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} variant="objective" />;
    }
    if (mode === "scale_flywheel") {
      return <FlowVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} variant="scale" />;
    }
    if (mode === "profitability_timeline") {
      return <TimelineVisual frame={frame} fps={fps} headline={headline} accentWord={accentWord} sourceLabel={sourceLabel} />;
    }
    return <CtaVisual frame={frame} fps={fps} durationInFrames={durationInFrames} />;
  })();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: BE_VIETNAM_PRO, color: TEXT, opacity: exit, overflow: "hidden" }}>
      <Backdrop frame={frame} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>{content}</SafeZone>
    </AbsoluteFill>
  );
};

export default LazadaEconomicsScene;
