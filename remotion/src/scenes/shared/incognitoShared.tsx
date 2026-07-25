import React from "react";
import { colors, INTER, BE_VIETNAM_PRO } from "../../styles";

// Shared browser-chrome shell for the incognito_myth video's bespoke shot
// set (NightTypingHookShot, HistoryGapShot, SplitSyncActionShot,
// LoginBindShot). Incognito windows really are dark-chrome in Chrome, so
// `incognito` flips the card to a dark glass panel — the one place this
// video's chrome goes dark against the channel's light-theme background,
// same convention as terminal/phone chrome staying dark elsewhere.
export const BrowserChrome: React.FC<{
  width?: number;
  urlLabel?: string;
  accentColor?: string;
  incognito?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ width = 860, urlLabel = "", accentColor = colors.green, incognito = false, style, children }) => (
  <div
    style={{
      width,
      borderRadius: 22,
      overflow: "hidden",
      border: `1px solid ${incognito ? `${accentColor}55` : "rgba(0,0,0,0.12)"}`,
      boxShadow: "0 28px 70px rgba(0,0,0,0.16)",
      ...style,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "16px 20px",
        borderBottom: `1px solid ${incognito ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
        background: incognito ? "rgba(24,22,34,0.96)" : "rgba(255,255,255,0.86)",
      }}
    >
      <div style={{ display: "flex", gap: 7 }}>
        <span style={dotStyle("#ff5f57")} />
        <span style={dotStyle("#febc2e")} />
        <span style={dotStyle("#28c840")} />
      </div>
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          padding: "8px 16px",
          borderRadius: 9,
          background: incognito ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          color: incognito ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.55)",
          fontSize: 17,
          fontFamily: INTER,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {incognito ? "\u{1F576} " : "\u{1F512} "}
        {urlLabel}
      </div>
    </div>
    <div
      style={{
        padding: 26,
        background: incognito ? "rgba(17,16,26,0.97)" : "#ffffff",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  </div>
);

const dotStyle = (bg: string): React.CSSProperties => ({
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: bg,
  display: "inline-block",
});

// Splits `headline` around the first exact-substring match of `accentWord`
// and wraps the match in `accentColor` — the same accent pattern used across
// IconThreatScene/GenericHookThumbnailScene, factored out once for this
// video's shot set instead of repeated per component.
export const renderAccent = (
  headline: string,
  accentWord: string | undefined,
  accentColor: string
): React.ReactNode => {
  if (!accentWord) return <>{headline}</>;
  const index = headline.indexOf(accentWord);
  if (index === -1) return <>{headline}</>;
  return (
    <>
      {headline.slice(0, index)}
      <span style={{ color: accentColor }}>{accentWord}</span>
      {headline.slice(index + accentWord.length)}
    </>
  );
};

export const HeadlineBar: React.FC<{
  headline: string;
  accentWord?: string;
  accentColor?: string;
  opacity: number;
  translateY?: number;
}> = ({ headline, accentWord, accentColor = colors.green, opacity, translateY = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 240,
      textAlign: "center",
      opacity,
      transform: `translateY(${translateY}px)`,
      padding: "0 60px",
    }}
  >
    <span
      style={{
        fontFamily: BE_VIETNAM_PRO,
        fontWeight: 800,
        fontSize: 60,
        lineHeight: 1.18,
        color: colors.textPrimary,
        textShadow: "0 2px 24px rgba(0,0,0,0.08)",
      }}
    >
      {renderAccent(headline, accentWord, accentColor)}
    </span>
  </div>
);
