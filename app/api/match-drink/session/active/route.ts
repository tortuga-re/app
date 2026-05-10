import { NextResponse } from "next/server";
import { getActiveSession } from "@/lib/match-drink/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getActiveSession();
    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error getting active session:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
