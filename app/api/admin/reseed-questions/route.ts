import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSupabaseAdmin } from "@/lib/match-drink/supabase";
import { NEW_QUESTION_BANK } from "@/lib/match-drink/new-question-bank";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminRequest = requireAdminRequest(req, "captain");
  if (!adminRequest.ok) {
    return adminRequest.response;
  }

  try {
    const admin = getSupabaseAdmin();

    // 1. Pulizia totale della tabella domande
    // Nota: Usiamo una condizione dummy per cancellare tutto se non ci sono filtri
    const { error: deleteError } = await admin
      .from("match_drink_questions")
      .delete()
      .neq("category", "placeholder_niche");

    if (deleteError) throw deleteError;

    // 2. Inserimento del nuovo set pulito
    const { error: insertError } = await admin
      .from("match_drink_questions")
      .insert(NEW_QUESTION_BANK.map(q => ({
        category: q.category,
        text: q.text,
        options: q.options
      })));

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: "Database ripulito e ricaricato con 50 nuove domande uniche!",
      count: NEW_QUESTION_BANK.length 
    });
  } catch (error) {
    console.error("Reseed Error:", error);
    return NextResponse.json({ 
      error: "Errore durante il reset del database.",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
