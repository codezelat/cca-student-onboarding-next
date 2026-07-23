import { ImageResponse } from "next/og";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, #faf5ff 0%, #f5f3ff 48%, #eef2ff 100%)",
          color: "#1f2937",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#c084fc",
            borderRadius: "9999px",
            filter: "blur(80px)",
            height: "360px",
            left: "-90px",
            opacity: 0.28,
            position: "absolute",
            top: "-130px",
            width: "360px",
          }}
        />
        <div
          style={{
            background: "#a5b4fc",
            borderRadius: "9999px",
            filter: "blur(90px)",
            height: "390px",
            opacity: 0.34,
            position: "absolute",
            right: "-110px",
            top: "310px",
            width: "390px",
          }}
        />
        <div
          style={{
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.82)",
            border: "2px solid rgba(255, 255, 255, 0.95)",
            borderRadius: "40px",
            boxShadow: "0 28px 70px rgba(88, 28, 135, 0.16)",
            display: "flex",
            gap: "48px",
            padding: "64px 76px",
            position: "relative",
            width: "1030px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              borderRadius: "32px",
              boxShadow: "0 18px 38px rgba(147, 51, 234, 0.25)",
              color: "white",
              display: "flex",
              fontSize: "76px",
              fontWeight: 800,
              height: "164px",
              justifyContent: "center",
              letterSpacing: "-5px",
              width: "164px",
            }}
          >
            CCA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#7e22ce",
                display: "flex",
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "5px",
                textTransform: "uppercase",
              }}
            >
              Codezela Career Accelerator
            </div>
            <div
              style={{
                color: "#1f2937",
                display: "flex",
                fontSize: "62px",
                fontWeight: 800,
                letterSpacing: "-2px",
                marginTop: "18px",
              }}
            >
              Certificate Verification
            </div>
            <div
              style={{
                color: "#4b5563",
                display: "flex",
                fontSize: "29px",
                marginTop: "18px",
              }}
            >
              Verify a certificate using its certificate ID.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
