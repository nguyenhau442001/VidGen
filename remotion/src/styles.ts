import { loadFont as loadInterFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMonoFont } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily: INTER, waitUntilDone: waitForInter } = loadInterFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

export const { fontFamily: JETBRAINS_MONO, waitUntilDone: waitForJetBrainsMono } =
  loadJetBrainsMonoFont("normal", {
    weights: ["400", "500", "700"],
    subsets: ["latin", "vietnamese"],
  });

export const colors = {
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

export const type = {
  headline: { fontSize: 56, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.025em" } as const,
  body: { fontSize: 32, fontWeight: 400, lineHeight: 1.5 } as const,
  code: { fontSize: 26, fontWeight: 400, lineHeight: 1.6 } as const,
  terminal: { fontSize: 24, fontWeight: 400, lineHeight: 1.7 } as const,
  label: { fontSize: 18, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const } as const,
};
