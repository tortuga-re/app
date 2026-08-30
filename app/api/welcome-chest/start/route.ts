import { NextRequest, NextResponse } from "next/server";
import { attachWelcomeChestStart, readWelcomeChestStart } from "@/lib/session/welcome-chest";
import { updateProfileContact } from "@/lib/cooperto/service";

export const dynamic = "force-dynamic";
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function GET(request: NextRequest) { return NextResponse.json({ start: readWelcomeChestStart(request) }); }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; firstName?: string; rewardTier?: "full" | "basic" } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const firstName = body?.firstName?.trim() ?? "";
  if (!emailOk(email) || !firstName) return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 400 });
  await updateProfileContact({ firstName, lastName: "", email, phone: "", birthDate: "", marketingConsent: true });
  const start = { email, firstName, rewardTier: body?.rewardTier === "basic" ? "basic" as const : "full" as const };
  return attachWelcomeChestStart(NextResponse.json({ start }), start);
}
