import { NextRequest, NextResponse } from "next/server";
import { seedQuestions, validateAdminPin } from "@/lib/match-drink/storage";
import { QUESTION_BANK } from "@/lib/match-drink/question-bank";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    if (!validateAdminPin(pin || "")) {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }

    await seedQuestions(QUESTION_BANK);

    return NextResponse.json({ ok: true, count: QUESTION_BANK.length });
  } catch (error) {
    console.error("Error seeding questions:", error);
    return NextResponse.json({ error: "Errore durante il seeding" }, { status: 500 });
  }
}
