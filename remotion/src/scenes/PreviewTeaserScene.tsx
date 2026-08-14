import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PreviewTeaserSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { XanhSMBirdIcon } from "./shared/greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const ITEMS_START = 26;
const ITEM_STAGGER = 12;

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

export const PreviewTeaserScene: React.FC<PreviewTeaserSceneProps> = ({
  headline,
  accentWord,
  subtext,
  preview,
  channel,
  brandIcon,
  accentColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = accentColor ?? colors.cyan;

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

  const subtextOpacity = interpolate(frame, [ENTER_FRAMES, ENTER_FRAMES + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const channelStart = ITEMS_START + preview.items.length * ITEM_STAGGER + 14;
  const channelOpacity = interpolate(frame, [channelStart, channelStart + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accent} />
      {brandIcon === "xanhsm" && (
        <div style={{ position: "absolute", top: 64, right: 64, opacity: 0.28 }}>
          <XanhSMBirdIcon size={40} color={accent} />
        </div>
      )}
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 14,
          }}
        >
          {renderHeadline(headline, accentWord, accent)}
        </div>

        {subtext && (
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: colors.textDim,
              opacity: subtextOpacity,
              marginBottom: 50,
            }}
          >
            {subtext}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {preview.items.map((item, i) => {
            const start = ITEMS_START + i * ITEM_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 280, damping: 20 }, durationInFrames: 16 });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "18px 26px",
                  borderRadius: 16,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px)`,
                }}
              >
                {preview.icon && <span style={{ fontSize: 26 }}>{preview.icon}</span>}
                <span style={{ fontSize: 24, fontWeight: 600, color: colors.textPrimary }}>{item}</span>
              </div>
            );
          })}
        </div>

        {channel && (
          <div
            style={{
              marginTop: 48,
              alignSelf: "flex-start",
              fontFamily: `${JETBRAINS_MONO}, monospace`,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: accent,
              opacity: channelOpacity,
            }}
          >
            @{channel}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default PreviewTeaserScene;
