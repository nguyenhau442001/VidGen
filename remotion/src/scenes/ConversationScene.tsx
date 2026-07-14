import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ConversationSceneProps } from "../types";
import { colors, INTER } from "../styles";

const VB_W = 750;
const VB_H = 1080;

const getInitials = (senderName?: string) => {
  if (!senderName) return "?";
  const parts = senderName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ConversationScene: React.FC<ConversationSceneProps> = ({
  messages = [],
  headline,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. Scaled container to fit 750x1080 viewBox inside the 1080x1920 target composition
  const scale = height / VB_H;
  const scaledWidth = VB_W * scale;
  const leftOffset = (width - scaledWidth) / 2;

  // 2. Headline fade in (Frame 0-12)
  const headlineOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3. Staggered timeline calculation: 20 frames per message + extra delay
  let currentStart = 20; // start first message at frame 20 (after headline fades in)
  const messageTimings = messages.map((msg) => {
    const delay = msg.delay ?? 0;
    const start = currentStart + delay;
    const typingStart = start - 15; // typing indicator runs for 15 frames before
    currentStart = start + 20; // 20 frames gap
    return { typingStart, start };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
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
        {headline && (
          <div
            style={{
              position: "absolute",
              top: 100,
              width: VB_W,
              textAlign: "center",
              color: colors.textPrimary,
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 24,
              fontWeight: 600,
              opacity: headlineOpacity,
              padding: "0 20px",
              boxSizing: "border-box",
            }}
          >
            {headline}
          </div>
        )}

        {/* Chat Thread Container (scrolled to bottom naturally) */}
        <div
          style={{
            position: "absolute",
            left: 50,
            top: 180,
            width: 650,
            height: 800,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 16,
            overflow: "hidden",
            boxSizing: "border-box",
            paddingBottom: 24,
          }}
        >
          {messages.map((msg, idx) => {
            const isRight = msg.side === "right";
            const timing = messageTimings[idx];
            const isTyping = frame >= timing.typingStart && frame < timing.start;
            const isShown = frame >= timing.start;

            if (!isTyping && !isShown) return null;

            // Entrance animation when fully shown
            const bubbleSpring = frame >= timing.start
              ? spring({
                  frame: frame - timing.start,
                  fps,
                  config: { damping: 18, stiffness: 120 },
                })
              : 0;

            const bubbleOpacity = bubbleSpring;
            const bubbleTranslateX = interpolate(
              bubbleSpring,
              [0, 1],
              [isRight ? 24 : -24, 0]
            );

            // Bouncing wave for typing dots (staggered by 5 frames, loops every 30 frames)
            const typingFrame = frame - timing.typingStart;
            const t = typingFrame % 30;

            return (
              <div
                key={`msg-${idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isRight ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {/* Sender Name (if left side and provided) */}
                {!isRight && msg.sender && isShown && (
                  <div
                    style={{
                      fontFamily: `${INTER}, sans-serif`,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(0, 0, 0, 0.33)",
                      marginBottom: 4,
                      marginLeft: 48, // offset to align with bubble (circle is 36px + 12px gap)
                    }}
                  >
                    {msg.sender}
                  </div>
                )}

                {/* Message bubble row container */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 12,
                    maxWidth: "100%",
                  }}
                >
                  {/* Sender Circle Initials Icon (if left side) */}
                  {!isRight && (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "#333333",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontFamily: `${INTER}, sans-serif`,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ffffff",
                        flexShrink: 0,
                        visibility: isShown ? "visible" : "hidden",
                      }}
                    >
                      {getInitials(msg.sender)}
                    </div>
                  )}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 16px",
                        height: 40,
                        borderRadius: 18,
                        boxSizing: "border-box",
                        border: isRight
                          ? `1px solid ${colors.green}44`
                          : "1px solid rgba(0, 0, 0, 0.1)",
                        backgroundColor: isRight ? `${colors.green}18` : "rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      {[0, 1, 2].map((d) => {
                        const bounceFrame = t - d * 5;
                        let bounceY = 0;
                        if (bounceFrame >= 0 && bounceFrame < 15) {
                          const s = spring({
                            frame: bounceFrame,
                            fps,
                            config: { damping: 10, stiffness: 100 },
                          });
                          bounceY = interpolate(s, [0, 0.5, 1], [0, -10, 0]);
                        }
                        return (
                          <div
                            key={d}
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              backgroundColor: "rgba(0, 0, 0, 0.4)",
                              transform: `translateY(${bounceY}px)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Message Bubble */}
                  {isShown && (
                    <div
                      style={{
                        maxWidth: 480,
                        borderRadius: 18,
                        padding: "10px 16px",
                        boxSizing: "border-box",
                        border: isRight
                          ? `1px solid ${colors.green}44`
                          : "1px solid rgba(0, 0, 0, 0.1)",
                        backgroundColor: isRight ? `${colors.green}18` : "rgba(0, 0, 0, 0.06)",
                        opacity: bubbleOpacity,
                        transform: `translateX(${bubbleTranslateX}px)`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: `${INTER}, sans-serif`,
                          fontSize: 15,
                          fontWeight: 500,
                          color: isRight ? colors.green : colors.textPrimary,
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ConversationScene;
