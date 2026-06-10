import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";

export async function GET(request: NextRequest) {
  const adminRequest = requireAdminRequest(request);
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ title: "Brano in riproduzione" });
  }

  try {
    const cleanUrl = url.split("&")[0];
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
    );
    const data = await response.json();
    return NextResponse.json({ title: data.title || "Brano in riproduzione" });
  } catch {
    return NextResponse.json({ title: "Brano in riproduzione" });
  }
}
