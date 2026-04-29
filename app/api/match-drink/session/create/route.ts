import { NextRequest, NextResponse } from "next/server";
import { createSession, validateAdminPin } from "@/lib/match-drink/storage";

export async function POST(req: NextRequest) {
  try {
    const { title, pin } = await req.json();

    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    if (!title) {
      return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
    }

    const session = await createSession(title);
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
