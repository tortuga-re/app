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
import {
  parseFriendshipGroupReason,
  stripFriendshipGroupReason,
} from "@/lib/match-drink/friendship-groups";

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
      const friendshipGroup = parseFriendshipGroupReason(match.reason);
      const isRomanceFallbackGroup = friendshipGroup?.groupKind === "romance_recovery";
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
        answers,
        questions,
        session.secondaryTraitMode ?? "absolute",
        session.excludedMeetingTables ?? [],
      ).get(match.id);
      const sharedMainCategory =
        !friendshipGroup && ownProfile && matchedProfile
          ? getSharedMainCategory(ownProfile, matchedProfile)
          : null;
      const friendshipGroupMembers = friendshipGroup
        ? friendshipGroup.memberIds.map((memberId) => {
            const livePlayer = players.find((candidate) => candidate.id === memberId);
            const savedMember = friendshipGroup.members.find((candidate) => candidate.id === memberId);

            return {
              id: memberId,
              nickname: livePlayer?.nickname ?? savedMember?.nickname ?? "Pirata",
              avatarUrl: livePlayer?.avatarUrl ?? savedMember?.avatarUrl,
              tableNumber: livePlayer?.tableNumber ?? savedMember?.tableNumber,
            };
          })
        : undefined;

      enrichedMatch = {
        ...match,
        reason: friendshipGroup ? stripFriendshipGroupReason(match.reason) : match.reason,
        playerANickname: pA?.nickname,
        playerATable: pA?.tableNumber,
        playerAAvatar: pA?.avatarUrl,
        playerAPhone: pA?.phone,
        playerBNickname: pB?.nickname,
        playerBTable: pB?.tableNumber,
        playerBAvatar: pB?.avatarUrl,
        playerBPhone: pB?.phone,
        ownMainCategory: ownProfile?.mainCategory,
        ownMainCategoryLabel: ownProfile?.mainCategoryLabel,
        matchedPlayerNickname: friendshipGroup
          ? isRomanceFallbackGroup
            ? "la tua ciurma social"
            : "la tua ciurma friendship"
          : matchedPlayer?.nickname,
        matchedPlayerTable: friendshipGroup ? meetingAssignment?.tableNumber : matchedPlayer?.tableNumber,
        matchedPlayerPhone: friendshipGroup ? undefined : matchedPlayer?.phone,
        matchedPlayerMainCategory: friendshipGroup ? undefined : matchedProfile?.mainCategory,
        matchedPlayerMainCategoryLabel: friendshipGroup ? undefined : matchedProfile?.mainCategoryLabel,
        matchedPlayerSecondaryTrait: friendshipGroup ? undefined : matchedProfile?.secondaryTrait,
        matchedPlayerSecondaryTraitLabel: friendshipGroup
          ? isRomanceFallbackGroup
            ? "tavolo social"
            : "tavolo friendship"
          : matchedProfile?.secondaryTraitLabel,
        matchedPlayerApproachAdvice: friendshipGroup
          ? isRomanceFallbackGroup
            ? "Non forzare il flirt: presentati, brinda e usa il tavolo come occasione per rimettere la serata in movimento."
            : "Presentati con leggerezza, scegli un brindisi semplice e lascia che il gruppo faccia il resto."
          : matchedProfile
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
        rewardText: friendshipGroup
          ? isRomanceFallbackGroup
            ? `Raggiungi il tavolo social ${meetingAssignment?.tableLabel ?? ""}: il match romantico non è uscito, ma il brindisi della ciurma è salvo.`
            : `Raggiungi il tavolo friendship ${meetingAssignment?.tableLabel ?? ""} e sblocca il drink della ciurma.`
          : getMatchDrinkRewardText(
              sharedMainCategory,
              meetingAssignment?.tableLabel,
            ),
        isFriendshipGroup: !!friendshipGroup,
        isRomanceFallbackGroup,
        friendshipGroupId: friendshipGroup?.groupId,
        friendshipGroupKind: friendshipGroup?.groupKind,
        friendshipGroupSize: friendshipGroupMembers?.length,
        friendshipGroupMemberIds: friendshipGroup?.memberIds,
        friendshipGroupMembers,
      };
    }

    const participantCount = players.filter((candidate) => candidate.nickname !== "_SYSTEM_").length;
    const sessionWithQuestions = session ? { ...session, questions, participantCount } : null;

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
