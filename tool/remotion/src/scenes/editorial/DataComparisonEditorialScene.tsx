import React from "react";
import { AbsoluteFill } from "remotion";
import { DataComparisonEditorialVisual } from "../../types/editorial";
import { CameraRig25D, RubberStamp, TactileCard } from "../../primitives";

export const DataComparisonEditorialScene: React.FC<
  DataComparisonEditorialVisual & { durationInFrames: number }
> = ({
  headline,
  question,
  leftSide,
  rightSide,
  insightCallout,
  durationInFrames,
}) => {
  return (
    <CameraRig25D
      durationInFrames={durationInFrames}
      zoomStart={1.0}
      zoomEnd={1.05}
      driftIntensity={0.5}
    >
      <AbsoluteFill
        style={{
          backgroundColor: "#0d1117",
          padding: "70px 48px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              fontWeight: 800,
              color: "#38bdf8",
              letterSpacing: "0.14em",
              marginBottom: 10,
            }}
          >
            [SYSTEM ANALYSIS]
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 46,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h1>
          {question && (
            <p
              style={{
                margin: "12px 0 0 0",
                fontFamily: "'Be Vietnam Pro', sans-serif",
                fontSize: 26,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {question}
            </p>
          )}
        </div>

        {/* 2-Column Comparison Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            flex: 1,
            alignItems: "stretch",
          }}
        >
          {/* Left Side: Wrong Belief */}
          <TactileCard
            texture="paper"
            rotationDeg={-1}
            enterFrame={5}
            accent="none"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderTop: "8px solid #94a3b8",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                NGƯỜI XEM NGHĨ
              </div>
              <div
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#1e293b",
                  lineHeight: 1.3,
                  marginBottom: 16,
                }}
              >
                {leftSide.label}
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#475569",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 20,
                }}
              >
                {leftSide.metric}
              </div>
              <ul
                style={{
                  paddingLeft: 20,
                  margin: 0,
                  fontSize: 22,
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
                {leftSide.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
            {leftSide.stamp && (
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <RubberStamp text={leftSide.stamp} color="#64748b" startFrame={16} size="sm" />
              </div>
            )}
          </TactileCard>

          {/* Right Side: True Objective */}
          <TactileCard
            texture="paper"
            rotationDeg={1.2}
            enterFrame={12}
            accent="tape"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderTop: "8px solid #10b981",
              backgroundColor: "#f0fdf4",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#059669",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                MỤC TIÊU THẬT SỰ
              </div>
              <div
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#065f46",
                  lineHeight: 1.3,
                  marginBottom: 16,
                }}
              >
                {rightSide.label}
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#047857",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 20,
                }}
              >
                {rightSide.metric}
              </div>
              <ul
                style={{
                  paddingLeft: 20,
                  margin: 0,
                  fontSize: 22,
                  color: "#065f46",
                  lineHeight: 1.6,
                }}
              >
                {rightSide.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
            {rightSide.stamp && (
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <RubberStamp text={rightSide.stamp} color="#059669" startFrame={24} size="sm" />
              </div>
            )}
          </TactileCard>
        </div>

        {/* Insight Callout */}
        {insightCallout && (
          <div
            style={{
              marginTop: 28,
              padding: "20px 28px",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              borderLeft: "5px solid #f59e0b",
              color: "#f8fafc",
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 24,
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            💡 {insightCallout}
          </div>
        )}
      </AbsoluteFill>
    </CameraRig25D>
  );
};
