import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { findLiveTvMediaFilePath } from "@/lib/live-tv/media-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = Promise<{
  kind: string;
  fileName: string;
}>;

const contentTypes: Record<string, string> = {
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mov: "video/quicktime",
  mp4: "video/mp4",
  ogv: "video/ogg",
  png: "image/png",
  webm: "video/webm",
  webp: "image/webp",
};

const getContentType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return contentTypes[extension] ?? "application/octet-stream";
};

const parseRangeHeader = (rangeHeader: string | null, fileSize: number) => {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    return "invalid" as const;
  }

  const [, rawStart, rawEnd] = match;
  const hasStart = rawStart !== "";
  const hasEnd = rawEnd !== "";

  if (!hasStart && !hasEnd) {
    return "invalid" as const;
  }

  let start = hasStart ? Number(rawStart) : fileSize - Number(rawEnd);
  let end = hasEnd ? Number(rawEnd) : fileSize - 1;

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return "invalid" as const;
  }

  start = Math.max(0, start);
  end = Math.min(fileSize - 1, end);

  if (start > end || start >= fileSize) {
    return "invalid" as const;
  }

  return { start, end };
};

const createMediaResponse = async (
  request: NextRequest,
  params: RouteParams,
  method: "GET" | "HEAD",
) => {
  const { kind, fileName } = await params;

  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "Tipo media non valido." }, { status: 404 });
  }

  const filePath = await findLiveTvMediaFilePath(kind, fileName);

  if (!filePath) {
    return NextResponse.json({ error: "File media non trovato." }, { status: 404 });
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    return NextResponse.json({ error: "File media non trovato." }, { status: 404 });
  }

  const range = parseRangeHeader(request.headers.get("range"), fileStats.size);
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": getContentType(fileName),
  };

  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${fileStats.size}`,
      },
    });
  }

  if (range) {
    const contentLength = range.end - range.start + 1;
    const stream =
      method === "HEAD"
        ? null
        : Readable.toWeb(createReadStream(filePath, range)) as ReadableStream;

    return new Response(stream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(contentLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${fileStats.size}`,
      },
    });
  }

  const stream =
    method === "HEAD"
      ? null
      : Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(fileStats.size),
    },
  });
};

export const GET = (
  request: NextRequest,
  { params }: { params: RouteParams },
) => createMediaResponse(request, params, "GET");

export const HEAD = (
  request: NextRequest,
  { params }: { params: RouteParams },
) => createMediaResponse(request, params, "HEAD");
