import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
            "radial-gradient(circle at 15% 12%, rgba(74, 123, 227, 0.45) 0%, rgba(74, 123, 227, 0) 42%), radial-gradient(circle at 86% 14%, rgba(42, 86, 184, 0.45) 0%, rgba(42, 86, 184, 0) 45%), linear-gradient(135deg, #0f2340 0%, #14325f 55%, #1b458f 100%)",
          color: "#f4f8ff",
          padding: "56px 64px",
          fontFamily: "Manrope, system-ui, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(140deg, #2d5ec2 0%, #1b458f 100%)",
              fontWeight: 800,
              fontSize: "24px",
              letterSpacing: "-0.02em"
            }}
          >
            AC
          </div>
          <div
            style={{
              fontSize: "34px",
              fontWeight: 700,
              letterSpacing: "-0.03em"
            }}
          >
            Coached Climbing
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "880px"
          }}
        >
          <div
            style={{
              fontSize: "64px",
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.04em"
            }}
          >
            Personalised training plans, built around your goals.
          </div>
          <div
            style={{
              fontSize: "30px",
              lineHeight: 1.25,
              color: "rgba(235, 242, 255, 0.92)"
            }}
          >
            Structured plans, coach chat adjustments, and progress tracking.
          </div>
        </div>
      </div>
    ),
    size
  );
}
