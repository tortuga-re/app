import type { MatchDrinkBottleMessage } from "./types";

export type MatchDrinkMessageModeratedPayload = {
  message?: MatchDrinkBottleMessage;
  messageId?: string;
  status?: MatchDrinkBottleMessage["status"];
  approvedText?: string | null;
  moderatedAt?: string | null;
};

const messageActivityTime = (message: MatchDrinkBottleMessage) => {
  const value = message.moderatedAt || message.shownAt || message.createdAt;
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
};

const sortMessages = (messages: MatchDrinkBottleMessage[]) =>
  [...messages].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

const preferIncomingMessage = (
  current: MatchDrinkBottleMessage | undefined,
  incoming: MatchDrinkBottleMessage
) => {
  if (!current) return incoming;
  return messageActivityTime(incoming) >= messageActivityTime(current) ? incoming : current;
};

export const mergeMessages = (
  current: MatchDrinkBottleMessage[],
  incoming: MatchDrinkBottleMessage[]
) => {
  const byId = new Map(current.map(message => [message.id, message]));

  incoming.forEach(message => {
    byId.set(message.id, preferIncomingMessage(byId.get(message.id), message));
  });

  return sortMessages([...byId.values()]);
};

export const upsertMessage = (
  current: MatchDrinkBottleMessage[],
  incoming: MatchDrinkBottleMessage
) => mergeMessages(current, [incoming]);

export const applyModeratedMessage = (
  current: MatchDrinkBottleMessage[],
  payload: MatchDrinkMessageModeratedPayload
) => {
  if (payload.message) {
    return upsertMessage(current, payload.message);
  }

  const { messageId, status } = payload;
  if (!messageId || !status) return current;

  let found = false;
  const updated = current.map(message => {
    if (message.id !== messageId) return message;
    found = true;
    return {
      ...message,
      status,
      approvedText: payload.approvedText === undefined ? message.approvedText : payload.approvedText,
      moderatedAt: payload.moderatedAt === undefined ? message.moderatedAt : payload.moderatedAt,
    };
  });

  return found ? sortMessages(updated) : current;
};
