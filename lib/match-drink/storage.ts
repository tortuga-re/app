import { getSupabaseAdmin } from "./supabase";
import {
  MatchDrinkAnswer,
  MatchDrinkBottleMessage,
  MatchDrinkMatch,
  MatchDrinkPlayer,
  MatchDrinkSession,
  MatchDrinkQuestion,
} from "./types";

const ADMIN_PIN = process.env.MATCH_DRINK_ADMIN_PIN || "2809";

export const validateAdminPin = (pin: string) => pin === ADMIN_PIN;

export const createSession = async (title: string): Promise<MatchDrinkSession> => {
  const admin = getSupabaseAdmin();
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Pesca 20 domande casuali suddivise per categoria
  const { data: qLight } = await admin.from("match_drink_questions").select("id").eq("category", "light");
  const { data: qIronic } = await admin.from("match_drink_questions").select("id").eq("category", "ironic");
  const { data: qSpicy } = await admin.from("match_drink_questions").select("id").eq("category", "spicy");

  const shuffle = <T>(array: T[]): T[] => array?.sort(() => Math.random() - 0.5) || [];
  
  const selectedIds = [
    ...shuffle(qLight || []).slice(0, 6).map((q) => q.id),
    ...shuffle(qIronic || []).slice(0, 7).map((q) => q.id),
    ...shuffle(qSpicy || []).slice(0, 7).map((q) => q.id)
  ];

  const { data, error } = await admin
    .from("match_drink_sessions")
    .insert({
      title,
      join_code: joinCode,
      status: "lobby",
      stage_mode: "intro",
      current_question_index: 0,
      question_ids: selectedIds
    })
    .select()
    .single();

  if (error) throw error;
  
  // Create a hidden system player for technical reasons (messages/countdown)
  await admin.from("match_drink_players").insert({
    session_id: data.id,
    nickname: "_SYSTEM_",
    age_range: "preferisco_non_dirlo",
    gender: "preferisco_non_dirlo",
    relationship_status: "solo_per_ridere",
    looking_for: "amicizie",
    public_consent: false,
  });

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

export const getActiveSession = async (): Promise<MatchDrinkSession | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_sessions")
    .select("*")
    .neq("status", "ended")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
  const updateData: Record<string, string | null | number> = { 
    stage_mode, 
    updated_at: new Date().toISOString() 
  };
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
      avatar_url: player.avatarUrl,
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
  const updateData: Record<string, string | null> = { status, moderated_at: new Date().toISOString() };
  if (approvedText) updateData.approved_text = approvedText;

  const { error } = await admin
    .from("match_drink_bottle_messages")
    .update(updateData)
    .eq("id", messageId);

  if (error) throw error;
};

export const getBottleMessage = async (id: string): Promise<MatchDrinkBottleMessage | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("match_drink_bottle_messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapMessage(data);
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
  const updateData: Record<string, string | boolean | null> = {};
  
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
const mapSession = (row: Record<string, unknown>): MatchDrinkSession => ({
  id: row.id as string,
  joinCode: row.join_code as string,
  title: row.title as string,
  status: row.status as MatchDrinkSession["status"],
  stageMode: row.stage_mode as MatchDrinkSession["stageMode"],
  currentQuestionIndex: row.current_question_index as number,
  currentStageMessageId: row.current_stage_message_id as string | null,
  questionIds: row.question_ids as string[] | null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapPlayer = (row: Record<string, unknown>): MatchDrinkPlayer => ({
  id: row.id as string,
  sessionId: row.session_id as string,
  nickname: row.nickname as string,
  tableNumber: row.table_number as string,
  ageRange: row.age_range as MatchDrinkPlayer["ageRange"],
  gender: row.gender as MatchDrinkPlayer["gender"],
  relationshipStatus: row.relationship_status as MatchDrinkPlayer["relationshipStatus"],
  lookingFor: row.looking_for as MatchDrinkPlayer["lookingFor"],
  avatarUrl: row.avatar_url as string,
  publicConsent: row.public_consent as boolean,
  joinedAt: row.joined_at as string,
});

const mapAnswer = (row: Record<string, unknown>): MatchDrinkAnswer => ({
  id: row.id as string,
  sessionId: row.session_id as string,
  playerId: row.player_id as string,
  questionId: row.question_id as string,
  selectedOptionId: row.selected_option_id as MatchDrinkAnswer["selectedOptionId"],
  createdAt: row.created_at as string,
});

const mapMatch = (row: Record<string, unknown>): MatchDrinkMatch => ({
  id: row.id as string,
  sessionId: row.session_id as string,
  playerAId: row.player_a_id as string,
  playerBId: row.player_b_id as string,
  score: row.score as number,
  matchType: row.match_type as MatchDrinkMatch["matchType"],
  label: row.label as string,
  commonCriterion: row.common_criterion as string,
  reason: row.reason as string,
  acceptedByA: row.accepted_by_a as boolean | null,
  acceptedByB: row.accepted_by_b as boolean | null,
  acceptedAtA: row.accepted_at_a as string | null,
  acceptedAtB: row.accepted_at_b as string | null,
  drinkUnlocked: row.drink_unlocked as boolean,
  drinkRedeemed: row.drink_redeemed as boolean,
  drinkRedeemedAt: row.drink_redeemed_at as string | null,
  drinkCode: row.drink_code as string | null,
  createdAt: row.created_at as string,
});

const mapMessage = (row: Record<string, unknown>): MatchDrinkBottleMessage => ({
  id: row.id as string,
  sessionId: row.session_id as string,
  playerId: row.player_id as string,
  message: row.message as string,
  displayMode: row.display_mode as MatchDrinkBottleMessage["displayMode"],
  status: row.status as MatchDrinkBottleMessage["status"],
  approvedText: row.approved_text as string | null,
  createdAt: row.created_at as string,
  moderatedAt: row.moderated_at as string | null,
  shownAt: row.shown_at as string | null,
});

export const seedQuestions = async (questions: Partial<MatchDrinkQuestion>[]) => {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("match_drink_questions").insert(questions);
  if (error) throw error;
};

export const getSessionQuestions = async (sessionId: string) => {
  const admin = getSupabaseAdmin();
  const { data: session } = await admin.from("match_drink_sessions").select("question_ids").eq("id", sessionId).single();
  if (!session?.question_ids) return [];
  
  const { data: questions } = await admin.from("match_drink_questions").select("*").in("id", session.question_ids);
  if (!questions) return [];

  // Mappa per mantenere l'ordine originale di question_ids
  return session.question_ids.map((id: string) => {
    const q = questions.find(q => q.id === id);
    if (!q) return null;
    return {
      id: q.id,
      category: q.category,
      text: q.text,
      options: q.options
    };
  }).filter(Boolean);
};
