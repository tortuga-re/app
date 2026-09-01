import crypto from "crypto";
import fs from "fs";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { base64, email } = await request.json();
    if (!base64) return NextResponse.json({ error: "Nessuna immagine fornita" }, { status: 400 });

    const buffer = Buffer.from(String(base64).replace(/^data:image\/\w+;base64,/, ""), "base64");
    const uploadDir = path.join(process.cwd(), "public", "pirate-avatars");
    fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${crypto.randomUUID()}.jpg`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    const url = `/pirate-avatars/${fileName}`;

    if (email) {
      const { saveCustomerAvatar } = await import("@/lib/profile/avatar-service");
      await saveCustomerAvatar(email, url).catch(() => undefined);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Pirate avatar upload error:", error);
    return NextResponse.json({ error: "Errore durante il caricamento dell'avatar" }, { status: 500 });
  }
}
