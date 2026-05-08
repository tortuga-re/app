import { NextRequest, NextResponse } from "next/server";
import { kickTeam } from "@/lib/live-buzzer/store";

export async function POST(request: NextRequest) {
  if (false) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    kickTeam(email);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
