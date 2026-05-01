import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, email } = body;

    if (!base64) {
      return NextResponse.json({ error: "Nessuna immagine fornita" }, { status: 400 });
    }

    // Rimuovi prefisso base64 se presente (es. data:image/jpeg;base64,)
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Crea cartella se non esiste
    const uploadDir = path.join(process.cwd(), "public", "match-drink-avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Genera nome file unico
    const fileName = `${crypto.randomUUID()}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    // Salva file
    fs.writeFileSync(filePath, buffer);

    // Ritorna URL pubblico
    const publicUrl = `/match-drink-avatars/${fileName}`;

    // Se viene fornita un'email, salviamo l'associazione su Supabase per la persistenza
    if (email) {
      const { saveCustomerAvatar } = await import("@/lib/profile/avatar-service");
      await saveCustomerAvatar(email, publicUrl).catch((err) => {
        console.error("Failed to persist avatar mapping:", err);
      });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Errore durante il caricamento dell'avatar" }, { status: 500 });
  }
}
