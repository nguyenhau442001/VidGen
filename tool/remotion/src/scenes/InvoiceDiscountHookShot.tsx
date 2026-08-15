import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { InvoiceDiscountHookSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors, P3Icons } from "./shared/grabfoodP3Palette";

// Frame plan: receipt card settles in (0-20), a finger dot taps the code chip
// (~50). The chip then flips into GrabFood's real "applied code" state — a
// checkmark replaces the tag icon and the discount value prints inline on
// the right of the row, same as the app itself shows "-40.000đ" next to an
// applied voucher — before the amount also splits off toward the total line.
const TAP_FRAME = 50;
const APPLY_FRAME = TAP_FRAME + 8;
const SPLIT_FRAME = 66;

const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = p3Colors.grab }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7.5 12.5l3 3 6-6.5" stroke="#04140a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InvoiceDiscountHookShot: React.FC<InvoiceDiscountHookSceneProps> = ({
  headline,
  accentWord,
  items,
  subtotalLabel = "TẠM TÍNH",
  subtotal,
  codeLabel = "MÃ GIẢM GIÁ",
  discountAmount,
  totalLabel = "TỔNG",
  total,
  illustrativeLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 26 });
  const fingerOpacity = interpolate(frame, [TAP_FRAME - 14, TAP_FRAME - 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fingerPress = spring({ frame: frame - TAP_FRAME, fps, config: { damping: 12, stiffness: 260 }, durationInFrames: 14 });
  const chipFlash = interpolate(frame, [TAP_FRAME, TAP_FRAME + 8, TAP_FRAME + 20], [0, 1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const appliedSpring = spring({ frame: frame - APPLY_FRAME, fps, config: { damping: 14, stiffness: 170 }, durationInFrames: 20 });
  const appliedProgress = Math.min(1, appliedSpring);
  const checkOpacity = interpolate(frame, [APPLY_FRAME, APPLY_FRAME + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const splitProgress = interpolate(frame, [SPLIT_FRAME, SPLIT_FRAME + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const splitSpring = spring({ frame: frame - SPLIT_FRAME, fps, config: { damping: 14, stiffness: 90 }, durationInFrames: 34 });
  const badgeOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 }, durationInFrames: 26 });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const splitX = splitSpring * 210;
  const splitY = -splitSpring * 40;

  const accentIndex = accentWord ? (headline ?? "").indexOf(accentWord) : -1;
  const headlineBefore = accentIndex >= 0 ? headline!.slice(0, accentIndex) : headline;
  const headlineAfter = accentIndex >= 0 ? headline!.slice(accentIndex + (accentWord?.length ?? 0)) : "";

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          {illustrativeLabel && (
            <div
              style={{
                position: "absolute",
                top: 0,
                opacity: badgeOpacity,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: p3Colors.textDim,
              }}
            >
              {illustrativeLabel}
            </div>
          )}

          {headline && (
            <div
              style={{
                opacity: Math.min(1, headlineSpring),
                transform: `translateY(${(1 - Math.min(1, headlineSpring)) * 18}px)`,
                marginBottom: 36,
                maxWidth: 780,
                textAlign: "center",
                fontSize: 40,
                fontWeight: 900,
                lineHeight: 1.28,
                color: p3Colors.textPrimary,
                whiteSpace: "pre-line",
                textShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              {accentIndex >= 0 ? (
                <>
                  {headlineBefore}
                  <span style={{ color: p3Colors.grab }}>{accentWord}</span>
                  {headlineAfter}
                </>
              ) : (
                headline
              )}
            </div>
          )}

          <div
            style={{
              opacity: Math.min(1, cardSpring),
              transform: `translateY(${(1 - Math.min(1, cardSpring)) * 30}px) scale(${0.94 + Math.min(1, cardSpring) * 0.06})`,
              width: 620,
              borderRadius: 28,
              background: p3Colors.paper,
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              padding: "40px 36px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <P3Icons.Receipt size={26} color="#1a2e22" />
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22" }}>Hóa đơn GrabFood</div>
            </div>

            {(items ?? []).map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "rgba(20,30,24,0.72)",
                  marginBottom: 10,
                }}
              >
                <span>{item.label}</span>
                <span>{item.price}</span>
              </div>
            ))}

            <div style={{ height: 1, background: "rgba(20,30,24,0.14)", margin: "14px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, fontWeight: 700, color: "rgba(20,30,24,0.55)" }}>
              <span>{subtotalLabel}</span>
              <span style={{ textDecoration: splitProgress > 0.05 ? "line-through" : "none" }}>{subtotal}</span>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 18px",
                borderRadius: 16,
                background: `rgba(0,177,79,${0.12 + chipFlash * 0.25})`,
                border: `2px solid ${p3Colors.grab}`,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 22, height: 22 }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - checkOpacity }}>
                    <P3Icons.Tag size={22} />
                  </div>
                  <div style={{ position: "absolute", inset: 0, opacity: checkOpacity }}>
                    <CheckIcon size={22} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0e3b20", letterSpacing: 0.5 }}>{codeLabel}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: p3Colors.grab,
                      opacity: checkOpacity,
                      height: checkOpacity > 0 ? "auto" : 0,
                      overflow: "hidden",
                    }}
                  >
                    Đã áp dụng
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: p3Colors.grab,
                  opacity: appliedProgress,
                  transform: `scale(${0.85 + appliedProgress * 0.15})`,
                  whiteSpace: "nowrap",
                }}
              >
                {discountAmount}
              </span>

              {fingerOpacity > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: 26,
                    top: "50%",
                    opacity: fingerOpacity * (1 - checkOpacity),
                    transform: `translateY(-50%) scale(${1 - Math.min(1, fingerPress) * 0.22})`,
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12V4.5a1.5 1.5 0 0 1 3 0V11l1-.3a2 2 0 0 1 2.5 1.9v2.9a5 5 0 0 1-5 5h-1a5 5 0 0 1-4.4-2.6L3.5 14"
                      stroke="#0e3b20"
                      strokeWidth="1.6"
                      fill="#f7faf8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              {splitProgress > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: -30,
                    top: "50%",
                    opacity: Math.min(1, splitSpring * 1.4),
                    transform: `translate(${splitX}px, calc(-50% + ${splitY}px)) scale(${0.7 + splitSpring * 0.3})`,
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: p3Colors.cost,
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 900,
                    boxShadow: "0 16px 40px rgba(239,68,68,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {discountAmount}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontSize: 28,
                fontWeight: 900,
                color: "#0e3b20",
              }}
            >
              <span>{totalLabel}</span>
              <span>{total}</span>
            </div>
          </div>
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default InvoiceDiscountHookShot;
