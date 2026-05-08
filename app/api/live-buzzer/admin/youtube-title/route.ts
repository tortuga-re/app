import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ title: "Brano in riproduzione" });
  }

  try {
    const cleanUrl = url.split('&')[0];
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`);
    const data = await res.json();
    return NextResponse.json({ title: data.title || "Brano in riproduzione" });
  } catch (err) {
    return NextResponse.json({ title: "Brano in riproduzione" });
  }
}
