import type { MatchDrinkPlayer } from "./types";

export const FRIENDSHIP_GROUP_MARKER = "|FRIENDSHIP_GROUP|";

export type MatchDrinkFriendshipGroupMember = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  tableNumber?: string;
};

export type MatchDrinkFriendshipGroupMetadata = {
  groupId: string;
  memberIds: string[];
  members: MatchDrinkFriendshipGroupMember[];
};

export const buildFriendshipGroupMetadata = (
  groupId: string,
  members: MatchDrinkPlayer[],
): MatchDrinkFriendshipGroupMetadata => ({
  groupId,
  memberIds: members.map((member) => member.id),
  members: members.map((member) => ({
    id: member.id,
    nickname: member.nickname,
    avatarUrl: member.avatarUrl,
    tableNumber: member.tableNumber,
  })),
});

export const encodeFriendshipGroupReason = (
  reason: string,
  metadata: MatchDrinkFriendshipGroupMetadata,
) => `${reason}${FRIENDSHIP_GROUP_MARKER}${encodeURIComponent(JSON.stringify(metadata))}`;

export const parseFriendshipGroupReason = (
  reason?: string | null,
): MatchDrinkFriendshipGroupMetadata | null => {
  if (!reason?.includes(FRIENDSHIP_GROUP_MARKER)) {
    return null;
  }

  const encoded = reason.split(FRIENDSHIP_GROUP_MARKER)[1];
  if (!encoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<MatchDrinkFriendshipGroupMetadata>;
    const members = Array.isArray(parsed.members)
      ? parsed.members.filter((member): member is MatchDrinkFriendshipGroupMember =>
          typeof member?.id === "string" && typeof member.nickname === "string",
        )
      : [];
    const memberIds = Array.isArray(parsed.memberIds)
      ? parsed.memberIds.filter((memberId): memberId is string => typeof memberId === "string")
      : members.map((member) => member.id);

    if (typeof parsed.groupId !== "string" || memberIds.length === 0) {
      return null;
    }

    return {
      groupId: parsed.groupId,
      memberIds,
      members,
    };
  } catch {
    return null;
  }
};

export const stripFriendshipGroupReason = (reason: string) =>
  reason.includes(FRIENDSHIP_GROUP_MARKER)
    ? reason.split(FRIENDSHIP_GROUP_MARKER)[0]
    : reason;
