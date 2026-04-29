import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { base64 } = await req.json();

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
    const fileName = `${uuidv4()}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    // Salva file
    fs.writeFileSync(filePath, buffer);

    // Ritorna URL pubblico
    const publicUrl = `/match-drink-avatars/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Errore durante il caricamento dell'avatar" }, { status: 500 });
  }
}
