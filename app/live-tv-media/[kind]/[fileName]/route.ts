import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { findLiveTvMediaFilePath } from "@/lib/live-tv/media-storage";

export async function GET(
  _request: Request,
  props: { params: Promise<{ kind: string; fileName: string }> }
) {
  const { kind, fileName } = await props.params;

  if (kind !== "image" && kind !== "video") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filePath = await findLiveTvMediaFilePath(
    kind as "image" | "video",
    fileName
  );

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeType =
      ext === "webp"
        ? "image/webp"
        : ext === "png"
        ? "image/png"
        : ext === "gif"
        ? "image/gif"
        : ext === "mp4"
        ? "video/mp4"
        : ext === "webm"
        ? "video/webm"
        : "image/jpeg";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
