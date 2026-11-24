import React from "react";
import { AbsoluteFill } from "remotion";
import { InvestigationBoardVisual } from "../../types/editorial";
import { CameraRig25D, RubberStamp, TactileCard } from "../../primitives";

export const InvestigationBoardScene: React.FC<
  InvestigationBoardVisual & { durationInFrames: number }
> = ({
  headline,
  subheadline,
  caseFileNumber = "CASE FILE #2026-X",
  evidence,
  stampText,
  stampFrame = 22,
  durationInFrames,
}) => {
  return (
    <CameraRig25D
      durationInFrames={durationInFrames}
      zoomStart={1.0}
      zoomEnd={1.07}
      driftIntensity={0.5}
      tiltX={1.5}
      tiltY={-1}
    >
      <AbsoluteFill
        style={{
          backgroundColor: "#12161c",
          display: "flex",
          flexDirection: "column",
          padding: "70px 48px",
          boxSizing: "border-box",
        }}
      >
        {/* Case File Header */}
        <div style={{ marginBottom: 40, borderBottom: "2px solid rgba(255,255,255,0.1)", paddingBottom: 24 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              fontWeight: 800,
              color: "#f59e0b",
              letterSpacing: "0.14em",
              marginBottom: 8,
            }}
          >
            [DOSSIER] {caseFileNumber}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {headline}
          </h1>
          {subheadline && (
            <p
              style={{
                margin: "10px 0 0 0",
                fontFamily: "'Be Vietnam Pro', sans-serif",
                fontSize: 26,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {subheadline}
            </p>
          )}
        </div>

        {/* Evidence Grid / Pinned Cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {evidence.map((item, idx) => (
            <TactileCard
              key={item.id || idx}
              enterFrame={8 + idx * 10}
              rotationDeg={item.rotationDeg ?? (idx % 2 === 0 ? -1.5 : 1.2)}
              texture="paper"
              accent={idx === 0 ? "pushpin" : "tape"}
              style={{ padding: "28px 32px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#d90429",
                    letterSpacing: "0.08em",
                  }}
                >
                  EXHIBIT {String.fromCharCode(65 + idx)} · {item.type.toUpperCase()}
                </span>
                {item.verifiedBadge && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 16,
                      backgroundColor: "#10b981",
                      color: "#fff",
                      padding: "3px 10px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    VERIFIED
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 24,
                  lineHeight: 1.5,
                  color: "#374151",
                }}
              >
                {item.content}
              </div>
            </TactileCard>
          ))}
        </div>

        {/* Slamming Rubber Stamp */}
        {stampText && (
          <div
            style={{
              position: "absolute",
              bottom: 120,
              right: 80,
              zIndex: 50,
            }}
          >
            <RubberStamp text={stampText} startFrame={stampFrame} size="lg" />
          </div>
        )}
      </AbsoluteFill>
    </CameraRig25D>
  );
};
