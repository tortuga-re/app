import { NextRequest, NextResponse } from "next/server";
import { getSerataLiveState, saveSerataLiveState } from "@/lib/server/serata-live";
import { getRankIndex, tortugaRanks } from "@/lib/loyalty-ranks";
import type { CiurmaMinRank } from "@/lib/serata-live/types";

export const dynamic = "force-dynamic";

const minRankMap: Record<CiurmaMinRank, number> = {
  tutti: -1,
  bucaniere: 0, // primo rango
  corsaro: 1,
  capitano: 2,
  leggenda: 3,
};

export async function GET() {
  try {
    const state = await getSerataLiveState();
    const activeSurvey = state.surveys?.find((s) => s.enabled) ?? state.survey;
    return NextResponse.json({ success: true, survey: activeSurvey });
  } catch (error) {
    return NextResponse.json({ error: "Impossibile recuperare sondaggio." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { optionId, userIdentifier, userVisits = 0, userPoints = 0 } = body;

    if (!optionId || !userIdentifier) {
      return NextResponse.json({ error: "Opzione e identificativo utente richiesti." }, { status: 400 });
    }

    const state = await getSerataLiveState();
    const activeSurvey = state.surveys?.find((s) => s.enabled) ?? state.survey;

    if (!activeSurvey.enabled) {
      return NextResponse.json({ error: "Nessun sondaggio attivo al momento." }, { status: 403 });
    }

    // Verifica rango minimo per il voto
    const requiredMinRankIndex = minRankMap[activeSurvey.minRank ?? "tutti"];
    if (requiredMinRankIndex >= 0) {
      // Determina indice del rango attuale dell'utente
      let userRankIndex = -1;
      for (let i = tortugaRanks.length - 1; i >= 0; i--) {
        if (userVisits >= tortugaRanks[i].visits && userPoints >= tortugaRanks[i].points) {
          userRankIndex = i;
          break;
        }
      }
      if (userRankIndex < requiredMinRankIndex) {
        const requiredRankLabel = tortugaRanks[requiredMinRankIndex]?.label ?? activeSurvey.minRank;
        return NextResponse.json(
          { error: `Questo sondaggio è riservato ai pirati con rango ${requiredRankLabel} o superiore.` },
          { status: 403 }
        );
      }
    }

    const userId = String(userIdentifier).toLowerCase().trim();

    // Rimuovi l'utente da TUTTE le opzioni per prevenire voti doppi o multipli
    const cleanedOptions = activeSurvey.options.map((opt) => ({
      ...opt,
      voterIds: opt.voterIds.filter((v) => v.toLowerCase().trim() !== userId),
    }));

    const targetOption = activeSurvey.options.find((o) => o.id === optionId);
    const wasAlreadyVoted = targetOption?.voterIds.some((v) => v.toLowerCase().trim() === userId);

    const updatedOptions = cleanedOptions.map((opt) => {
      let nextVoters = opt.voterIds;
      if (opt.id === optionId && !wasAlreadyVoted) {
        nextVoters = [...nextVoters, userId];
      }
      return {
        ...opt,
        voterIds: nextVoters,
        votesCount: nextVoters.length,
      };
    });

    const updatedActiveSurvey = {
      ...activeSurvey,
      options: updatedOptions,
    };

    const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [activeSurvey];
    const updatedSurveys = currentSurveys.map((s) => (s.id === activeSurvey.id ? updatedActiveSurvey : s));

    const nextState = {
      ...state,
      survey: updatedActiveSurvey,
      surveys: updatedSurveys,
    };

    await saveSerataLiveState(nextState);
    return NextResponse.json({ success: true, survey: updatedActiveSurvey });
  } catch (error) {
    return NextResponse.json({ error: "Errore durante la registrazione del voto." }, { status: 500 });
  }
}
