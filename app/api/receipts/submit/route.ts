import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { submitReceiptRequest } from "@/lib/receipts/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File;
    const amountStr = formData.get("amount") as string;
    const rawEmail = formData.get("email") as string;
    const email = rawEmail?.trim().toLowerCase();
    const customerCode = formData.get("customerCode") as string;

    if (!photo || !amountStr || !email) {
      return NextResponse.json({ error: "Dati mancanti (foto, importo o email)." }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Importo non valido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // 1. Caricamento su Storage
    const fileExt = photo.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, photo);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Errore durante il caricamento della foto." }, { status: 500 });
    }

    // Otteniamo l'URL pubblico (o il path da usare con il client)
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    // 2. Salvataggio su Database
    const receiptRequest = await submitReceiptRequest({
      user_email: email,
      customer_code: customerCode || undefined,
      amount: amount,
      image_url: publicUrl
    });

    return NextResponse.json({ 
      success: true, 
      id: receiptRequest.id,
      message: "Scontrino inviato con successo! Lo verificheremo al più presto." 
    });

  } catch (error) {
    console.error("Receipt submission error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Errore interno durante l'invio." 
    }, { status: 500 });
  }
}
