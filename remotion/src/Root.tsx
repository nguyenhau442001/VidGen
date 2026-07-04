import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { CoverScene } from "./scenes/CoverScene";
import { PhoneMockupScene } from "./scenes/PhoneMockupScene";
import { MapPingScene } from "./scenes/MapPingScene";
import { ScoreCardScene, calculateScoreCardDuration } from "./scenes/ScoreCardScene";
import { SplitViewScene } from "./scenes/SplitViewScene";
import { CharacterIconScene } from "./scenes/CharacterIconScene";
import { QuoteCalloutScene, calculateQuoteCalloutDuration } from "./scenes/QuoteCalloutScene";
import { ZoomRevealScene, FocalDot, DotField, calculateZoomRevealDuration } from "./scenes/ZoomRevealScene";
import { SplitRevealScene, calculateSplitRevealDuration } from "./scenes/SplitRevealScene";
import { ManifestScene, RenderManifest } from "./types";
import { interpolate, useCurrentFrame } from "remotion";
import { waitForInter, waitForJetBrainsMono, waitForBeVietnamPro } from "./styles";
import defaultManifest from "../../output/render_manifest.json";

// Load fonts before any frame is captured
const fontHandle = delayRender("Loading fonts");
Promise.all([waitForInter(), waitForJetBrainsMono(), waitForBeVietnamPro()]).then(() => {
  continueRender(fontHandle);
});

// Derive cover props from the manifest: hook text from scene 1, terminal lines from first terminal scene
const manifestScenes = (defaultManifest as unknown as RenderManifest).scenes;
const hookScene = manifestScenes[0];
const firstTerminal = manifestScenes.find(
  (s): s is Extract<ManifestScene, { type: "terminal" }> => s.type === "terminal"
);
const coverDefaultProps = {
  headline: hookScene.type === "explanation" ? hookScene.visual.headline : "",
  body: hookScene.type === "explanation" ? hookScene.visual.body : "",
  terminalLines: firstTerminal ? firstTerminal.visual.lines.filter((l) => l.trim()) : [],
};

// Demo wrapper — uses hooks so rightContent can animate
const SPLIT_DEMO_DURATION = 180;
const ALGO_STEPS = [
  "Phân tích 247 tài xế gần đó",
  "Tính toán điểm ưu tiên",
  "Kiểm tra lịch sử đánh giá",
  "Tối ưu hóa lộ trình",
  "Xác nhận khả dụng",
];

const SplitViewDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const rightContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
      {ALGO_STEPS.map((step, i) => {
        const enterAt = 14 + i * 10;
        const opacity = interpolate(frame, [enterAt, enterAt + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const slideX = interpolate(frame, [enterAt, enterAt + 12], [18, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity,
              transform: `translateX(${slideX}px)`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#00c896",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.75)",
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.4,
              }}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <SplitViewScene
      leftPanel={{ kind: "loading", text: "Đang tìm tài xế..." }}
      rightContent={rightContent}
      leftLabel="Bạn thấy"
      rightLabel="Hệ thống đang làm"
      accentColor="#00c896"
      durationInFrames={SPLIT_DEMO_DURATION}
    />
  );
};

// ZoomReveal demo — pulls back from one highlighted driver to a busy dot field
const ZOOM_REVEAL_DURATION = calculateZoomRevealDuration(30, 2.2);

const ZoomRevealDemo: React.FC = () => (
  <ZoomRevealScene
    focusElement={<FocalDot />}
    revealContent={
      <DotField
        durationInFrames={ZOOM_REVEAL_DURATION}
        zoomStartScale={8}
        zoomEndScale={1}
      />
    }
    zoomStartScale={8}
    zoomEndScale={1}
    accentColor="#00c896"
    durationInFrames={ZOOM_REVEAL_DURATION}
  />
);

// SplitReveal demo — a compressed MapPing shot slides left, opening space for
// a (placeholder) score panel on the right.
const SPLIT_REVEAL_DURATION = calculateSplitRevealDuration(35, true);

const SplitRevealDemo: React.FC = () => (
  <SplitRevealScene
    leftContent={
      <MapPingScene
        drivers={[
          { x: 0.28, y: 0.28, label: "350m" },
          { x: 0.72, y: 0.35, label: "480m" },
          { x: 0.35, y: 0.65, label: "610m" },
          { x: 0.68, y: 0.62, label: "290m" },
        ]}
        highlightedDriverIndex={3}
        accentColor="#00c896"
        durationInFrames={SPLIT_REVEAL_DURATION}
      />
    }
    rightContent={
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <span style={{ fontSize: 20, color: "rgba(255,255,255,0.35)" }}>
          Bảng điểm sẽ được dựng ở đây
        </span>
      </div>
    }
    leftCaption="Bản đồ"
    rightCaption="Điểm số"
    accentColor="#00c896"
    revealDurationFrames={35}
  />
);

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokVideo"
        component={TikTokVideo}
        durationInFrames={1}
        fps={defaultManifest.fps}
        width={defaultManifest.width}
        height={defaultManifest.height}
        defaultProps={{ manifest: defaultManifest as RenderManifest }}
        calculateMetadata={async ({ props }) => {
          const manifest = props.manifest as RenderManifest;
          return {
            fps: manifest.fps,
            width: manifest.width,
            height: manifest.height,
            durationInFrames: Math.max(1, manifest.scenes.reduce((s, sc) => s + sc.durationInFrames, 0)),
          };
        }}
      />
      <Composition
        id="Cover"
        component={CoverScene}
        durationInFrames={1}
        fps={defaultManifest.fps}
        width={defaultManifest.width}
        height={defaultManifest.height}
        defaultProps={coverDefaultProps}
      />
      <Composition
        id="CharacterIcon"
        component={CharacterIconScene}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          pose: "holding-phone" as const,
          accompanyingIcon: "phone" as const,
          accentColor: "#00c896",
          durationInFrames: 120,
        }}
      />
      <Composition
        id="QuoteCallout"
        component={QuoteCalloutScene}
        durationInFrames={calculateQuoteCalloutDuration(
          "Đó là lúc mọi thứ thay đổi mãi mãi."
        )}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          text: "Đó là lúc mọi thứ thay đổi mãi mãi.",
          accentWord: "thay đổi",
          backgroundStyle: "gradient-subtle" as const,
          accentColor: "#61dafb",
          durationInFrames: calculateQuoteCalloutDuration(
            "Đó là lúc mọi thứ thay đổi mãi mãi."
          ),
        }}
      />
      <Composition
        id="ZoomReveal"
        component={ZoomRevealDemo}
        durationInFrames={ZOOM_REVEAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SplitReveal"
        component={SplitRevealDemo}
        durationInFrames={SPLIT_REVEAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SplitView"
        component={SplitViewDemo}
        durationInFrames={SPLIT_DEMO_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ScoreCard"
        component={ScoreCardScene}
        durationInFrames={calculateScoreCardDuration(4, 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          criteria: [
            { label: "Hiệu suất", score: 65, maxScore: 100 },
            { label: "Độ chính xác", score: 78, maxScore: 100 },
            { label: "Bảo mật", score: 55, maxScore: 100 },
            { label: "Tốc độ xử lý", score: 82, maxScore: 100 },
          ],
          staggerFrames: 30,
          accentColor: "#61dafb",
          title: "Kết Quả Đánh Giá",
          durationInFrames: calculateScoreCardDuration(4, 30),
        }}
      />
      <Composition
        id="MapPing"
        component={MapPingScene}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          drivers: [
            { x: 0.28, y: 0.28, label: "350m" },
            { x: 0.72, y: 0.35, label: "480m" },
            { x: 0.35, y: 0.65, label: "610m" },
            { x: 0.68, y: 0.62, label: "290m" },
          ],
          nearestDriverIndex: 3,
          selectedDriverIndex: 0,
          phase1End: 100,
          phase2Start: 115,
          accentColor: "#00c896",
          durationInFrames: 210,
        }}
      />
      <Composition
        id="PhoneMockup"
        component={PhoneMockupScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          screenState: "idle" as const,
          driverName: "Nguyễn Văn An",
          driverEta: "3",
          accentColor: "#00c896",
          buttonLabel: "Đặt xe",
          idleRange: [0, 44] as [number, number],
          loadingRange: [45, 89] as [number, number],
          matchedRange: [90, 149] as [number, number],
          durationInFrames: 150,
        }}
      />
    </>
  );
};
