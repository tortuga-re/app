import { getSupabaseAdmin } from "./supabase";
import {
  MatchDrinkAnswer,
  MatchDrinkBottleMessage,
  MatchDrinkMatch,
  MatchDrinkPlayer,
  MatchDrinkSession,
} from "./types";

const ADMIN_PIN = process.env.MATCH_DRINK_ADMIN_PIN || "0000";

export const validateAdminPin = (pin: string) => pin === ADMIN_PIN;

export const createSession = async (title: string): Promise<MatchDrinkSession> => {
  const admin = getSupabaseAdmin();
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await admin
    .from("match_drink_sessions")
    .insert({
      title,
      join_code: joinCode,
      status: "lobby",
      stage_mode: "lobby",
      current_question_index: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return mapSession(data);
};

export const getSession = async (id: string): Promise<MatchDrinkSession | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapSession(data);
};

export const getSessionByJoinCode = async (code: string): Promise<MatchDrinkSession | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_sessions")
    .select("*")
    .eq("join_code", code.toUpperCase())
    .single();

  if (error || !data) return null;
  return mapSession(data);
};

export const updateSessionStatus = async (
  id: string,
  status: MatchDrinkSession["status"]
) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("match_drink_sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

export const updateStageMode = async (
  id: string,
  stage_mode: MatchDrinkSession["stageMode"],
  current_stage_message_id?: string | null
) => {
  const admin = getSupabaseAdmin();
  const updateData: any = { stage_mode, updated_at: new Date().toISOString() };
  if (current_stage_message_id !== undefined) {
    updateData.current_stage_message_id = current_stage_message_id;
  }

  const { error } = await admin
    .from("match_drink_sessions")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;
};

export const updateQuestionIndex = async (id: string, index: number) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("match_drink_sessions")
    .update({ current_question_index: index, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

export const joinSession = async (
  player: Omit<MatchDrinkPlayer, "id" | "joinedAt">
): Promise<MatchDrinkPlayer> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_players")
    .insert({
      session_id: player.sessionId,
      nickname: player.nickname,
      table_number: player.tableNumber,
      age_range: player.ageRange,
      gender: player.gender,
      relationship_status: player.relationshipStatus,
      looking_for: player.lookingFor,
      public_consent: player.publicConsent,
    })
    .select()
    .single();

  if (error) throw error;
  return mapPlayer(data);
};

export const getPlayer = async (id: string): Promise<MatchDrinkPlayer | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_players")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapPlayer(data);
};

export const getPlayers = async (sessionId: string): Promise<MatchDrinkPlayer[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_players")
    .select("*")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapPlayer);
};

export const saveAnswer = async (
  answer: Omit<MatchDrinkAnswer, "id" | "createdAt">
): Promise<MatchDrinkAnswer> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_answers")
    .upsert({
      session_id: answer.sessionId,
      player_id: answer.playerId,
      question_id: answer.questionId,
      selected_option_id: answer.selectedOptionId,
    }, {
      onConflict: "session_id, player_id, question_id"
    })
    .select()
    .single();

  if (error) throw error;
  return mapAnswer(data);
};

export const getAnswers = async (sessionId: string): Promise<MatchDrinkAnswer[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_answers")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return (data || []).map(mapAnswer);
};

export const getPlayerAnswers = async (
  sessionId: string,
  playerId: string
): Promise<MatchDrinkAnswer[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  if (error) throw error;
  return (data || []).map(mapAnswer);
};

export const createBottleMessage = async (
  message: Omit<MatchDrinkBottleMessage, "id" | "status" | "createdAt">
): Promise<MatchDrinkBottleMessage> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_bottle_messages")
    .insert({
      session_id: message.sessionId,
      player_id: message.playerId,
      message: message.message,
      display_mode: message.displayMode,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return mapMessage(data);
};

export const getMessages = async (
  sessionId: string
): Promise<MatchDrinkBottleMessage[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_bottle_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapMessage);
};

export const moderateMessage = async (
  messageId: string,
  status: MatchDrinkBottleMessage["status"],
  approvedText?: string
) => {
  const admin = getSupabaseAdmin();
  const updateData: any = { status, moderated_at: new Date().toISOString() };
  if (approvedText) updateData.approved_text = approvedText;

  const { error } = await admin
    .from("match_drink_bottle_messages")
    .update(updateData)
    .eq("id", messageId);

  if (error) throw error;
};

