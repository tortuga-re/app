export type MatchDrinkTrait =
  | "romantico"
  | "geloso"
  | "libero"
  | "caotico"
  | "festaiolo"
  | "diretto"
  | "timido"
  | "ironico"
  | "pericoloso"
  | "fedele"
  | "investigatore"
  | "orgoglioso";

export type MatchDrinkMainCategory =
  | "romantico"
  | "passionale"
  | "piccante"
  | "energico";

export interface MatchDrinkQuestionOption {
  id: "A" | "B" | "C" | "D";
  text: string;
  traits?: Partial<Record<MatchDrinkTrait, number>>;
  comment?: string;
}

export interface MatchDrinkQuestion {
  id: string;
  text: string;
  category: "light" | "ironic" | "spicy";
  spicyIntensity?: "standard" | "adult";
  options: MatchDrinkQuestionOption[];
}

export interface MatchDrinkSession {
  id: string;
  joinCode: string;
  title: string;
  status: "lobby" | "playing" | "matching" | "reveal" | "ended";
  stageMode: "lobby" | "intro" | "question" | "question_results" | "message" | "matching" | "reveal" | "ended";
  secondaryTraitMode?: "macro_category" | "absolute";
  currentQuestionIndex: number;
  currentStageMessageId?: string | null;
  questionIds?: string[] | null;
  questions?: MatchDrinkQuestion[];
  bottleMessagesEnabled?: boolean;
  excludedMeetingTables?: string[];
  analytics?: MatchDrinkSessionAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface MatchDrinkMeetingTableOption {
  key: string;
  area: string;
  number: string;
  seats: number;
  zone: "romance" | "friendship";
  slots: number;
  label: string;
}

export interface MatchDrinkForecastSummary {
  romancePairs: number;
  friendshipPairs: number;
  unmatchedPlayers: number;
  romanceCapacity: number;
  friendshipCapacity: number;
}

export interface MatchDrinkSessionAnalytics {
  signups: number;
  matchesCalculated: number;
  acceptedMatches: number;
  drinksUnlocked: number;
  drinksRedeemed: number;
  lastCalculatedAt?: string | null;
  updatedAt: string;
}

export interface MatchDrinkPlayer {
  id: string;
  sessionId: string;
  nickname: string;
  tableNumber?: string;
  phone?: string;
  ageRange: "18-24" | "25-34" | "35-45" | "46-plus" | "preferisco_non_dirlo";
  gender: "uomo" | "donna" | "preferisco_non_dirlo";
  relationshipStatus: "single" | "in_coppia" | "complicato" | "solo_per_ridere";
  lookingFor: "uomo" | "donna" | "entrambi" | "amicizie";
  avatarUrl?: string;
  publicConsent: boolean;
  joinedAt: string;
}

export interface MatchDrinkAnswer {
  id: string;
  sessionId: string;
  playerId: string;
  questionId: string;
  selectedOptionId: "A" | "B" | "C" | "D";
  createdAt: string;
}

export interface MatchDrinkMatch {
  id: string;
  sessionId: string;
  playerAId: string;
  playerBId: string;
  score: number;
  matchType:
    | "anime_gemelle"
    | "errore_consigliato"
    | "red_flag_compatibili"
    | "una_birra_e_vediamo"
    | "pericolo_pubblico"
    | "compatibilita_sospetta";
  label: string;
  commonCriterion: string;
  reason: string;
  acceptedByA?: boolean | null;
  acceptedByB?: boolean | null;
  acceptedAtA?: string | null;
  acceptedAtB?: string | null;
  drinkUnlocked: boolean;
  drinkRedeemed?: boolean;
  drinkRedeemedAt?: string | null;
  drinkCode?: string | null;
  createdAt: string;
  // Enriched fields from API
  playerANickname?: string;
  playerATable?: string;
  playerBNickname?: string;
  playerBTable?: string;
  playerAAvatar?: string;
  playerBAvatar?: string;
  playerAPhone?: string;
  playerBPhone?: string;
  ownMainCategory?: MatchDrinkMainCategory;
  ownMainCategoryLabel?: string;
  matchedPlayerNickname?: string;
  matchedPlayerTable?: string;
  matchedPlayerPhone?: string;
  matchedPlayerMainCategory?: MatchDrinkMainCategory;
  matchedPlayerMainCategoryLabel?: string;
  matchedPlayerSecondaryTrait?: MatchDrinkTrait;
  matchedPlayerSecondaryTraitLabel?: string;
  matchedPlayerApproachAdvice?: string;
  sharedMainCategory?: MatchDrinkMainCategory | null;
  sharedMainCategoryLabel?: string | null;
  rewardText?: string;
  meetingTableNumber?: string;
  meetingTableArea?: string;
  meetingTableLabel?: string;
}

export interface MatchDrinkBottleMessage {
  id: string;
  sessionId: string;
  playerId: string;
  message: string;
  displayMode: "anonymous" | "nickname" | "captain";
  status: "pending" | "approved" | "rejected" | "shown";
  approvedText?: string | null;
  createdAt: string;
  moderatedAt?: string | null;
  shownAt?: string | null;
}

export interface MatchDrinkProfile {
  playerId: string;
  traits: Record<MatchDrinkTrait, number>;
  dominantTrait: MatchDrinkTrait;
  mainCategory: MatchDrinkMainCategory;
  mainCategoryLabel: string;
  secondaryTrait: MatchDrinkTrait;
  secondaryTraitLabel: string;
  profileLabel: string;
  profileDescription: string;
}
