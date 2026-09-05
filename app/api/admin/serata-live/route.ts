import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/server-auth";
import { getSerataLiveState, saveSerataLiveState } from "@/lib/server/serata-live";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const state = await getSerataLiveState();
    return NextResponse.json({ success: true, state });
  } catch (error) {
    return NextResponse.json({ error: "Impossibile recuperare lo stato Serata Live." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const currentState = await getSerataLiveState();

    let nextState = { ...currentState };

    if (body.action === "updateSongVoting") {
      nextState.songVoting = {
        ...nextState.songVoting,
        ...body.songVoting,
      };
    } else if (body.action === "updateSurvey") {
      nextState.survey = {
        ...nextState.survey,
        ...body.survey,
      };
    } else if (body.action === "resetSongVotes") {
      nextState.songVoting.songs = nextState.songVoting.songs.map((song) => ({
        ...song,
        votesCount: 0,
        voterIds: [],
      }));
    } else if (body.action === "resetSurveyVotes") {
      nextState.survey.options = nextState.survey.options.map((opt) => ({
        ...opt,
        votesCount: 0,
        voterIds: [],
      }));
    } else if (body.action === "saveAll") {
      if (body.state) {
        nextState = body.state;
      }
    }

    await saveSerataLiveState(nextState);
    return NextResponse.json({ success: true, state: nextState });
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'aggiornamento della Serata Live." }, { status: 500 });
  }
}
