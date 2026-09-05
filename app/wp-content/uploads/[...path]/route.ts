import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

const SEARCH_DIRS = [
  path.join(process.cwd(), "public", "wp-content", "uploads"),
  "/home/u421648830/backup_wordpress_tortugabay_2026/wp-content/uploads",
  "/home/u421648830/domains/app.tortugabay.it/public_html/wp-content/uploads",
  "/home/u421648830/domains/app.tortugabay.it/shared/live-tv-media/video",
];

const MIME_MAP: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await props.params;
  const relativePath = segments.join("/");

  // Prevent path traversal
  if (relativePath.includes("..") || !/^[a-zA-Z0-9/._-]+$/.test(relativePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let foundPath: string | null = null;
  for (const baseDir of SEARCH_DIRS) {
    const candidate = path.join(baseDir, relativePath);
    if (existsSync(candidate)) {
      foundPath = candidate;
      break;
    }
  }

  if (!foundPath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const stat = statSync(foundPath);
  const fileSize = stat.size;
  const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(foundPath, { start, end });
    const readable = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(readable, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const stream = createReadStream(foundPath);
  const readable = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
