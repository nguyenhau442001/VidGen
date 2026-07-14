import { loadFont as loadInterFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMonoFont } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadBeVietnamProFont } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadNotoSerifSCFont } from "@remotion/google-fonts/NotoSerifSC";

export const { fontFamily: INTER, waitUntilDone: waitForInter } = loadInterFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "vietnamese"],
});

export const { fontFamily: JETBRAINS_MONO, waitUntilDone: waitForJetBrainsMono } =
  loadJetBrainsMonoFont("normal", {
    weights: ["400", "500", "700"],
    subsets: ["latin", "vietnamese"],
  });

export const { fontFamily: BE_VIETNAM_PRO, waitUntilDone: waitForBeVietnamPro } =
  loadBeVietnamProFont("normal", {
    weights: ["400", "500", "600", "700", "800", "900"],
    subsets: ["latin", "vietnamese"],
  });

// NotoSerifSC's actual runtime metadata splits CJK glyphs into numbered unicode-range
// chunks (not the "chinese-simplified" name @remotion/google-fonts' .d.ts advertises,
// which doesn't exist in this package version's data — hence the `as any`). These chunks
// cover the specific hanzi used across HSKFlashCardThumbnailScene's default props
// (汉字爱惜要粮食不浪费); add chunks here if new hanzi are introduced.
export const { fontFamily: NOTO_SERIF_SC, waitUntilDone: waitForNotoSerifSC } =
  loadNotoSerifSCFont("normal", {
    weights: ["900"],
    subsets: ["[109]", "[114]", "[115]", "[116]", "[117]", "[118]"] as any,
  });

export type Theme = "dark" | "light";

export const colorsDark = {
  bg: "#0a0a0f",
  green: "#00ff41",
  cyan: "#61dafb",
  errorRed: "#ff3b3b",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.5)",
  terminalBg: "#0d1117",
  terminalBorder: "rgba(255,255,255,0.08)",
  codeBg: "#0d1117",
};

export const colorsLight = {
  bg: "#f8f9fa",            // nền trắng xám nhẹ — không chói
  green: "#16a34a",         // xanh lá đậm — readable trên trắng
  cyan: "#0284c7",          // xanh dương đậm
  errorRed: "#dc2626",
  textPrimary: "rgba(0,0,0,0.90)",
  textDim: "rgba(0,0,0,0.45)",
  terminalBg: "#1e1e2e",    // terminal vẫn dark — đọc code cần contrast cao
  terminalBorder: "rgba(0,0,0,0.12)",
  codeBg: "#1e1e2e",
};

// Channel default switched to light theme 2026-07-14 — bright, readable background
// for all future videos instead of dark mode (dark mode was seen as niche/off-putting
// to a broader audience). colorsDark stays exported for any scene that still needs it.
export const colors = colorsLight;

// Khi theme="light", các accent màu neon (#ef4444 đỏ) cần được darkened một chút
// để readable trên nền trắng. Không cần đổi trong JSON — xử lý ở component level.
export function resolveAccent(accent: string, theme: Theme): string {
  if (theme === "dark") return accent;
  // Map neon → saturated dark variant
  const lightMap: Record<string, string> = {
    "#ef4444": "#b91c1c",   // red-500 → red-700
    "#f97316": "#c2410c",   // orange-500 → orange-700
    "#eab308": "#a16207",   // yellow-500 → yellow-700
    "#00ff41": "#15803d",   // neon green → green-700
    "#61dafb": "#0369a1",   // cyan → sky-700
    "#22C55E": "#15803d",
    "#22d3ee": "#0369a1",
  };
  return lightMap[accent] ?? accent;
}

// TikTok safe zone (1080×1920) — measured from real posted-video screenshots,
// includes 24px inner breathing room so content isn't flush against the boundary.
export const SAFE_ZONE = {
  top: 244,   // 220 tab-bar + 24
  bottom: 424, // 400 bottom-bar + 24
  left: 94,   // 70 + 24
  right: 154, // 130 icon-column + 24
} as const;

// Caption.tsx's pill is bottom-anchored at SAFE_ZONE.bottom and grows
// upward with narration length — this project's longer Vietnamese captions
// commonly wrap to 5-6 lines. Scenes with tall bottom content (node graphs,
// signal diagrams, multi-row panels) must keep their lowest element's
// bottom edge above this line (in the 1080x1920 composition) so it can
// never land under the caption, not just clear of SAFE_ZONE.bottom's
// TikTok-UI margin (which only guarantees room for a one-line caption).
export const CAPTION_CLEAR_Y = 1216;

export const type = {
  headline: { fontSize: 56, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.025em" } as const,
  body: { fontSize: 32, fontWeight: 400, lineHeight: 1.5 } as const,
  code: { fontSize: 26, fontWeight: 400, lineHeight: 1.6 } as const,
  terminal: { fontSize: 24, fontWeight: 400, lineHeight: 1.7 } as const,
  label: { fontSize: 18, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const } as const,
};