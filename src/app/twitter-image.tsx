import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 600
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 13% 8%, rgba(74, 123, 227, 0.38) 0%, rgba(74, 123, 227, 0) 44%), linear-gradient(135deg, #112748 0%, #1b458f 100%)",
          color: "#f4f8ff",
          padding: "48px 56px",
          fontFamily: "Manrope, system-ui, sans-serif"
        }}
      >
        <div
          style={{
            fontSize: "32px",
            fontWeight: 700,
            letterSpacing: "-0.03em"
          }}
        >
          Coached Climbing
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "900px"
          }}
        >
          <div
            style={{
              fontSize: "58px",
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: "-0.04em"
            }}
          >
            Personalised training plans.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.2,
              color: "rgba(235, 242, 255, 0.92)"
            }}
          >
            Plan, adjust, and track your next block.
          </div>
        </div>
      </div>
    ),
    size
  );
}
