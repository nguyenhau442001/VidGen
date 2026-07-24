import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LoginBindVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BrowserChrome, renderAccent } from "./incognitoShared";
import { phaseProgress } from "./cinematicPrimitives";

export type LoginBindSceneProps = LoginBindVisual & { durationInFrames: number };

// Frame plan:
//   0–20        guest chip visible
//   loginFrame  guest chip morphs into the account row (email settles in)
//   +26         the two activity tags slide down and dock under the account row
//   +30         headline 1 ("ĐĂNG NHẬP RỒI") holds briefly
//   +60         headline swaps to headline 2 (binding statement), holds to end
export const LoginBindShot: React.FC<LoginBindSceneProps> = ({
  email = "minh.tran@example.com",
  loginFrame = 30,
  tag1 = "Một lượt tìm kiếm",
  tag2 = "Một lượt xem",
  headline1 = "ĐĂNG NHẬP RỒI",
  headline2 = "HOẠT ĐỘNG CÓ THỂ GẮN VỚI TÀI KHOẢN",
  accentWord2 = "GẮN VỚI TÀI KHOẢN",
  accentColor = colors.green,
}) => {
  const frame = useCurrentFrame();

  const guestOpacity = 1 - phaseProgress(frame, loginFrame, 12);
  const accountOpacity = phaseProgress(frame, loginFrame, 14);
  const accountY = interpolate(accountOpacity, [0, 1], [-14, 0]);

  const dockStart = loginFrame + 26;
  const tag1Opacity = phaseProgress(frame, dockStart, 14);
  const tag1Y = interpolate(tag1Opacity, [0, 1], [-70, 0]);
  const tag2Opacity = phaseProgress(frame, dockStart + 12, 14);
  const tag2Y = interpolate(tag2Opacity, [0, 1], [-70, 0]);

  const h1Start = dockStart + 30;
  const h1Opacity = phaseProgress(frame, h1Start, 14) * (1 - phaseProgress(frame, h1Start + 46, 14));
  const h2Start = h1Start + 60;
  const h2Opacity = phaseProgress(frame, h2Start, 16);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <BrowserChrome width={880} urlLabel="tinviet.vn/tai-khoan" accentColor={accentColor}>
          <div style={{ position: "relative", minHeight: 300 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: guestOpacity,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 30 }}>{"\u{1F464}"}</span>
              <span style={{ fontFamily: INTER, fontSize: 22, fontWeight: 600, color: "rgba(0,0,0,0.55)" }}>
                Khách chưa đăng nhập
              </span>
            </div>

            <div
              style={{
                opacity: accountOpacity,
                transform: `translateY(${accountY}px)`,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: `${accentColor}14`,
                  border: `1px solid ${accentColor}55`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  M
                </div>
                <span style={{ fontFamily: INTER, fontSize: 22, fontWeight: 700, color: "rgba(0,0,0,0.82)" }}>
                  {email}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
                <div
                  style={{
                    opacity: tag1Opacity,
                    transform: `translateY(${tag1Y}px)`,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontFamily: INTER,
                    fontSize: 18,
                    color: "rgba(0,0,0,0.7)",
                  }}
                >
                  {"\u{2193} "}{tag1}
                </div>
                <div
                  style={{
                    opacity: tag2Opacity,
                    transform: `translateY(${tag2Y}px)`,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontFamily: INTER,
                    fontSize: 18,
                    color: "rgba(0,0,0,0.7)",
                  }}
                >
                  {"\u{2193} "}{tag2}
                </div>
              </div>
            </div>
          </div>
        </BrowserChrome>

        <div style={{ position: "absolute", bottom: 260, left: 60, right: 60, textAlign: "center" }}>
          <div style={{ position: "relative", height: 130 }}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                opacity: h1Opacity,
                fontFamily: INTER,
                fontWeight: 800,
                fontSize: 50,
                color: colors.textPrimary,
              }}
            >
              {headline1}
            </span>
            <span
              style={{
                position: "absolute",
                inset: 0,
                opacity: h2Opacity,
                fontFamily: INTER,
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1.2,
                color: colors.textPrimary,
              }}
            >
              {renderAccent(headline2, accentWord2, accentColor)}
            </span>
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default LoginBindShot;
