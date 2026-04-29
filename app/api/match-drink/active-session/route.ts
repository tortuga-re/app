import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/match-drink/storage";

export async function GET() {
  try {
    const session = await getActiveSession();
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching active session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
