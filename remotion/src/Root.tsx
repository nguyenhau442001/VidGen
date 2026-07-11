import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { CoverScene } from "./scenes/CoverScene";
import { PhoneMockupScene } from "./scenes/PhoneMockupScene";
import { MapPingScene } from "./scenes/MapPingScene";
import { GeohashRevealScene } from "./scenes/GeohashRevealScene";
import { DemandHeatmapScene } from "./scenes/DemandHeatmapScene";
import { SignalFlowScene } from "./scenes/SignalFlowScene";
import { NetworkFlowScene } from "./scenes/NetworkFlowScene";
import { RippleAggregateScene } from "./scenes/RippleAggregateScene";
import { DriverSwarmScene } from "./scenes/DriverSwarmScene";
import { CounterBlastScene } from "./scenes/CounterBlastScene";
import { ScoreCardScene, calculateScoreCardDuration } from "./scenes/ScoreCardScene";
import { SplitViewScene } from "./scenes/SplitViewScene";
import { CharacterIconScene } from "./scenes/CharacterIconScene";
import { CharacterIconCoverScene } from "./scenes/CharacterIconCoverScene";
import { QuoteCalloutScene, calculateQuoteCalloutDuration } from "./scenes/QuoteCalloutScene";
import { ZoomRevealScene, FocalDot, DotField, calculateZoomRevealDuration } from "./scenes/ZoomRevealScene";
import { SplitRevealScene, calculateSplitRevealDuration } from "./scenes/SplitRevealScene";
import AnimatedFlowScene from "./scenes/AnimatedFlowScene";
import BubbleComparatorScene from "./scenes/BubbleComparatorScene";
import PhoneMapScene from "./scenes/PhoneMapScene";
import ConversationScene from "./scenes/ConversationScene";
import BeforeAfterScene from "./scenes/BeforeAfterScene";
import GridHeatmapScene from "./scenes/GridHeatmapScene";
import { RadarHookScene } from "./scenes/RadarHookScene";
import { EventScanScene } from "./scenes/EventScanScene";
import StatComparatorScene from "./scenes/StatComparatorScene";
import { RouteTimelineScene } from "./scenes/RouteTimelineScene";
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
  body: hookScene.type === "explanation" ? (hookScene.visual.body ?? "") : "",
  terminalLines: firstTerminal
    ? firstTerminal.visual.lines.map((l) => (typeof l === "string" ? l : l.text)).filter((l) => l.trim())
    : [],
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
        defaultProps={{ manifest: defaultManifest as unknown as RenderManifest }}
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
        id="CharacterIconCover"
        component={CharacterIconCoverScene}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          eyebrowText: "DevFaster",
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
        id="GeohashReveal"
        component={GeohashRevealScene}
        durationInFrames={310}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          districts: [
            { x: 4, y: 3, label: "Quận 1", demandLevel: 0.95 },
            { x: 3, y: 3, label: "Quận 3", demandLevel: 0.8 },
            { x: 5, y: 2, label: "Bình Thạnh", demandLevel: 0.7 },
            { x: 3, y: 2, label: "Phú Nhuận", demandLevel: 0.65 },
            { x: 5, y: 4, label: "Quận 4", demandLevel: 0.6 },
            { x: 1, y: 5, label: "Quận 7", demandLevel: 0.35 },
          ],
          accentColor: "#22C55E",
          gridRows: 7,
          gridCols: 9,
          durationInFrames: 310,
        }}
      />
      <Composition
        id="DemandHeatmap"
        component={DemandHeatmapScene}
        durationInFrames={298}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hotspots: [
            { x: 380, y: 430, radius: 110, intensity: 0.95, label: "Quận 1" },
            { x: 300, y: 560, radius: 85, intensity: 0.8 },
            { x: 490, y: 510, radius: 90, intensity: 0.7 },
            { x: 250, y: 370, radius: 70, intensity: 0.5 },
            { x: 470, y: 700, radius: 78, intensity: 0.45 },
            { x: 340, y: 830, radius: 60, intensity: 0.35 },
          ],
          accentColor: "#22C55E",
          durationInFrames: 298,
        }}
      />
      <Composition
        id="SignalFlow"
        component={SignalFlowScene}
        durationInFrames={298}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          signals: [
            { icon: "📊", label: "Dữ liệu lịch sử", color: "#61dafb" },
            { icon: "🌧️", label: "Thời tiết", color: "#a78bfa" },
            { icon: "📅", label: "Sự kiện & Lễ hội", color: "#fbbf24" },
          ],
          outputLabel: "Dự báo nhu cầu",
          accentColor: "#22C55E",
          durationInFrames: 298,
        }}
      />
      <Composition
        id="NetworkFlow"
        component={NetworkFlowScene}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          signals: [
            { icon: "🅰️", label: "Cuốc A", color: "#00ff41" },
            { icon: "🅱️", label: "Cuốc B", color: "#00ff41" },
          ],
          outputLabel: "Một tuyến gộp",
          accentColor: "#00ff41",
          durationInFrames: 180,
        }}
      />
      <Composition
        id="RouteTimeline"
        component={RouteTimelineScene}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          stops: [
            { label: "Đón khách A" },
            { label: "Đón khách B", sublabel: "+900m", highlight: true },
            { label: "Trả khách A" },
            { label: "Trả khách B" },
          ],
          accentColor: "#00ff41",
          onScreenText: "Một tuyến, hai khách, một tài xế",
          durationInFrames: 180,
        }}
      />
      <Composition
        id="RippleAggregate"
        component={RippleAggregateScene}
        durationInFrames={346}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          singleLabel: "Bạn thấy",
          aggregateLabel: "8.431 lượt mở app / 5 phút",
          phoneCount: 28,
          accentColor: "#22C55E",
          durationInFrames: 346,
        }}
      />
      <Composition
        id="DriverSwarm"
        component={DriverSwarmScene}
        durationInFrames={281}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          drivers: [
            { startX: 140, startY: 200, endX: 300, endY: 430, label: "800m" },
            { startX: 620, startY: 260, endX: 470, endY: 420, label: "1.2km" },
            { startX: 130, startY: 800, endX: 290, endY: 590, label: "650m" },
            { startX: 610, startY: 850, endX: 480, endY: 610, label: "900m" },
            { startX: 370, startY: 120, endX: 375, endY: 350, label: "1.5km" },
            { startX: 640, startY: 560, endX: 530, endY: 505, label: "400m" },
          ],
          hotspot: { x: 375, y: 500, label: "Quận 1" },
          accentColor: "#22C55E",
          durationInFrames: 281,
        }}
      />
      <Composition
        id="CounterBlast"
        component={CounterBlastScene}
        durationInFrames={131}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          finalValue: 34,
          unit: "tài xế",
          subLabel: "đã lăn bánh trước khi bạn bấm Book",
          accentColor: "#22C55E",
          durationInFrames: 131,
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
      <Composition
        id="AnimatedFlow"
        component={AnimatedFlowScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          nodes: [
            { id: "1", label: "Khởi tạo Project", sublabel: "npm init -y", color: "green" },
            { id: "2", label: "Cài đặt Remotion", sublabel: "npm i remotion", color: "cyan" },
            { id: "3", label: "Tạo Composition", sublabel: "Root.tsx", color: "neutral" },
            { id: "4", label: "Render Video", sublabel: "npx remotion render", color: "neutral" }
          ],
          edges: [
            { from: "1", to: "2", label: "Bước tiếp theo" },
            { from: "2", to: "3", label: "Định cấu hình" },
            { from: "3", to: "4", label: "Xuất bản" }
          ],
          headline: "Quy trình làm việc Remotion",
          durationInFrames: 150,
        }}
      />
      <Composition
        id="BubbleComparator"
        component={BubbleComparatorScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          items: [
            { label: "React", value: 120, unit: "k stars", color: "cyan" },
            { label: "Vue", value: 95, unit: "k stars", color: "green" },
            { label: "Angular", value: 65, unit: "k stars", color: "red" }
          ],
          headline: "So sánh các Frontend Framework nổi tiếng nhất",
          accentWord: "Frontend Framework",
          durationInFrames: 150,
        }}
      />
      <Composition
        id="PhoneMap"
        component={PhoneMapScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          pins: [
            { id: "user-1", x: 0.5, y: 0.6, label: "Vị trí của bạn", type: "user" },
            { id: "driver-1", x: 0.25, y: 0.35, label: "Tài xế 1", type: "driver" },
            { id: "driver-2", x: 0.7, y: 0.45, label: "Tài xế 2", type: "driver" },
            { id: "zone-1", x: 0.5, y: 0.5, label: "Khu vực đón", type: "zone" }
          ],
          headline: "Tìm tài xế công nghệ gần bạn",
          showRadius: true,
          durationInFrames: 150,
        }}
      />
      <Composition
        id="Conversation"
        component={ConversationScene}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          messages: [
            { side: "left", text: "Chào bạn! Cho mình hỏi cách cài đặt Remotion với?", sender: "Nguyễn Văn An" },
            { side: "right", text: "Chào An! Bạn chỉ cần chạy lệnh `npm init video` là xong nhé.", delay: 10 },
            { side: "left", text: "Ồ đơn giản vậy sao! Cảm ơn bạn nhiều nha.", sender: "Nguyễn Văn An", delay: 15 }
          ],
          headline: "Thảo luận về Remotion",
          durationInFrames: 180,
        }}
      />
      <Composition
        id="BeforeAfter"
        component={BeforeAfterScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          before: {
            label: "TRƯỚC",
            points: [
              "Lỗi runtime khó phát hiện",
              "Không có gợi ý kiểu dữ liệu",
              "Khó refactor code lớn",
            ],
          },
          after: {
            label: "SAU",
            points: [
              "Bắt lỗi ngay khi code",
              "Autocomplete thông minh",
              "Refactor an toàn hơn",
            ],
          },
          headline: "Trước và sau khi dùng TypeScript",
          accentWord: "TypeScript",
          durationInFrames: 150,
        }}
      />
      <Composition
        id="GridHeatmap"
        component={GridHeatmapScene}
        durationInFrames={200}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          grid: [
            [0.1, 0.3, 0.5, 0.4, 0.2],
            [0.2, 0.6, 0.85, 0.7, 0.3],
            [0.4, 0.75, 0.95, 0.9, 0.5],
            [0.3, 0.65, 0.8, 0.6, 0.35],
            [0.15, 0.4, 0.55, 0.45, 0.2],
          ],
          headline: "Mật độ yêu cầu theo khu vực",
          colorScheme: "green",
          durationInFrames: 200,
        }}
      />
      <Composition
        id="RadarHook"
        component={RadarHookScene}
        durationInFrames={121}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          topicLabel: "Thuật toán ẩn · Phần 2/4",
          eyebrow: "Điều đã xảy ra trước khi bạn biết",
          headline: "Chưa mở app.\nTài xế đã chờ sẵn rồi.",
          driverLabels: ["Tài xế 1", "Tài xế 2", "Tài xế 3"],
          stats: [
            { label: "Tài xế chờ sẵn", value: "3" },
            { label: "Lần mở app", value: "0", highlight: true },
            { label: "ETA của bạn", value: "4s" },
          ],
          durationInFrames: 121,
        }}
      />
      <Composition
        id="EventScan"
        component={EventScanScene}
        durationInFrames={340}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          eyebrow: "TÍN HIỆU 3 · SỰ KIỆN",
          scanLabel: "Quét lịch thành phố · 48h tới",
          events: [
            { icon: "concert" as const, label: "Concert · Quận 1", meta: "Tối nay 20:00 · ~8.000 người" },
            { icon: "sports" as const, label: "Bóng đá · Bình Thạnh", meta: "Thứ Bảy 19:30 · ~12.000 người" },
          ],
          multiplierValue: "2.3x",
          multiplierLabel: "Hệ số nhu cầu · Q1 20:00–22:00",
          actionText: "Điều 34 tài xế đến Q1 trước 21:00",
          accentColor: "#f59e0b",
          durationInFrames: 340,
        }}
      />
      <Composition
        id="StatComparator"
        component={StatComparatorScene}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          headline: "Vùng sẵn sàng rút ngắn thời gian chờ",
          accentWord: "rút ngắn",
          beforeLabel: "Không có vùng sẵn",
          beforeStat: "8 phút",
          beforeStatNumber: 8,
          beforeStatUnit: "phút",
          beforeSubtext: "Hủy chuyến: cao",
          afterLabel: "Có vùng sẵn sàng",
          afterStat: "2.5 phút",
          afterStatNumber: 2.5,
          afterStatUnit: "phút",
          afterSubtext: "Hủy chuyến: -40%",
          deltaLabel: "Hiệu quả gấp đôi — cùng số tài xế",
          durationInFrames: 330,
        }}
      />
    </>
  );
};
