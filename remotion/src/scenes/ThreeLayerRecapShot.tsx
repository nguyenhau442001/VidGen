import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThreeLayerRecapVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { phaseProgress } from "./shared/cinematicPrimitives";

export type ThreeLayerRecapSceneProps = ThreeLayerRecapVisual & { durationInFrames: number };

const STAGGER = 26;
const ENTER_DURATION = 16;
const FADE_DURATION = 24;

// The three recap cards enter one at a time (staggered) but all three share
// one `fadeStartFrame` + FADE_DURATION window for their exit — so they fade
// out together rather than each fading on its own offset timeline.
export const ThreeLayerRecapShot: React.FC<ThreeLayerRecapSceneProps> = ({
  layers = [
    { label: "Người dùng chung máy", sublabel: "không thấy lịch sử" },
    { label: "Website", sublabel: "vẫn nhận lượt truy cập" },
    { label: "Tài khoản đã đăng nhập", sublabel: "hoạt động có thể được ghi nhận" },
  ],
  fadeStartFrame,
  accentColor = colors.green,
  durationInFrames,
  instantCount = 0,
}) => {
  const frame = useCurrentFrame();
  const lastEnterStart = 20 + (layers.length - 1) * STAGGER;
  const resolvedFadeStart = fadeStartFrame ?? Math.max(lastEnterStart + 40, durationInFrames - FADE_DURATION - 6);

  const groupFadeOut = 1 - phaseProgress(frame, resolvedFadeStart, FADE_DURATION);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 900, opacity: groupFadeOut }}>
          {layers.map((layer, i) => {
            // Cards before `instantCount` are already-established carry-over
            // from a previous shot (e.g. shot_08a ended holding on card 1;
            // shot_08b picks up with card 1 already in place, frame 0) — they
            // render fully in place instead of replaying their entrance.
            const start = i < instantCount ? -1 : 20 + i * STAGGER;
            const enter = i < instantCount ? 1 : phaseProgress(frame, start, ENTER_DURATION);
            return (
              <div
                key={i}
                style={{
                  opacity: enter,
                  transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 28px",
                  borderRadius: 18,
                  background: "rgba(0,0,0,0.045)",
                  border: "1px solid rgba(0,0,0,0.09)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: accentColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: INTER,
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 26, color: colors.textPrimary }}>
                    {layer.label}
                  </span>
                  <span style={{ fontFamily: INTER, fontWeight: 500, fontSize: 22, color: colors.textDim }}>
                    {layer.sublabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ThreeLayerRecapShot;
