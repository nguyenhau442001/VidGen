import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneMapSceneProps } from "../types";
import { INTER } from "../styles";

const VB_W = 750;
const VB_H = 1080;

const PHONE_W = 320;
const PHONE_H = 580;
const MAP_H = 580 - 24; // height minus status bar

const PhoneMapScene: React.FC<PhoneMapSceneProps> = ({
  pins = [],
  headline,
  showRadius = false,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. Scaled container to fit 750x1080 viewBox inside the 1080x1920 target composition
  const scale = height / VB_H;
  const scaledWidth = VB_W * scale;
  const leftOffset = (width - scaledWidth) / 2;

  // 2. Headline animation: Frame 0-15 (slide up + fade)
  const headlineSpring = frame >= 0
    ? spring({
        frame,
        fps,
        config: { damping: 18, stiffness: 120 },
      })
    : 0;
  const headlineOpacity = headlineSpring;
  const headlineTranslateY = interpolate(headlineSpring, [0, 1], [20, 0]);

  // 3. Phone Mockup animation: Frame 15-35 (scale in with spring damping 20)
  const phoneSpring = frame >= 15
    ? spring({
        frame: frame - 15,
        fps,
        config: { damping: 20, stiffness: 100 },
      })
    : 0;
  const phoneScale = phoneSpring;
  const phoneOpacity = interpolate(phoneSpring, [0, 0.2, 1], [0, 1, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: leftOffset,
          width: VB_W,
          height: VB_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Headline */}
        <div
          style={{
            position: "absolute",
            top: 120,
            width: VB_W,
            textAlign: "center",
            color: "#ffffff",
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 26,
            fontWeight: 700,
            opacity: headlineOpacity,
            transform: `translateY(${headlineTranslateY}px)`,
            padding: "0 20px",
            boxSizing: "border-box",
          }}
        >
          {headline}
        </div>

        {/* Phone Mockup Wrapper */}
        <div
          style={{
            position: "absolute",
            left: VB_W / 2 - PHONE_W / 2,
            top: VB_H / 2 - PHONE_H / 2,
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: 32,
            border: "2px solid rgba(255, 255, 255, 0.13)",
            backgroundColor: "#111318",
            overflow: "hidden",
            opacity: phoneOpacity,
            transform: `scale(${phoneScale})`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Status Bar */}
          <div
            style={{
              height: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 16px",
              color: "rgba(255, 255, 255, 0.8)",
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: "#111318",
            }}
          >
            <div>09:41</div>
            {/* Minimal flat design indicators */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Signal Bars */}
              <svg width="15" height="10" viewBox="0 0 16 10" fill="currentColor">
                <rect x="0" y="8" width="2" height="2" rx="0.5" />
                <rect x="4" y="6" width="2" height="4" rx="0.5" />
                <rect x="8" y="4" width="2" height="6" rx="0.5" />
                <rect x="12" y="1" width="2" height="9" rx="0.5" />
              </svg>
              {/* Battery indicator */}
              <svg width="18" height="10" viewBox="0 0 18 10" fill="currentColor">
                <rect
                  x="0"
                  y="0"
                  width="15"
                  height="10"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <rect x="2" y="2" width="11" height="6" rx="1" />
                <rect x="16" y="3" width="1.5" height="4" rx="0.5" />
              </svg>
            </div>
          </div>

          {/* Map Area */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#0d1117",
              position: "relative",
              overflow: "hidden",
              // Grid background
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.024) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.024) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
            }}
          >
            {/* SVG Overlay for drawing pins and pulse lines */}
            <svg
              width={PHONE_W}
              height={MAP_H}
              viewBox={`0 0 ${PHONE_W} ${MAP_H}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              {pins.map((pin, i) => {
                const px = pin.x * PHONE_W;
                const py = pin.y * MAP_H;

                // Frame 35+: pins drop in staggered (10 frames apart)
                const pinDropFrame = 35 + i * 10;
                const pinSpring = frame >= pinDropFrame
                  ? spring({
                      frame: frame - pinDropFrame,
                      fps,
                      config: { damping: 15, stiffness: 120 },
                    })
                  : 0;

                const pinTranslateY = interpolate(pinSpring, [0, 1], [-20, 0]);

                const pinType = pin.type || "driver";

                // Pulsing ring for 'user' pins (loop every 60 frames)
                const pulseProgress = (frame % 60) / 60;
                const pulseScale = interpolate(pulseProgress, [0, 1], [1, 2.5]);
                const pulseOpacity = interpolate(pulseProgress, [0, 1], [0.6, 0]);

                return (
                  <g
                    key={pin.id}
                    style={{
                      opacity: pinSpring,
                      transform: `translateY(${pinTranslateY}px) scale(${pinSpring})`,
                      transformOrigin: `${px}px ${py}px`,
                    }}
                  >
                    {/* Pulsing ring around user pin */}
                    {showRadius && pinType === "user" && (
                      <circle
                        cx={px}
                        cy={py}
                        r={20}
                        fill="none"
                        stroke="#61dafb"
                        strokeWidth={2}
                        opacity={pulseOpacity}
                        style={{
                          transform: `scale(${pulseScale})`,
                          transformOrigin: `${px}px ${py}px`,
                        }}
                      />
                    )}

                    {/* Driver Pin Type */}
                    {pinType === "driver" && (
                      <g>
                        {/* Green outer circle */}
                        <circle cx={px} cy={py} r={8} fill="#00ff41" />
                        {/* White inner center dot */}
                        <circle cx={px} cy={py} r={3} fill="#ffffff" />
                        {/* Label below */}
                        {pin.label && (
                          <text
                            x={px}
                            y={py + 20}
                            fill="#00ff41"
                            fontFamily={`${INTER}, sans-serif`}
                            fontSize={12}
                            fontWeight={600}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {pin.label}
                          </text>
                        )}
                      </g>
                    )}

                    {/* User Pin Type */}
                    {pinType === "user" && (
                      <g>
                        {/* Cyan teardrop shape (pointing down to px, py) */}
                        <path
                          d={`M ${px} ${py} 
                              C ${px - 12} ${py - 14} ${px - 12} ${py - 26} ${px} ${py - 26} 
                              C ${px + 12} ${py - 26} ${px + 12} ${py - 14} ${px} ${py} Z`}
                          fill="#61dafb"
                        />
                        {/* White inner dot */}
                        <circle cx={px} cy={py - 16} r={4} fill="#ffffff" />
                        {/* Label below */}
                        {pin.label && (
                          <text
                            x={px}
                            y={py + 16}
                            fill="#ffffff"
                            fontFamily={`${INTER}, sans-serif`}
                            fontSize={12}
                            fontWeight={600}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {pin.label}
                          </text>
                        )}
                      </g>
                    )}

                    {/* Zone Pin Type */}
                    {pinType === "zone" && (
                      <g>
                        {/* Dashed rectangular zone */}
                        <rect
                          x={px - 32}
                          y={py - 24}
                          width={64}
                          height={48}
                          rx={6}
                          fill="none"
                          stroke="#00ff4144"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                        {/* Label centered in the zone */}
                        {pin.label && (
                          <text
                            x={px}
                            y={py}
                            fill="#00ff4188"
                            fontFamily={`${INTER}, sans-serif`}
                            fontSize={12}
                            fontWeight={500}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {pin.label}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default PhoneMapScene;
