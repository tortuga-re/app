import { ImageResponse } from "next/og";

export const runtime = "edge";

const parseSize = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 192;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const dimension = parseSize(size);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at top, rgba(238, 198, 133, 0.36), transparent 40%), linear-gradient(180deg, #16110d 0%, #060606 100%)",
          color: "#f9f1e4",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "4px solid rgba(245, 212, 154, 0.25)",
            borderRadius: dimension * 0.24,
            display: "flex",
            height: dimension * 0.72,
            width: dimension * 0.72,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.3)",
            background:
              "linear-gradient(180deg, rgba(66, 51, 35, 0.9), rgba(17, 13, 10, 0.96))",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia",
              fontSize: dimension * 0.42,
              fontWeight: 700,
              letterSpacing: -dimension * 0.02,
              background: "linear-gradient(135deg, #fce7bf, #be8d4b 58%, #7f5d2e)",
              color: "transparent",
              backgroundClip: "text",
            }}
          >
            T
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: dimension * 0.16,
            fontSize: dimension * 0.085,
            letterSpacing: dimension * 0.02,
            textTransform: "uppercase",
            color: "#ebd2a3",
          }}
        >
          Tortuga Bay
        </div>
      </div>
    ),
    {
      width: dimension,
      height: dimension,
    },
  );
}

