import { NextRequest, NextResponse } from "next/server";
import { getSerataLiveState, saveSerataLiveState } from "@/lib/server/serata-live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getSerataLiveState();
    return NextResponse.json({ success: true, songVoting: state.songVoting });
  } catch (error) {
    return NextResponse.json({ error: "Impossibile recuperare votazione canzoni." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songId, userIdentifier } = body;

    if (!songId || !userIdentifier) {
      return NextResponse.json({ error: "Identificativo brano e utente richiesti." }, { status: 400 });
    }

    const state = await getSerataLiveState();
    if (!state.songVoting.enabled) {
      return NextResponse.json({ error: "La votazione delle canzoni non è attiva al momento." }, { status: 403 });
    }

    const userId = String(userIdentifier).toLowerCase().trim();
    const maxVotes = state.songVoting.maxVotesPerUser ?? 5;

    // Trova le canzoni attualmente votate da questo utente
    const currentVotedSongIds = state.songVoting.songs
      .filter((s) => s.voterIds.some((v) => v.toLowerCase().trim() === userId))
      .map((s) => s.id);

    const isAlreadyVoted = currentVotedSongIds.includes(songId);

    // Se sta cercando di aggiungere un altro brano ma ha già raggiunto il limite max (5)
    if (!isAlreadyVoted && currentVotedSongIds.length >= maxVotes) {
      return NextResponse.json(
        { error: `Hai già selezionato il limite massimo di ${maxVotes} canzoni. Deseleziona un brano prima di aggiungerne un altro.` },
        { status: 400 }
      );
    }

    const updatedSongs = state.songVoting.songs.map((song) => {
      const isTarget = song.id === songId;
      const cleanVoters = song.voterIds.filter((v) => v.toLowerCase().trim() !== userId);

      let nextVoters = cleanVoters;
      if (isTarget) {
        if (isAlreadyVoted) {
          // Deseleziona
          nextVoters = cleanVoters;
        } else {
          // Seleziona
          nextVoters = [...cleanVoters, userId];
        }
      } else {
        // Mantieni i voti precedenti dell'utente sugli altri brani
        if (currentVotedSongIds.includes(song.id)) {
          nextVoters = [...cleanVoters, userId];
        }
      }

      return {
        ...song,
        voterIds: nextVoters,
        votesCount: nextVoters.length,
      };
    });

    const nextState = {
      ...state,
      songVoting: {
        ...state.songVoting,
        songs: updatedSongs,
      },
    };

    await saveSerataLiveState(nextState);
    return NextResponse.json({ success: true, songVoting: nextState.songVoting });
  } catch (error) {
    return NextResponse.json({ error: "Errore durante la registrazione del voto." }, { status: 500 });
  }
}
