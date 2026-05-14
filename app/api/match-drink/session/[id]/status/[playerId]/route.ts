import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { 
  getMatches,
  getPlayers,
  getPlayer, 
  getPlayerAnswers, 
  getPlayerMatch, 
  getSession,
  getSessionQuestions
} from "@/lib/match-drink/storage";
import { assignMatchDrinkMeetingTables } from "@/lib/match-drink/meeting-tables";
import { calculatePlayerProfile } from "@/lib/match-drink/scoring";
import {
  getApproachAdviceForTrait,
  getMainCategoryPluralLabel,
  getMatchDrinkRewardText,
  getSharedMainCategory,
} from "@/lib/match-drink/profile";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;

    const [session, players, player, answers, match, matches, questions] = await Promise.all([
      getSession(id),
      getPlayers(id),
      getPlayer(playerId),
      getPlayerAnswers(id, playerId),
      getPlayerMatch(id, playerId),
      getMatches(id),
      getSessionQuestions(id),
    ]);

    if (!session || !player || player.sessionId !== id) {
      return NextResponse.json({ error: "Invalid context" }, { status: 404 });
    }

    let enrichedMatch = match;
    if (match) {
      const [pA, pB] = await Promise.all([
        getPlayer(match.playerAId),
        getPlayer(match.playerBId),
      ]);

      const currentPlayerIsA = match.playerAId === player.id;
      const matchedPlayer = currentPlayerIsA ? pB : pA;

      const [answersA, answersB] = await Promise.all([
        getPlayerAnswers(id, match.playerAId),
        getPlayerAnswers(id, match.playerBId),
      ]);

      const profileA = pA ? calculatePlayerProfile(pA, answersA, questions) : null;
      const profileB = pB ? calculatePlayerProfile(pB, answersB, questions) : null;
      const ownProfile = currentPlayerIsA ? profileA : profileB;
      const matchedProfile = currentPlayerIsA ? profileB : profileA;
      const meetingAssignment = assignMatchDrinkMeetingTables(
        matches,
        players,
        session.excludedMeetingTables ?? [],
      ).get(match.id);
      const sharedMainCategory =
        ownProfile && matchedProfile
          ? getSharedMainCategory(ownProfile, matchedProfile)
          : null;

      enrichedMatch = {
        ...match,
        playerANickname: pA?.nickname,
        playerATable: pA?.tableNumber,
        playerAAvatar: pA?.avatarUrl,
        playerBNickname: pB?.nickname,
        playerBTable: pB?.tableNumber,
        playerBAvatar: pB?.avatarUrl,
        ownMainCategory: ownProfile?.mainCategory,
        ownMainCategoryLabel: ownProfile?.mainCategoryLabel,
        matchedPlayerNickname: matchedPlayer?.nickname,
        matchedPlayerTable: matchedPlayer?.tableNumber,
        matchedPlayerMainCategory: matchedProfile?.mainCategory,
        matchedPlayerMainCategoryLabel: matchedProfile?.mainCategoryLabel,
        matchedPlayerSecondaryTrait: matchedProfile?.secondaryTrait,
        matchedPlayerSecondaryTraitLabel: matchedProfile?.secondaryTraitLabel,
        matchedPlayerApproachAdvice: matchedProfile
          ? getApproachAdviceForTrait(
              matchedProfile.secondaryTrait,
              matchedPlayer?.gender,
            )
          : undefined,
        meetingTableNumber: meetingAssignment?.tableNumber,
        meetingTableArea: meetingAssignment?.tableArea,
        meetingTableLabel: meetingAssignment?.tableLabel,
        sharedMainCategory,
        sharedMainCategoryLabel: sharedMainCategory
          ? getMainCategoryPluralLabel(sharedMainCategory)
          : null,
        rewardText: getMatchDrinkRewardText(
          sharedMainCategory,
          meetingAssignment?.tableLabel,
        ),
      };
    }

    const sessionWithQuestions = session ? { ...session, questions } : null;

    return NextResponse.json({
      session: sessionWithQuestions,
      player,
      answers,
      match: enrichedMatch,
    });
  } catch (error) {
    console.error("Error getting status:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
