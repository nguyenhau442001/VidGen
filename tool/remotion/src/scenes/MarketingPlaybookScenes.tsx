import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AmbientBackground } from "../AmbientBackground";
import { SafeZone } from "../SafeZone";
import {
  BrandSwapTestSceneProps,
  BriefBlueprintSceneProps,
  CaptionUpgradeSceneProps,
  MarketingCaptionHookSceneProps,
  MarketingPromptDemoSceneProps,
  ReuseSystemSceneProps,
  TaskInstructionSceneProps,
} from "../types";
import { BE_VIETNAM_PRO, colors, INTER, JETBRAINS_MONO } from "../styles";

const enter = (frame: number, start: number, fps: number) =>
  spring({
    frame: frame - start,
    fps,
    config: { stiffness: 220, damping: 22 },
    durationInFrames: 22,
  });

const fadeScene = (frame: number, durationInFrames: number) =>
  interpolate(
    frame,
    [0, 8, Math.max(9, durationInFrames - 8), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

const Headline: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = colors.textPrimary,
}) => (
  <div
    style={{
      fontFamily: BE_VIETNAM_PRO,
      fontSize: 50,
      lineHeight: 1.16,
      fontWeight: 800,
      letterSpacing: "-0.035em",
      color,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = colors.cyan,
}) => (
  <div
    style={{
      fontFamily: JETBRAINS_MONO,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      color,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

export const MarketingCaptionHookScene: React.FC<MarketingCaptionHookSceneProps> = ({
  label,
  logoLabel,
  revisionLabel,
  feedbackLabel,
  feedbackText,
  caption,
  stamp,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = enter(frame, 4, fps);
  const logoIn = enter(frame, 10, fps);
  const feedbackIn = enter(frame, 10, fps);
  const eraseProgress = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stampStart = feedbackText ? 34 : 38;
  const stampIn = enter(frame, stampStart, fps);
  const shake = frame >= stampStart && frame <= stampStart + 16 ? Math.sin(frame * 2.4) * 5 : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.errorRed} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center", fontFamily: INTER }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 28 }}>
          <Eyebrow>{label}</Eyebrow>
          <div
            style={{
              position: "relative",
              padding: feedbackText ? "38px 44px 72px" : "44px 54px 78px",
              borderRadius: 30,
              background: "rgba(255,255,255,0.88)",
              border: "2px solid rgba(0,0,0,0.09)",
              boxShadow: "0 32px 90px rgba(15,23,42,0.14)",
              opacity: Math.min(card, 1),
              transform: `translateY(${interpolate(card, [0, 1], [36, 0])}px)`,
            }}
          >
            {feedbackText ? (
              <>
                {revisionLabel ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 46,
                      padding: "10px 18px",
                      marginBottom: 28,
                      borderRadius: 999,
                      backgroundColor: "rgba(15,23,42,0.06)",
                      border: "1px solid rgba(15,23,42,0.10)",
                      boxSizing: "border-box",
                      fontFamily: JETBRAINS_MONO,
                      fontSize: 17,
                      lineHeight: 1,
                      fontWeight: 700,
                      letterSpacing: "0.035em",
                      color: colors.textDim,
                      whiteSpace: "pre",
                    }}
                  >
                    {revisionLabel}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: BE_VIETNAM_PRO,
                    fontSize: 34,
                    lineHeight: 1.36,
                    fontWeight: 650,
                    color: colors.textPrimary,
                    textAlign: "left",
                  }}
                >
                  “{caption}”
                </div>
                <div
                  style={{
                    marginTop: 30,
                    padding: "20px 22px",
                    borderRadius: 18,
                    backgroundColor: "#fff1f2",
                    border: "2px solid rgba(225,29,72,0.30)",
                    borderLeft: `7px solid ${colors.errorRed}`,
                    boxSizing: "border-box",
                    opacity: Math.min(feedbackIn, 1),
                    transform: `translateY(${interpolate(feedbackIn, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      fontFamily: JETBRAINS_MONO,
                      fontSize: 17,
                      lineHeight: 1,
                      fontWeight: 800,
                      letterSpacing: "0.07em",
                      color: colors.errorRed,
                    }}
                  >
                    {feedbackLabel ?? "FEEDBACK"}
                  </div>
                  <div
                    style={{
                      fontFamily: BE_VIETNAM_PRO,
                      fontSize: 30,
                      lineHeight: 1.25,
                      fontWeight: 800,
                      color: colors.textPrimary,
                    }}
                  >
                    “{feedbackText}”
                  </div>
                </div>
              </>
            ) : logoLabel ? (
              <div
                style={{
                  position: "relative",
                  width: 190,
                  minHeight: 66,
                  margin: "0 auto 30px",
                  padding: "15px 24px",
                  borderRadius: 18,
                  border: `3px dashed ${colors.errorRed}`,
                  backgroundColor: "#fff7f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  opacity: Math.min(logoIn, 1),
                  transform: `scale(${interpolate(logoIn, [0, 1], [0.84, 1])})`,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily: JETBRAINS_MONO,
                    fontSize: 25,
                    lineHeight: 1,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: colors.textPrimary,
                    opacity: interpolate(eraseProgress, [0, 1], [1, 0.32]),
                  }}
                >
                  {logoLabel}
                </span>
                <div
                  style={{
                    position: "absolute",
                    left: 18,
                    top: "50%",
                    width: 154 * eraseProgress,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: colors.errorRed,
                    boxShadow: "0 0 0 2px rgba(255,255,255,0.8)",
                    transform: "translateY(-50%) rotate(-13deg)",
                    transformOrigin: "left center",
                  }}
                />
              </div>
            ) : null}
            {!feedbackText ? (
              <div
                style={{
                  fontFamily: BE_VIETNAM_PRO,
                  fontSize: 40,
                  lineHeight: 1.42,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  textAlign: "center",
                }}
              >
                “{caption}”
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 34,
                right: 34,
                bottom: -44,
                minHeight: 88,
                padding: "18px 28px",
                borderRadius: 18,
                backgroundColor: "#fff1f2",
                border: `3px solid ${colors.errorRed}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                opacity: Math.min(stampIn, 1),
                transform: `translateX(${shake}px) rotate(-2deg) scale(${interpolate(stampIn, [0, 1], [1.35, 1])})`,
              }}
            >
              <span
                style={{
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 24,
                  lineHeight: 1.2,
                  fontWeight: 700,
                  letterSpacing: "0.035em",
                  color: colors.errorRed,
                  textAlign: "center",
                }}
              >
                {stamp}
              </span>
            </div>
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export const MarketingPromptDemoScene: React.FC<MarketingPromptDemoSceneProps> = ({
  headline,
  promptLabel = "PROMPT",
  prompt,
  responseLabel = "AI OUTPUT",
  response,
  highlightedInputs = [],
  flaggedPhrases,
  verdict,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const promptIn = enter(frame, 8, fps);
  const responseIn = enter(frame, 30, fps);
  const verdictIn = enter(frame, 74, fps);

  const highlightResponse = () => {
    let parts: React.ReactNode[] = [response];
    flaggedPhrases.forEach((phrase) => {
      parts = parts.flatMap((part, outerIndex) => {
        if (typeof part !== "string") return [part];
        return part.split(phrase).flatMap((piece, i, array) => {
          const nodes: React.ReactNode[] = [piece];
          if (i < array.length - 1) {
            nodes.push(
              <span
                key={`${outerIndex}-${phrase}-${i}`}
                style={{
                  color: colors.errorRed,
                  textDecoration: "line-through",
                  textDecorationThickness: 3,
                }}
              >
                {phrase}
              </span>
            );
          }
          return nodes;
        });
      });
    });
    return parts;
  };

  const highlightPrompt = () => {
    let parts: React.ReactNode[] = [prompt];
    highlightedInputs.forEach((phrase) => {
      parts = parts.flatMap((part, outerIndex) => {
        if (typeof part !== "string") return [part];
        return part.split(phrase).flatMap((piece, i, array) => {
          const nodes: React.ReactNode[] = [piece];
          if (i < array.length - 1) {
            nodes.push(
              <span
                key={`${outerIndex}-${phrase}-${i}`}
                style={{
                  color: colors.cyan,
                  fontWeight: 800,
                  backgroundColor: `${colors.cyan}12`,
                  borderRadius: 6,
                  padding: "1px 4px",
                }}
              >
                {phrase}
              </span>
            );
          }
          return nodes;
        });
      });
    });
    return parts;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        <div style={{ marginBottom: 50 }}>
          <Headline>{headline}</Headline>
        </div>
        <div
          style={{
            padding: "24px",
            borderRadius: 30,
            background: "linear-gradient(155deg, rgba(255,255,255,0.98), rgba(241,245,249,0.94))",
            border: "1.5px solid rgba(15,23,42,0.12)",
            boxShadow: "0 28px 90px rgba(15,23,42,0.13)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              minHeight: 50,
              padding: "0 8px 14px",
              borderBottom: "1px solid rgba(15,23,42,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {["#fb7185", "#fbbf24", "#4ade80"].map((color) => (
                <div key={color} style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: color }} />
              ))}
            </div>
            <div
              style={{
                fontFamily: JETBRAINS_MONO,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: colors.textDim,
              }}
            >
              AI COPY WORKSPACE
            </div>
          </div>
          <div
            style={{
              alignSelf: "flex-end",
              width: "88%",
              padding: "20px 24px 24px",
              borderRadius: "24px 24px 6px 24px",
              backgroundColor: `${colors.cyan}18`,
              border: `1px solid ${colors.cyan}55`,
              opacity: Math.min(promptIn, 1),
              transform: `translateX(${interpolate(promptIn, [0, 1], [32, 0])}px)`,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                marginBottom: 10,
                fontFamily: JETBRAINS_MONO,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: colors.cyan,
              }}
            >
              {promptLabel}
            </div>
            <div
              style={{
                fontSize: 27,
                lineHeight: 1.42,
                fontWeight: 650,
                color: colors.textPrimary,
                whiteSpace: "pre-line",
              }}
            >
              {highlightPrompt()}
            </div>
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              width: "94%",
              padding: "22px 26px 28px",
              borderRadius: "24px 24px 24px 6px",
              backgroundColor: "rgba(0,0,0,0.045)",
              border: "1px solid rgba(0,0,0,0.1)",
              opacity: Math.min(responseIn, 1),
              transform: `translateX(${interpolate(responseIn, [0, 1], [-32, 0])}px)`,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                marginBottom: 10,
                fontFamily: JETBRAINS_MONO,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: colors.textDim,
              }}
            >
              {responseLabel}
            </div>
            <div style={{ fontSize: 29, lineHeight: 1.45, fontWeight: 650, color: colors.textPrimary }}>
              “{highlightResponse()}”
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              padding: "18px 24px",
              borderRadius: 16,
              backgroundColor: "#fff1f2",
              border: `2px solid ${colors.errorRed}`,
              opacity: Math.min(verdictIn, 1),
              transform: `scale(${interpolate(verdictIn, [0, 1], [0.92, 1])})`,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontFamily: JETBRAINS_MONO,
                fontSize: 21,
                fontWeight: 700,
                color: colors.errorRed,
                textAlign: "center",
              }}
            >
              {verdict}
            </div>
          </div>
          {footer ? (
            <div
              style={{
                padding: "4px 10px 2px",
                fontFamily: JETBRAINS_MONO,
                fontSize: 15,
                lineHeight: 1.35,
                fontWeight: 700,
                color: colors.textDim,
                textAlign: "center",
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export const BriefBlueprintScene: React.FC<BriefBlueprintSceneProps> = ({
  eyebrow,
  headline,
  campaignLabel,
  fields,
  avoidLabel,
  avoid = [],
  footer,
  layout = "stack",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lastFieldStart = Math.max(
    15,
    ...fields.map((field, i) => field.appearFrame ?? 15 + i * 14)
  );
  const avoidIn = enter(frame, lastFieldStart + 18, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        {eyebrow ? (
          <div style={{ marginBottom: 16 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <div style={{ marginBottom: campaignLabel ? 20 : 38 }}>
          <Headline>
            {headline.split(" ").map((word, i) => (
              <span key={word + i} style={{ color: i === 0 ? colors.cyan : colors.textPrimary }}>
                {word}{i < headline.split(" ").length - 1 ? " " : ""}
              </span>
            ))}
          </Headline>
        </div>
        {campaignLabel ? (
          <div
            style={{
              alignSelf: "center",
              marginBottom: 22,
              minHeight: 48,
              padding: "11px 18px",
              borderRadius: 999,
              border: `1px solid ${colors.cyan}55`,
              backgroundColor: `${colors.cyan}0f`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              fontFamily: JETBRAINS_MONO,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.055em",
              color: colors.cyan,
            }}
          >
            {campaignLabel}
          </div>
        ) : null}
        <div
          style={{
            display: layout === "grid" ? "grid" : "flex",
            gridTemplateColumns: layout === "grid" ? "repeat(2, minmax(0, 1fr))" : undefined,
            flexDirection: layout === "grid" ? undefined : "column",
            gap: layout === "grid" ? 18 : 16,
          }}
        >
          {fields.map((field, i) => {
            const s = enter(frame, field.appearFrame ?? 15 + i * 14, fps);
            const fieldAccent = i === fields.length - 1 ? colors.green : colors.cyan;
            return (
              <div
                key={field.label}
                style={{
                  minHeight: layout === "grid" ? 244 : field.value ? 142 : 108,
                  padding: layout === "grid" ? "26px 24px" : "20px 26px",
                  borderRadius: 24,
                  background: `linear-gradient(150deg, rgba(255,255,255,0.98), ${fieldAccent}0c)`,
                  border: `1.5px solid ${fieldAccent}55`,
                  boxShadow: "0 16px 46px rgba(15,23,42,0.09)",
                  display: layout === "grid" ? "flex" : "grid",
                  flexDirection: layout === "grid" ? "column" : undefined,
                  gridTemplateColumns: layout === "grid" ? undefined : "58px 176px 1fr",
                  gap: layout === "grid" ? 18 : 16,
                  alignItems: "center",
                  justifyContent: layout === "grid" ? "center" : undefined,
                  boxSizing: "border-box",
                  opacity: Math.min(s, 1),
                  transform:
                    layout === "grid"
                      ? `translateY(${interpolate(s, [0, 1], [28, 0])}px)`
                      : `translateX(${interpolate(s, [0, 1], [-34, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: layout === "grid" ? 62 : "auto",
                    height: layout === "grid" ? 62 : "auto",
                    borderRadius: layout === "grid" ? 20 : 0,
                    backgroundColor: layout === "grid" ? `${fieldAccent}14` : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: layout === "grid" ? 34 : 36,
                    textAlign: "center",
                  }}
                >
                  {field.icon}
                </div>
                <div
                  style={{
                    fontFamily: JETBRAINS_MONO,
                    fontSize: layout === "grid" ? 17 : 18,
                    lineHeight: 1.2,
                    fontWeight: 700,
                    letterSpacing: "0.045em",
                    color: fieldAccent,
                    textTransform: "uppercase",
                    textAlign: layout === "grid" ? "center" : "left",
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    fontSize: layout === "grid" ? 25 : field.value ? 24 : 27,
                    lineHeight: layout === "grid" ? 1.28 : 1.34,
                    fontWeight: field.value ? 650 : 700,
                    color: field.value ? colors.textPrimary : colors.textDim,
                    whiteSpace: "pre-line",
                    textAlign: layout === "grid" ? "center" : "left",
                  }}
                >
                  {field.value || "Chờ điền..."}
                </div>
              </div>
            );
          })}
        </div>
        {avoid.length > 0 ? (
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
              opacity: Math.min(avoidIn, 1),
              transform: `translateY(${interpolate(avoidIn, [0, 1], [14, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: JETBRAINS_MONO,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: colors.errorRed,
              }}
            >
              {avoidLabel ?? "TRÁNH"}
            </div>
            {avoid.map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 42,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: `1px solid ${colors.errorRed}44`,
                  backgroundColor: "#fff1f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.errorRed,
                }}
              >
                × {item}
              </div>
            ))}
          </div>
        ) : null}
        {footer && (
          <div
            style={{
              marginTop: avoid.length > 0 ? 14 : 28,
              fontFamily: JETBRAINS_MONO,
              fontSize: avoid.length > 0 ? 14 : 17,
              lineHeight: 1.3,
              color: colors.textDim,
              textAlign: "center",
            }}
          >
            {footer}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export const TaskInstructionScene: React.FC<TaskInstructionSceneProps> = ({
  headline,
  lockedLabel,
  lockedFields = [],
  taskLabel = "NHIỆM VỤ",
  task,
  constraints,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lockIn = enter(frame, 12, fps);
  const taskIn = enter(frame, 34, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.green} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        <div style={{ marginBottom: 42 }}>
          <Headline>{headline}</Headline>
        </div>
        <div
          style={{
            padding: "24px 26px",
            borderRadius: 24,
            border: `2px solid ${colors.green}66`,
            background: `linear-gradient(120deg, ${colors.green}10, rgba(255,255,255,0.94))`,
            opacity: Math.min(lockIn, 1),
            transform: `translateY(${interpolate(lockIn, [0, 1], [20, 0])}px)`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary }}>{lockedLabel}</span>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: `${colors.green}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🔒
            </span>
          </div>
          {lockedFields.length > 0 ? (
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {lockedFields.map((field) => (
                <div
                  key={field}
                  style={{
                    minHeight: 64,
                    padding: "10px 8px",
                    borderRadius: 15,
                    border: `1px solid ${colors.green}40`,
                    backgroundColor: "rgba(255,255,255,0.72)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    fontSize: 15,
                    lineHeight: 1.2,
                    fontWeight: 750,
                    color: colors.green,
                    textAlign: "center",
                  }}
                >
                  ✓ {field}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 24,
            padding: "28px 30px 32px",
            borderRadius: 28,
            border: `2px solid ${colors.cyan}`,
            background: "linear-gradient(155deg, rgba(255,255,255,0.98), rgba(224,242,254,0.82))",
            boxShadow: `0 24px 72px ${colors.cyan}2a`,
            opacity: Math.min(taskIn, 1),
            transform: `translateY(${interpolate(taskIn, [0, 1], [28, 0])}px)`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                backgroundColor: colors.cyan,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              +
            </div>
            <Eyebrow color={colors.cyan}>{taskLabel}</Eyebrow>
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: BE_VIETNAM_PRO,
              fontSize: 34,
              lineHeight: 1.34,
              fontWeight: 800,
              color: colors.textPrimary,
              textAlign: "center",
            }}
          >
            {task}
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {constraints.map((constraint, i) => {
              const s = enter(frame, 58 + i * 10, fps);
              return (
                <div
                  key={constraint}
                  style={{
                    minHeight: 54,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(2,132,199,0.28)",
                    backgroundColor: "rgba(2,132,199,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    fontFamily: JETBRAINS_MONO,
                    fontSize: 17,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: colors.cyan,
                    opacity: Math.min(s, 1),
                    transform: `scale(${interpolate(s, [0, 1], [0.82, 1])})`,
                  }}
                >
                  {constraint}
                </div>
              );
            })}
          </div>
        </div>
        {footer ? (
          <div
            style={{
              marginTop: 24,
              fontFamily: JETBRAINS_MONO,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: colors.textDim,
              textAlign: "center",
            }}
          >
            {footer}
          </div>
        ) : null}
      </SafeZone>
    </AbsoluteFill>
  );
};

export const CaptionUpgradeScene: React.FC<CaptionUpgradeSceneProps> = ({
  eyebrow,
  headline,
  beforeLabel = "TRƯỚC",
  before,
  afterLabel = "SAU",
  after,
  accentPhrases,
  proofPoints = [],
  verdict,
  approvalLabel,
  approvalText,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beforeIn = enter(frame, 5, fps);
  const afterIn = enter(frame, 38, fps);
  const proofIn = enter(frame, 150, fps);
  const verdictIn = enter(frame, 245, fps);
  const approvalIn = enter(frame, 286, fps);

  const renderAfter = () => {
    let parts: React.ReactNode[] = [after];
    accentPhrases.forEach((phrase) => {
      parts = parts.flatMap((part, outerIndex) => {
        if (typeof part !== "string") return [part];
        return part.split(phrase).flatMap((piece, i, array) => {
          const nodes: React.ReactNode[] = [piece];
          if (i < array.length - 1) {
            nodes.push(
              <span key={`${outerIndex}-${phrase}-${i}`} style={{ color: colors.green }}>
                {phrase}
              </span>
            );
          }
          return nodes;
        });
      });
    });
    return parts;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.green} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        {eyebrow ? (
          <div style={{ marginBottom: 14 }}>
            <Eyebrow color={colors.green}>{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <div style={{ marginBottom: 34 }}>
          <Headline>{headline}</Headline>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              padding: "24px 28px",
              borderRadius: 18,
              border: `1.5px solid ${colors.errorRed}55`,
              backgroundColor: "#fff1f2",
              opacity: Math.min(beforeIn, 1),
              transform: `translateX(${interpolate(beforeIn, [0, 1], [-30, 0])}px)`,
              boxSizing: "border-box",
            }}
          >
            <Eyebrow color={colors.errorRed}>{beforeLabel}</Eyebrow>
            <div
              style={{
                marginTop: 14,
                fontSize: 25,
                lineHeight: 1.4,
                fontWeight: 600,
                color: colors.textDim,
                textAlign: "center",
                textDecoration: "line-through",
              }}
            >
              “{before}”
            </div>
          </div>
          <div
            style={{
              padding: "38px 34px",
              borderRadius: 24,
              border: `2px solid ${colors.green}77`,
              backgroundColor: "rgba(240,253,244,0.94)",
              boxShadow: `0 22px 70px ${colors.green}22`,
              opacity: Math.min(afterIn, 1),
              transform: `translateX(${interpolate(afterIn, [0, 1], [34, 0])}px)`,
              boxSizing: "border-box",
            }}
          >
            <Eyebrow color={colors.green}>{afterLabel}</Eyebrow>
            <div
              style={{
                marginTop: 18,
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 35,
                lineHeight: 1.42,
                fontWeight: 800,
                color: colors.textPrimary,
                textAlign: "center",
              }}
            >
              “{renderAfter()}”
            </div>
          </div>
        </div>
        {proofPoints.length > 0 ? (
          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: `repeat(${proofPoints.length}, minmax(0, 1fr))`,
              gap: 10,
              opacity: Math.min(proofIn, 1),
              transform: `translateY(${interpolate(proofIn, [0, 1], [18, 0])}px)`,
            }}
          >
            {proofPoints.map((point) => (
              <div
                key={point.label}
                style={{
                  minHeight: 108,
                  padding: "16px 12px",
                  borderRadius: 18,
                  border: `1px solid ${colors.green}44`,
                  backgroundColor: "rgba(255,255,255,0.86)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: JETBRAINS_MONO,
                    fontSize: 12,
                    lineHeight: 1.15,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    color: colors.green,
                  }}
                >
                  {point.label}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 16,
                    lineHeight: 1.25,
                    fontWeight: 750,
                    color: colors.textPrimary,
                  }}
                >
                  {point.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {approvalText ? (
          <div
            style={{
              marginTop: 18,
              minHeight: 82,
              padding: "16px 20px 16px 76px",
              borderRadius: 20,
              border: `1.5px solid ${colors.green}66`,
              background: "linear-gradient(110deg, rgba(240,253,244,0.98), rgba(255,255,255,0.96))",
              boxShadow: `0 18px 54px ${colors.green}18`,
              position: "relative",
              boxSizing: "border-box",
              opacity: Math.min(approvalIn, 1),
              transform: `translateY(${interpolate(approvalIn, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 18,
                top: 17,
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: colors.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 17,
                fontWeight: 900,
                color: "white",
              }}
            >
              L
            </div>
            {approvalLabel ? (
              <div
                style={{
                  marginBottom: 6,
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 13,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  color: colors.green,
                }}
              >
                {approvalLabel}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 24,
                lineHeight: 1.25,
                fontWeight: 850,
                color: colors.textPrimary,
              }}
            >
              “{approvalText}”
            </div>
          </div>
        ) : null}
        {verdict ? (
          <div
            style={{
              marginTop: 18,
              minHeight: 58,
              padding: "13px 18px",
              borderRadius: 999,
              border: `1.5px solid ${colors.green}66`,
              background: `linear-gradient(90deg, ${colors.green}10, ${colors.green}22)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              fontFamily: JETBRAINS_MONO,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: colors.green,
              opacity: Math.min(verdictIn, 1),
              transform: `scale(${interpolate(verdictIn, [0, 1], [0.92, 1])})`,
            }}
          >
            ✓ {verdict}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 18,
            fontFamily: JETBRAINS_MONO,
            fontSize: 14,
            color: colors.textDim,
            textAlign: "center",
          }}
        >
          {footer}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export const ReuseSystemScene: React.FC<ReuseSystemSceneProps> = ({
  eyebrow,
  headline,
  core,
  tasks,
  promptTemplate,
  testCard,
  closingLine,
  closingAccent,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const coreIn = enter(frame, 12, fps);
  const graphOpacity = promptTemplate
    ? interpolate(frame, [82, 108], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : testCard
      ? interpolate(frame, [148, 182], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      : 1;
  const promptIn = enter(frame, 100, fps);
  const promptOpacity = promptTemplate
    ? interpolate(frame, [100, 118, 215, 238], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const testIn = enter(frame, promptTemplate ? 228 : 168, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        {eyebrow ? (
          <div style={{ marginBottom: 14 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <Headline>{headline}</Headline>
        <div style={{ position: "relative", height: 720, marginTop: 20 }}>
          <div style={{ position: "absolute", inset: 0, opacity: graphOpacity }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 230,
              width: 300,
              minHeight: 170,
              padding: "30px 24px",
              borderRadius: 26,
              backgroundColor: "#eff6ff",
              border: `3px solid ${colors.cyan}`,
              boxShadow: `0 20px 70px ${colors.cyan}24`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              transform: `translateX(-50%) scale(${interpolate(coreIn, [0, 1], [0.75, 1])})`,
              opacity: Math.min(coreIn, 1),
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 31,
                lineHeight: 1.2,
                fontWeight: 800,
                color: colors.cyan,
                textAlign: "center",
              }}
            >
              🔒 {core}
            </div>
          </div>
          {tasks.map((task, i) => {
            const positions = [
              { left: 0, top: 40 },
              { right: 0, top: 40 },
              { left: 0, bottom: 32 },
              { right: 0, bottom: 32 },
            ];
            const pos = positions[i] ?? positions[positions.length - 1];
            const s = enter(frame, 34 + i * 14, fps);
            return (
              <React.Fragment key={task.label}>
                <div
                  style={{
                    position: "absolute",
                    ...pos,
                    width: 255,
                    minHeight: 122,
                    padding: "20px 18px",
                    borderRadius: 20,
                    border: `1.5px solid ${colors.green}66`,
                    backgroundColor: "rgba(240,253,244,0.92)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxSizing: "border-box",
                    opacity: Math.min(s, 1),
                    transform: `scale(${interpolate(s, [0, 1], [0.84, 1])})`,
                  }}
                >
                  <div style={{ fontSize: 30 }}>{task.icon}</div>
                  <div
                    style={{
                      fontSize: 21,
                      lineHeight: 1.25,
                      fontWeight: 700,
                      color: colors.textPrimary,
                      textAlign: "center",
                    }}
                  >
                    {task.label}
                  </div>
                  {task.detail ? (
                    <div
                      style={{
                        fontFamily: JETBRAINS_MONO,
                        fontSize: 13,
                        lineHeight: 1.2,
                        fontWeight: 800,
                        letterSpacing: "0.035em",
                        color: colors.green,
                        textAlign: "center",
                      }}
                    >
                      {task.detail}
                    </div>
                  ) : null}
                </div>
              </React.Fragment>
            );
          })}
          <svg
            viewBox="0 0 760 660"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
          >
            {[
              [310, 275, 205, 120],
              [450, 275, 555, 120],
              [310, 355, 205, 565],
              [450, 355, 555, 565],
            ].slice(0, tasks.length).map(([x1, y1, x2, y2], i) => {
              const progress = interpolate(frame, [28 + i * 14, 48 + i * 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x1 + (x2 - x1) * progress}
                  y2={y1 + (y2 - y1) * progress}
                  stroke={colors.cyan}
                  strokeWidth={3}
                  strokeDasharray="8 8"
                  opacity={0.42}
                />
              );
            })}
          </svg>
          </div>
          {promptTemplate ? (
            <div
              style={{
                position: "absolute",
                inset: "18px 0 0",
                opacity: promptOpacity,
                transform: `translateY(${interpolate(promptIn, [0, 1], [28, 0])}px)`,
              }}
            >
              <div
                style={{
                  padding: "24px 26px 26px",
                  borderRadius: 28,
                  border: `2px solid ${colors.cyan}55`,
                  background: "linear-gradient(145deg, rgba(255,255,255,0.99), #eff6ff)",
                  boxShadow: "0 28px 90px rgba(14,165,233,0.13)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 18,
                  }}
                >
                  <Eyebrow color={colors.cyan}>{promptTemplate.label}</Eyebrow>
                  <div
                    style={{
                      minHeight: 38,
                      padding: "8px 14px",
                      borderRadius: 999,
                      backgroundColor: colors.green,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      fontFamily: JETBRAINS_MONO,
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: "0.05em",
                      color: "white",
                      whiteSpace: "pre",
                    }}
                  >
                    COPY → ĐIỀN
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: BE_VIETNAM_PRO,
                    fontSize: 30,
                    lineHeight: 1.2,
                    fontWeight: 900,
                    color: colors.textPrimary,
                    textAlign: "left",
                    whiteSpace: "pre",
                  }}
                >
                  {promptTemplate.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
                  {promptTemplate.rows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      style={{
                        minHeight: 61,
                        padding: "11px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(14,165,233,0.20)",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        display: "grid",
                        gridTemplateColumns: "210px 1fr",
                        alignItems: "center",
                        columnGap: 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: BE_VIETNAM_PRO,
                          fontSize: 16,
                          lineHeight: 1.16,
                          fontWeight: 850,
                          color: colors.textPrimary,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {row.label}:
                      </div>
                      <div
                        style={{
                          fontFamily: JETBRAINS_MONO,
                          fontSize: 13,
                          lineHeight: 1.2,
                          fontWeight: 700,
                          color: colors.cyan,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {row.placeholder}
                      </div>
                    </div>
                  ))}
                </div>
                {promptTemplate.helper ? (
                  <div
                    style={{
                      marginTop: 14,
                      fontFamily: BE_VIETNAM_PRO,
                      fontSize: 16,
                      lineHeight: 1.25,
                      fontWeight: 750,
                      color: colors.green,
                      textAlign: "center",
                      whiteSpace: "pre",
                    }}
                  >
                    {promptTemplate.helper}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {testCard ? (
            <div
              style={{
                position: "absolute",
                inset: "52px 0 0",
                opacity: Math.min(testIn, 1),
                transform: `translateY(${interpolate(testIn, [0, 1], [36, 0])}px)`,
              }}
            >
              <div
                style={{
                  padding: "28px 30px 32px",
                  borderRadius: 30,
                  border: `2px solid ${colors.errorRed}55`,
                  background: "linear-gradient(145deg, rgba(255,255,255,0.98), #fff1f2)",
                  boxShadow: "0 28px 90px rgba(220,38,38,0.14)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 18,
                  }}
                >
                  <Eyebrow color={colors.errorRed}>{testCard.label}</Eyebrow>
                  <div
                    style={{
                      minHeight: 40,
                      padding: "8px 13px",
                      borderRadius: 999,
                      backgroundColor: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      fontFamily: JETBRAINS_MONO,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "white",
                    }}
                  >
                    5 GIÂY
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 28,
                    padding: "28px 24px",
                    borderRadius: 22,
                    backgroundColor: "white",
                    border: "1px solid rgba(15,23,42,0.10)",
                    fontFamily: BE_VIETNAM_PRO,
                    fontSize: 38,
                    lineHeight: 1.2,
                    fontWeight: 900,
                    color: colors.textPrimary,
                    textAlign: "center",
                  }}
                >
                  {testCard.headline}
                </div>
                <div
                  style={{
                    marginTop: 18,
                    fontSize: 27,
                    lineHeight: 1.3,
                    fontWeight: 750,
                    color: colors.errorRed,
                    textAlign: "center",
                  }}
                >
                  {testCard.question}
                </div>
                <div
                  style={{
                    margin: "24px auto 0",
                    width: "78%",
                    minHeight: 72,
                    padding: "16px 22px",
                    borderRadius: 18,
                    backgroundColor: colors.errorRed,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    fontFamily: JETBRAINS_MONO,
                    fontSize: 21,
                    lineHeight: 1.2,
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    color: "white",
                    textAlign: "center",
                    transform: "rotate(-1.5deg)",
                  }}
                >
                  {testCard.failText}
                </div>
              </div>
              {(closingLine || closingAccent) ? (
                <div
                  style={{
                    marginTop: 24,
                    fontFamily: BE_VIETNAM_PRO,
                    textAlign: "center",
                  }}
                >
                  {closingLine ? (
                    <div style={{ fontSize: 22, fontWeight: 700, color: colors.textDim }}>{closingLine}</div>
                  ) : null}
                  {closingAccent ? (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 24,
                        lineHeight: 1.28,
                        fontWeight: 900,
                        color: colors.green,
                      }}
                    >
                      {closingAccent}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          style={{
            padding: "16px 22px",
            borderRadius: 999,
            backgroundColor: `${colors.green}12`,
            border: `1px solid ${colors.green}44`,
            fontFamily: JETBRAINS_MONO,
            fontSize: 18,
            fontWeight: 700,
            color: colors.green,
            textAlign: "center",
          }}
        >
          {footer}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export const BrandSwapTestScene: React.FC<BrandSwapTestSceneProps> = ({
  label,
  headline,
  caption,
  question,
  fixes = [],
  brands = [],
  swapIntervalFrames = 32,
  feedbackLabel,
  feedbackText,
  feedbackAppearFrame = 58,
  partLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = enter(frame, 8, fps);
  const brandIndex =
    brands.length > 0 ? Math.floor(Math.max(0, frame - 8) / swapIntervalFrames) % brands.length : 0;
  const activeBrand = brands[brandIndex];
  const brandPhase = Math.max(0, frame - 8) % swapIntervalFrames;
  const brandOpacity = interpolate(
    brandPhase,
    [0, 5, Math.max(6, swapIntervalFrames - 5), swapIntervalFrames - 1],
    [0.25, 1, 1, 0.25],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const erased = interpolate(frame, [38, 55], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const questionIn = enter(frame, feedbackAppearFrame, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: fadeScene(frame, durationInFrames) }}>
      <AmbientBackground accent={colors.errorRed} />
      <SafeZone style={{ justifyContent: "center", fontFamily: INTER }}>
        {(label || partLabel) && (
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <Eyebrow color={colors.errorRed}>{label}</Eyebrow>
            {partLabel ? (
              <div
                style={{
                  minHeight: 42,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: `1px solid ${colors.green}77`,
                  backgroundColor: `${colors.green}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.green,
                  whiteSpace: "pre",
                }}
              >
                {partLabel}
              </div>
            ) : null}
          </div>
        )}
        <Headline>{headline}</Headline>
        <div
          style={{
            marginTop: 40,
            padding: "26px 30px 34px",
            borderRadius: 30,
            background: "linear-gradient(150deg, rgba(255,255,255,0.98), rgba(241,245,249,0.98))",
            border: "1.5px solid rgba(15,23,42,0.13)",
            boxShadow: "0 28px 90px rgba(15,23,42,0.16)",
            opacity: Math.min(cardIn, 1),
            transform: `translateY(${interpolate(cardIn, [0, 1], [28, 0])}px)`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {["#fb7185", "#fbbf24", "#4ade80"].map((color) => (
                <div key={color} style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: color }} />
              ))}
              <div
                style={{
                  marginLeft: 8,
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: colors.textDim,
                }}
              >
                SOCIAL COPY · REVISION #4
              </div>
            </div>
            {brands.length > 0 ? (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: "#0f172a",
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                SWAP {String(brandIndex + 1).padStart(2, "0")}/{String(brands.length).padStart(2, "0")}
              </div>
            ) : null}
          </div>
          {activeBrand ? (
            <div
              style={{
                minHeight: 96,
                marginBottom: 22,
                padding: "16px 20px",
                borderRadius: 20,
                background: "linear-gradient(120deg, #0f172a, #1e293b)",
                display: "grid",
                gridTemplateColumns: "58px 1fr auto",
                alignItems: "center",
                gap: 16,
                boxSizing: "border-box",
                opacity: brandOpacity,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: `linear-gradient(145deg, ${colors.cyan}, ${colors.green})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: BE_VIETNAM_PRO,
                  fontSize: 25,
                  fontWeight: 900,
                  color: "white",
                }}
              >
                {activeBrand.name.slice(0, 1)}
              </div>
              <div
                style={{
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 20,
                  lineHeight: 1.15,
                  fontWeight: 800,
                  letterSpacing: "0.035em",
                  color: "white",
                  textAlign: "left",
                  whiteSpace: "pre",
                }}
              >
                {activeBrand.name}
                {activeBrand.category ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      lineHeight: 1,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.58)",
                    }}
                  >
                    {activeBrand.category}
                  </div>
                ) : null}
              </div>
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>•••</div>
            </div>
          ) : (
            <div
              style={{
                width: 144,
                height: 52,
                margin: "0 auto 24px",
                borderRadius: 12,
                backgroundColor: colors.cyan,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: JETBRAINS_MONO,
                fontSize: 17,
                fontWeight: 700,
                color: "white",
                opacity: erased,
                textDecoration: frame > 38 ? "line-through" : "none",
              }}
            >
              LOGO
            </div>
          )}
          <div
            style={{
              padding: "30px 28px",
              borderRadius: 20,
              backgroundColor: "white",
              border: "1px solid rgba(15,23,42,0.08)",
              fontSize: 31,
              lineHeight: 1.38,
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: "left",
            }}
          >
            “{caption}”
          </div>
        </div>
        {(feedbackText || question) && (
          <div
            style={{
              marginTop: 22,
              padding: feedbackText ? "20px 24px 20px 84px" : 0,
              borderRadius: feedbackText ? 22 : 0,
              border: feedbackText ? `2px solid ${colors.errorRed}55` : "none",
              background: feedbackText
                ? "linear-gradient(110deg, #fff1f2, rgba(255,255,255,0.96))"
                : "transparent",
              boxSizing: "border-box",
              position: "relative",
              opacity: Math.min(questionIn, 1),
              transform: `translateY(${interpolate(questionIn, [0, 1], [18, 0])}px)`,
            }}
          >
            {feedbackText ? (
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  top: 22,
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  backgroundColor: colors.errorRed,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: BE_VIETNAM_PRO,
                  fontSize: 17,
                  fontWeight: 900,
                  color: "white",
                }}
              >
                L
              </div>
            ) : null}
            {feedbackLabel ? (
              <div
                style={{
                  marginBottom: 9,
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 16,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  color: colors.errorRed,
                }}
              >
                {feedbackLabel}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 30,
                lineHeight: 1.25,
                fontWeight: 800,
                color: colors.errorRed,
                textAlign: feedbackText ? "left" : "center",
              }}
            >
              “{feedbackText ?? question}”
            </div>
          </div>
        )}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {fixes.map((fix, i) => {
            const s = enter(frame, 78 + i * 10, fps);
            return (
              <div
                key={fix}
                style={{
                  minHeight: 58,
                  padding: "14px 18px",
                  borderRadius: 999,
                  backgroundColor: `${colors.cyan}10`,
                  border: `1px solid ${colors.cyan}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.cyan,
                  opacity: Math.min(s, 1),
                }}
              >
                + {fix}
              </div>
            );
          })}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
