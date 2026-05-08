import { NextResponse } from "next/server";
import { activateBuzzer } from "@/lib/live-buzzer/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    activateBuzzer();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to activate" }, { status: 500 });
  }
}
