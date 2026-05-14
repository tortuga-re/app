import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { requireAdminRequest } from "@/lib/admin/server-auth";
import { 
  getAnswers,
  getSessionExcludedMeetingTables,
  getMatches,
  getMessages,
  getPlayers, 
  getSession, 
  getSessionQuestions
} from "@/lib/match-drink/storage";
import {
  assignMatchDrinkMeetingTables,
  forecastMatchDrinkPairs,
  getMatchDrinkMeetingTableOptions,
} from "@/lib/match-drink/meeting-tables";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRequest = requireAdminRequest(req);
    if (!adminRequest.ok) {
      return adminRequest.response;
    }

    const [session, players, answers, matches, messages, questions, excludedMeetingTables] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getAnswers(id),
      getMatches(id),
      getMessages(id),
      getSessionQuestions(id),
      getSessionExcludedMeetingTables(id),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }

    session.questions = questions;
    session.excludedMeetingTables = excludedMeetingTables;

    const meetingAssignments = assignMatchDrinkMeetingTables(matches, players, excludedMeetingTables);
    const enrichedMatches = matches.map((match) => {
      const meetingAssignment = meetingAssignments.get(match.id);

      return {
        ...match,
        meetingTableNumber: meetingAssignment?.tableNumber,
        meetingTableArea: meetingAssignment?.tableArea,
        meetingTableLabel: meetingAssignment?.tableLabel,
      };
    });

    return NextResponse.json({
      session,
      players,
      answers,
      matches: enrichedMatches,
      messages,
      forecast: forecastMatchDrinkPairs(players, excludedMeetingTables),
      meetingTableOptions: getMatchDrinkMeetingTableOptions(),
    });
  } catch (error) {
    console.error("Error getting admin status:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