export const getMatches = async (sessionId: string): Promise<MatchDrinkMatch[]> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_matches")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return (data || []).map(mapMatch);
};

export const getPlayerMatch = async (
  sessionId: string,
  playerId: string
): Promise<MatchDrinkMatch | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_matches")
    .select("*")
    .eq("session_id", sessionId)
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMatch(data) : null;
};

export const acceptMatch = async (
  matchId: string,
  playerId: string,
  accepted: boolean
) => {
  const admin = getSupabaseAdmin();
  const match = await admin
    .from("match_drink_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (match.error || !match.data) throw new Error("Match not found");

  const isPlayerA = match.data.player_a_id === playerId;
  const updateData: any = {};
  
  if (isPlayerA) {
    updateData.accepted_by_a = accepted;
    updateData.accepted_at_a = accepted ? new Date().toISOString() : null;
  } else {
    updateData.accepted_by_b = accepted;
    updateData.accepted_at_b = accepted ? new Date().toISOString() : null;
  }

  // Se entrambi hanno accettato, sblocca il drink
  const bothAccepted = 
    (isPlayerA ? accepted : match.data.accepted_by_a) && 
    (!isPlayerA ? accepted : match.data.accepted_by_b);

  if (bothAccepted) {
    updateData.drink_unlocked = true;
    updateData.drink_code = `MATCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  const { error } = await admin
    .from("match_drink_matches")
    .update(updateData)
    .eq("id", matchId);

  if (error) throw error;
};

export const redeemDrink = async (matchId: string) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("match_drink_matches")
    .update({
      drink_redeemed: true,
      drink_redeemed_at: new Date().toISOString()
    })
    .eq("id", matchId);

  if (error) throw error;
};

export const deleteSessionData = async (sessionId: string) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("match_drink_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw error;
};

export const storeMatches = async (matches: Omit<MatchDrinkMatch, "id" | "createdAt">[]) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("match_drink_matches")
    .insert(matches.map(m => ({
      session_id: m.sessionId,
      player_a_id: m.playerAId,
      player_b_id: m.playerBId,
      score: m.score,
      match_type: m.matchType,
      label: m.label,
      common_criterion: m.commonCriterion,
      reason: m.reason,
      drink_unlocked: false,
    })));

  if (error) throw error;
};

// Mappers
const mapSession = (row: any): MatchDrinkSession => ({
  id: row.id,
  joinCode: row.join_code,
  title: row.title,
  status: row.status,
  stageMode: row.stage_mode,
  currentQuestionIndex: row.current_question_index,
  currentStageMessageId: row.current_stage_message_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPlayer = (row: any): MatchDrinkPlayer => ({
  id: row.id,
  sessionId: row.session_id,
  nickname: row.nickname,
  tableNumber: row.table_number,
  ageRange: row.age_range,
  gender: row.gender,
  relationshipStatus: row.relationship_status,
  lookingFor: row.looking_for,
  publicConsent: row.public_consent,
  joinedAt: row.joined_at,
});

const mapAnswer = (row: any): MatchDrinkAnswer => ({
  id: row.id,
  sessionId: row.session_id,
  playerId: row.player_id,
  questionId: row.question_id,
  selectedOptionId: row.selected_option_id,
  createdAt: row.created_at,
});

const mapMatch = (row: any): MatchDrinkMatch => ({
  id: row.id,
  sessionId: row.session_id,
  playerAId: row.player_a_id,
  playerBId: row.player_b_id,
  score: row.score,
  matchType: row.match_type,
  label: row.label,
  commonCriterion: row.common_criterion,
  reason: row.reason,
  acceptedByA: row.accepted_by_a,
  acceptedByB: row.accepted_by_b,
  acceptedAtA: row.accepted_at_a,
  acceptedAtB: row.accepted_at_b,
  drinkUnlocked: row.drink_unlocked,
  drinkRedeemed: row.drink_redeemed,
  drinkRedeemedAt: row.drink_redeemed_at,
  drinkCode: row.drink_code,
  createdAt: row.created_at,
});

const mapMessage = (row: any): MatchDrinkBottleMessage => ({
  id: row.id,
  sessionId: row.session_id,
  playerId: row.player_id,
  message: row.message,
  displayMode: row.display_mode,
  status: row.status,
  approvedText: row.approved_text,
  createdAt: row.created_at,
  moderatedAt: row.moderated_at,
  shownAt: row.shown_at,
});
