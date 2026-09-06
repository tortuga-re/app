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
    try {
      const prodUrl = `https://app.tortugabay.it/live-tv-media/${kind}/${fileName}`;
      const prodRes = await fetch(prodUrl);
      if (prodRes.ok) {
        const fileBuffer = Buffer.from(await prodRes.arrayBuffer());
        const contentType = prodRes.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/jpeg");

        // Cache file to local disk
        import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
          const path = await import("node:path");
          const localDir = path.join(process.cwd(), "public", "live-tv-media", kind);
          await mkdir(localDir, { recursive: true });
          await writeFile(path.join(localDir, fileName), fileBuffer);
        }).catch(() => {});

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "Accept-Ranges": "bytes",
          },
        });
      }
    } catch (proxyErr) {
      console.warn("[live-tv-media proxy] Error:", proxyErr);
    }

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
