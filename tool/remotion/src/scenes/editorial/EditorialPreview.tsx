import React from "react";
import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { FilmGrainOverlay } from "../../primitives";
import { DeepDiveDocumentScene } from "./DeepDiveDocumentScene";
import { InvestigationBoardScene } from "./InvestigationBoardScene";
import { DataComparisonEditorialScene } from "./DataComparisonEditorialScene";
import { PunchlineRevealScene } from "./PunchlineRevealScene";

/**
 * EditorialPreview
 * A 15-second showcase of the new tactile, human-crafted documentarian style.
 * Combines CameraRig25D, FilmGrainOverlay, TextHighlighter, RubberStamp, and Micro-SFX.
 */
export const EditorialPreview: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1117" }}>
      <Series>
        {/* Scene 1: Investigation Board (110 frames ~ 3.6s) */}
        <Series.Sequence durationInFrames={110}>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/whoosh_subtle.wav")} volume={0.6} />
          </Sequence>
          <Sequence from={12}>
            <Audio src={staticFile("sfx/paper_slide.wav")} volume={0.7} />
          </Sequence>
          <Sequence from={45}>
            <Audio src={staticFile("sfx/stamp_impact.wav")} volume={0.85} />
          </Sequence>
          <InvestigationBoardScene
            headline="Vì sao Grab không chọn tài xế gần bạn nhất?"
            subheadline="Tài xế đứng ngay trước mặt, nhưng cuốc xe lại nổ cho người cách 1km."
            caseFileNumber="DISPATCH-ALGO-2026"
            evidence={[
              {
                id: "e1",
                type: "photo",
                title: "Tài xế A: 50m (Trước mắt)",
                content: "Đang quay đầu, đường 1 chiều, điểm đón bị dải phân cách chắn.",
                verifiedBadge: true,
              },
              {
                id: "e2",
                type: "document",
                title: "Tài xế B: 850m (Bên kia cầu)",
                content: "Đang chạy thẳng hướng đón, dự kiến đến nhanh hơn 2.5 phút.",
                verifiedBadge: true,
              },
            ]}
            stampText="NGHỊCH LÝ"
            stampFrame={45}
            durationInFrames={110}
          />
        </Series.Sequence>

        {/* Scene 2: Deep Dive Document (120 frames ~ 4.0s) */}
        <Series.Sequence durationInFrames={120}>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/paper_slide.wav")} volume={0.65} />
          </Sequence>
          <Sequence from={22}>
            <Audio src={staticFile("sfx/marker_stroke.wav")} volume={0.75} />
          </Sequence>
          <DeepDiveDocumentScene
            documentTitle="Grab Batch Dispatch Optimization"
            sourceAuthority="US PATENT / SYSTEM ARCHITECTURE"
            dateLabel="INTERNAL SPEC"
            paragraphs={[
              {
                segments: [
                  { text: "Hệ thống không chạy thuật toán gán 1-1 theo khoảng cách. " },
                  {
                    text: "Nó tối ưu điểm phân bổ trên toàn cụm: Tỉ lệ hủy thấp nhất và thời gian đón trung bình nhỏ nhất.",
                    highlighted: true,
                    color: "rgba(255, 230, 0, 0.65)",
                  },
                ],
              },
            ]}
            marginNote={{
              text: "Khoảng cách vật lý (mét) ≠ Thời gian tiếp cận (giây).",
            }}
            durationInFrames={120}
          />
        </Series.Sequence>

        {/* Scene 3: Data Comparison Editorial (120 frames ~ 4.0s) */}
        <Series.Sequence durationInFrames={120}>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/whoosh_subtle.wav")} volume={0.5} />
          </Sequence>
          <Sequence from={15}>
            <Audio src={staticFile("sfx/stamp_impact.wav")} volume={0.7} />
          </Sequence>
          <Sequence from={35}>
            <Audio src={staticFile("sfx/stamp_impact.wav")} volume={0.7} />
          </Sequence>
          <DataComparisonEditorialScene
            headline="Hệ Thống Thật Sự Tối Ưu Cái Gì?"
            question="Hiểu đúng mục tiêu, mọi hành vi kỳ lạ đều trở nên hợp lý."
            leftSide={{
              label: "Khoảng cách",
              metric: "MIN (MÉT)",
              notes: ["Tưởng gần nhất", "Dễ kẹt xe quay đầu", "Tỉ lệ hủy cao"],
              verdict: "LẦM TƯỞNG",
              stamp: "MYTH",
              highlight: false,
            }}
            rightSide={{
              label: "Hiệu quả hệ thống",
              metric: "MAX (SCORE)",
              notes: ["Ưu tiên hướng di chuyển", "Giảm tổng thời gian chờ", "Tối đa tỉ lệ hoàn thành"],
              verdict: "THỰC TẾ",
              stamp: "OPTIMAL",
              highlight: true,
            }}
            insightCallout="Chọn người gần nhất chỉ làm hài lòng cảm giác, không tối ưu tốc độ thực tế."
            durationInFrames={120}
          />
        </Series.Sequence>

        {/* Scene 4: Punchline Reveal (100 frames ~ 3.3s) */}
        <Series.Sequence durationInFrames={100}>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/bass_drop.wav")} volume={0.85} />
          </Sequence>
          <PunchlineRevealScene
            eyebrow="ẢNH HƯỞNG TƯ DUY"
            primaryStatement="HỆ THỐNG KHÔNG LỖI. NÓ ĐANG TỐI ƯU THỨ KHÁC."
            secondaryStatement="Lần tới khi bạn thấy app hành xử kỳ lạ — hãy tự hỏi: mục tiêu thật sự của nó là gì?"
            disclaimerNote="Ủa là sao? · Khám phá mục tiêu ẩn đằng sau công nghệ."
            durationInFrames={100}
          />
        </Series.Sequence>
      </Series>

      <FilmGrainOverlay opacity={0.04} vignette={true} />
    </AbsoluteFill>
  );
};
