import { NextRequest, NextResponse } from "next/server";
import { getCustomerAvatar } from "@/lib/profile/avatar-service";
import { getSession, joinSession } from "@/lib/match-drink/storage";
import { normalizeItalianPhone } from "@/lib/validation/phone";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    if (session.status !== "lobby") {
      return NextResponse.json({ error: "Le iscrizioni per questa sfida sono chiuse." }, { status: 403 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const resolvedAvatarUrl =
      typeof body.avatarUrl === "string" && body.avatarUrl.trim()
        ? body.avatarUrl.trim()
        : email
          ? await getCustomerAvatar(email).catch(() => null)
          : null;
    const resolvedPhone =
      typeof body.phone === "string"
        ? normalizeItalianPhone(body.phone)?.normalizedE164 ?? ""
        : "";

    const player = await joinSession({
      sessionId: id,
      nickname: body.nickname,
      tableNumber: body.tableNumber,
      phone: resolvedPhone || undefined,
      ageRange: body.ageRange,
      gender: body.gender,
      relationshipStatus: body.relationshipStatus,
      lookingFor: body.lookingFor,
      avatarUrl: resolvedAvatarUrl || undefined,
      publicConsent: body.publicConsent ?? false,
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
