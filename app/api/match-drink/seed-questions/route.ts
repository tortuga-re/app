import { NextRequest, NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { seedQuestions } from "@/lib/match-drink/storage";
import { NEW_QUESTION_BANK } from "@/lib/match-drink/new-question-bank";
import { MatchDrinkQuestion } from "@/lib/match-drink/types";

export async function POST(req: NextRequest) {
  try {
    const adminRequest = requireAdminRequest(req, "captain");
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    await seedQuestions(NEW_QUESTION_BANK as MatchDrinkQuestion[]);

    return NextResponse.json({ ok: true, count: NEW_QUESTION_BANK.length });
  } catch (error) {
    console.error("Error seeding questions:", error);
    return NextResponse.json({ error: "Errore durante il seeding" }, { status: 500 });
  }
}
