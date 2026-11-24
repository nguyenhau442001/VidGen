import React from "react";
import { AbsoluteFill } from "remotion";
import { DeepDiveDocumentVisual } from "../../types/editorial";
import { CameraRig25D, TactileCard, TextHighlighter } from "../../primitives";

export const DeepDiveDocumentScene: React.FC<
  DeepDiveDocumentVisual & { durationInFrames: number }
> = ({
  documentTitle,
  sourceAuthority = "INTERNAL DOCUMENT",
  dateLabel,
  paragraphs,
  marginNote,
  durationInFrames,
}) => {
  return (
    <CameraRig25D
      durationInFrames={durationInFrames}
      zoomStart={1.0}
      zoomEnd={1.06}
      driftIntensity={0.65}
      tiltX={2}
      tiltY={-1.5}
    >
      <AbsoluteFill
        style={{
          backgroundColor: "#0d1117",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 48px",
        }}
      >
        <TactileCard
          texture="paper"
          accent="tape"
          rotationDeg={-0.8}
          style={{
            width: "100%",
            maxWidth: 960,
            minHeight: 1100,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            boxSizing: "border-box",
          }}
        >
          {/* Document Header */}
          <div
            style={{
              borderBottom: "2px solid rgba(0,0,0,0.12)",
              paddingBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#d90429",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                ● {sourceAuthority}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 42,
                  fontWeight: 800,
                  color: "#111827",
                  lineHeight: 1.25,
                }}
              >
                {documentTitle}
              </h2>
            </div>
            {dateLabel && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18,
                  color: "#6b7280",
                }}
              >
                {dateLabel}
              </span>
            )}
          </div>

          {/* Paragraphs with Text Highlighter */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 32,
              lineHeight: 1.6,
              color: "#1f2937",
            }}
          >
            {paragraphs.map((p, pIdx) => (
              <p key={pIdx} style={{ margin: 0 }}>
                {p.segments.map((seg, sIdx) => {
                  if (seg.highlighted) {
                    return (
                      <TextHighlighter
                        key={sIdx}
                        startFrame={18 + pIdx * 15 + sIdx * 8}
                        color={seg.color || "rgba(255, 230, 0, 0.65)"}
                      >
                        <strong style={{ fontWeight: 800, color: "#000" }}>
                          {seg.text}
                        </strong>
                      </TextHighlighter>
                    );
                  }
                  return <span key={sIdx}>{seg.text}</span>;
                })}
              </p>
            ))}
          </div>

          {/* Handwritten Margin Note */}
          {marginNote && (
            <div
              style={{
                marginTop: "auto",
                paddingTop: 24,
                borderTop: "1px dashed rgba(0,0,0,0.18)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 22,
                  color: "#d90429",
                  fontWeight: 800,
                }}
              >
                [NOTE]:
              </span>
              <span
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#374151",
                  fontStyle: "italic",
                }}
              >
                {marginNote.text}
              </span>
            </div>
          )}
        </TactileCard>
      </AbsoluteFill>
    </CameraRig25D>
  );
};
