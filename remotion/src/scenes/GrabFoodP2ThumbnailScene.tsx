import React from "react";
import { AbsoluteFill } from "remotion";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

// Static thumbnail (still, frame 0 only — no animation) for
// grabcar_optimization_mode_p2. Purpose-built for this video's dark
// cinematic identity instead of reusing the channel's generic light-theme
// Thumbnail composition, which reads shot[0]'s props (accentColor,
// partLabel) that this video's shots never set and falls back to a
// mismatched light-background, icon-overlapping-text result.
//
// Visual: the same map-dot-glow -> phone-silhouette motif that opens shot 1,
// frozen mid-morph, with the "9/10" stakes badge as the hook and the
// thesis question as the headline.
export type GrabFoodP2ThumbnailProps = {
  seriesLabel: string; // "GRABFOOD · PHẦN 2"
  headline: string; // hook question, e.g. "HAI LỰA CHỌN NÀY CÓ THỰC SỰ NGANG NHAU?"
  targetCurrent: number;
  targetTotal: number;
  illustrativeLabel: string; // "Tình huống minh họa"
  channelName?: string;
};

export const GrabFoodP2ThumbnailScene: React.FC<GrabFoodP2ThumbnailProps> = ({
  seriesLabel,
  headline,
  targetCurrent,
  targetTotal,
  illustrativeLabel,
  channelName = "DevFaster",
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      {/* Ambient glow, static (still frame — no frame-driven motion needed) */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: "50%",
          top: "30%",
          marginLeft: -450,
          marginTop: -450,
          background: `radial-gradient(circle, ${p2Colors.grab} 0%, transparent 70%)`,
          opacity: 0.16,
          filter: "blur(40px)",
        }}
      />

      {/* Series eyebrow */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 70,
          padding: "10px 20px",
          borderRadius: 999,
          background: "rgba(0,177,79,0.14)",
          border: `1.5px solid ${p2Colors.grab}`,
          color: p2Colors.grab,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 1.5,
        }}
      >
        {seriesLabel}
      </div>

      {/* Phone silhouette with the "target" badge — the shot 1 hook, frozen */}
      <div style={{ position: "absolute", left: "50%", top: 330, marginLeft: -210, width: 420, height: 640 }}>
        <div
          style={{
            width: 420,
            height: 640,
            borderRadius: 44,
            border: `3px solid ${p2Colors.grabDim}`,
            background: `linear-gradient(180deg, ${p2Colors.bgDeep} 0%, #0d1420 100%)`,
            boxShadow: `0 0 80px rgba(0,177,79,0.22)`,
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "absolute", top: 24, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <P2Icons.Phone size={20} color={p2Colors.textDim} />
            <span style={{ fontSize: 15, color: p2Colors.danger, fontWeight: 700 }}>PIN 5%</span>
          </div>

          <svg width="420" height="640" style={{ position: "absolute", inset: 0 }}>
            <path
              d="M 120 260 Q 220 400 160 560"
              stroke={p2Colors.warmHome}
              strokeWidth="5"
              fill="none"
              strokeDasharray="10 8"
              opacity={0.6}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: 260,
              borderRadius: 20,
              padding: "24px 22px",
              background: "rgba(0,177,79,0.16)",
              border: `2px solid ${p2Colors.grab}`,
              textAlign: "center",
              boxSizing: "border-box",
              boxShadow: `0 0 40px rgba(0,177,79,0.25)`,
            }}
          >
            <div style={{ fontSize: 17, color: p2Colors.textDim, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
              MỤC TIÊU HÔM NAY
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, color: p2Colors.textPrimary, lineHeight: 1 }}>
              {targetCurrent}/{targetTotal}
            </div>
            <div
              style={{
                marginTop: 12,
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                fontSize: 13,
                color: p2Colors.textDim,
                fontWeight: 600,
              }}
            >
              {illustrativeLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Headline hook */}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 1080,
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1.15,
          color: p2Colors.textPrimary,
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {headline}
      </div>

      {/* Channel mark */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 700,
          color: p2Colors.textDim,
          letterSpacing: 1,
        }}
      >
        {channelName}
      </div>
    </AbsoluteFill>
  );
};

export default GrabFoodP2ThumbnailScene;
