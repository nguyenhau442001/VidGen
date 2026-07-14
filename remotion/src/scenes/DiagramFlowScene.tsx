import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DiagramFlowNode, DiagramFlowSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const NODES_START = 22;
const NODE_STAGGER = 16;

const STATUS_COLOR: Record<DiagramFlowNode["status"], string> = {
  deleted: "#ff6666",
  intact: colors.green,
  neutral: colors.textPrimary,
};

const renderHeadline = (
  headline: string,
  accentWord: string | undefined,
  accentColor: string
): React.ReactNode => {
  if (!accentWord) return <>{headline}</>;
  const index = headline.indexOf(accentWord);
  if (index === -1) return <>{headline}</>;
  const before = headline.slice(0, index);
  const after = headline.slice(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
      {after}
    </>
  );
};

export const DiagramFlowScene: React.FC<DiagramFlowSceneProps> = ({
  headline,
  accentWord,
  nodes,
  arrow = "→",
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headlineOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const footerStart = NODES_START + nodes.length * NODE_STAGGER + 16;
  const footerOpacity = interpolate(frame, [footerStart, footerStart + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={colors.cyan} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 70,
          }}
        >
          {renderHeadline(headline, accentWord, colors.cyan)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {nodes.map((node, i) => {
            const start = NODES_START + i * NODE_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 18 });
            const color = STATUS_COLOR[node.status] ?? colors.textPrimary;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    width: "100%",
                    padding: "18px 26px",
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: `1px solid ${color}44`,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                    textDecoration: node.status === "deleted" ? "line-through" : "none",
                    textDecorationColor: "#ff6666",
                  }}
                >
                  <span style={{ fontSize: 34 }}>{node.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 24, fontWeight: 600, color }}>{node.label}</span>
                    {node.sublabel && (
                      <span style={{ fontSize: 16, fontWeight: 400, color: colors.textDim, marginTop: 2 }}>
                        {node.sublabel}
                      </span>
                    )}
                  </div>
                </div>
                {i < nodes.length - 1 && (
                  <div style={{ fontSize: 26, color: colors.textDim, padding: "4px 0" }}>{arrow}</div>
                )}
              </div>
            );
          })}
        </div>

        {footer && (
          <div
            style={{
              marginTop: 48,
              fontSize: 24,
              fontWeight: 600,
              color: colors.cyan,
              textAlign: "center",
              opacity: footerOpacity,
            }}
          >
            {footer}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default DiagramFlowScene;
