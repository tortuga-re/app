import "server-only";

import { getAppStateJson, setAppStateJson } from "@/lib/server/app-state";
import type { SerataLiveState, SongCandidate, SurveyOption, CiurmaMinRank } from "@/lib/serata-live/types";

const SERATA_LIVE_STATE_KEY = "serata_live_state";

import catalog from "@/lib/server/catalog.json";

export const defaultSerataLiveState: SerataLiveState = {
  songVoting: {
    enabled: true,
    title: "Scegli la prossima canzone da cantare",
    description: "Esprimi fino a 5 voti e fai salire la ciurma sul palco del Tortuga!",
    maxVotesPerUser: 5,
    songs: catalog as SongCandidate[],
  },
  survey: {
    enabled: true,
    id: "survey-default",
    question: "Qual è il tuo piatto preferito della ciurma stasera?",
    description: "Esprimi la tua opinione sul menu della serata!",
    targetPlacement: "ciurma_home",
    minRank: "bucaniere",
    options: [
      { id: "opt-1", text: "Perla Nera Burger 🍔", votesCount: 16, voterIds: [] },
      { id: "opt-2", text: "Grigliata del Capitano 🥩", votesCount: 27, voterIds: [] },
      { id: "opt-3", text: "Boccale di Birra Artigianale 🍺", votesCount: 22, voterIds: [] },
    ],
    createdAt: new Date().toISOString(),
  },
  surveys: [
    {
      enabled: true,
      id: "survey-default",
      question: "Qual è il tuo piatto preferito della ciurma stasera?",
      description: "Esprimi la tua opinione sul menu della serata!",
      targetPlacement: "ciurma_home",
      minRank: "bucaniere",
      options: [
        { id: "opt-1", text: "Perla Nera Burger 🍔", votesCount: 16, voterIds: [] },
        { id: "opt-2", text: "Grigliata del Capitano 🥩", votesCount: 27, voterIds: [] },
        { id: "opt-3", text: "Boccale di Birra Artigianale 🍺", votesCount: 22, voterIds: [] },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
};

let cachedState: SerataLiveState | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 2000; // 2 secondi di cache in memoria per velocità istantanea

export const getSerataLiveState = async (): Promise<SerataLiveState> => {
  const now = Date.now();
  if (cachedState && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedState;
  }

  const state = await getAppStateJson<SerataLiveState>(SERATA_LIVE_STATE_KEY, defaultSerataLiveState);
  cachedState = state;
  lastCacheTime = now;
  return state;
};

export const saveSerataLiveState = async (state: SerataLiveState): Promise<SerataLiveState> => {
  cachedState = state;
  lastCacheTime = Date.now();
  await setAppStateJson(SERATA_LIVE_STATE_KEY, state);
  return state;
};

export const resetSongVotesInState = async (): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const resetState: SerataLiveState = {
    ...state,
    songVoting: {
      ...state.songVoting,
      songs: state.songVoting.songs.map((s) => ({
        ...s,
        votesCount: 0,
        voterIds: [],
      })),
    },
  };
  return saveSerataLiveState(resetState);
};

export const activateSongVotingInState = async (): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const nextState: SerataLiveState = {
    ...state,
    songVoting: {
      ...state.songVoting,
      enabled: true,
    },
  };
  return saveSerataLiveState(nextState);
};

export const deactivateAndResetSongVotingInState = async (): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const nextState: SerataLiveState = {
    ...state,
    songVoting: {
      ...state.songVoting,
      enabled: false,
      songs: state.songVoting.songs.map((s) => ({
        ...s,
        votesCount: 0,
        voterIds: [],
      })),
    },
  };
  return saveSerataLiveState(nextState);
};

export const activateSurveyInState = async (surveyId: string): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];
  
  const targetSurvey = currentSurveys.find((s) => s.id === surveyId);
  if (!targetSurvey) return state;

  const activatedSurvey = {
    ...targetSurvey,
    enabled: true,
    options: targetSurvey.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
  };

  const updatedSurveys = currentSurveys.map((s) =>
    s.id === surveyId
      ? activatedSurvey
      : { ...s, enabled: false }
  );

  const nextState: SerataLiveState = {
    ...state,
    survey: activatedSurvey,
    surveys: updatedSurveys,
  };

  return saveSerataLiveState(nextState);
};

export const deactivateAndResetSurveyInState = async (surveyId: string): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];

  const updatedSurveys = currentSurveys.map((s) => {
    if (s.id === surveyId) {
      return {
        ...s,
        enabled: false,
        options: s.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
      };
    }
    return s;
  });

  let activeSurvey = state.survey;
  if (state.survey.id === surveyId) {
    activeSurvey = {
      ...state.survey,
      enabled: false,
      options: state.survey.options.map((o) => ({ ...o, votesCount: 0, voterIds: [] })),
    };
  }

  const nextState: SerataLiveState = {
    ...state,
    survey: activeSurvey,
    surveys: updatedSurveys,
  };

  return saveSerataLiveState(nextState);
};

export const deleteSurveyFromState = async (surveyId: string): Promise<SerataLiveState> => {
  const state = await getSerataLiveState();
  const currentSurveys = Array.isArray(state.surveys) ? state.surveys : [state.survey];
  const updatedSurveys = currentSurveys.filter((s) => s.id !== surveyId);

  let activeSurvey = state.survey;
  if (state.survey?.id === surveyId) {
    const nextActive = updatedSurveys.find((s) => s.enabled) || updatedSurveys[0] || {
      id: "disabled",
      enabled: false,
      question: "",
      targetPlacement: "ciurma_home",
      minRank: "tutti",
      options: [],
      createdAt: new Date().toISOString(),
    };
    activeSurvey = nextActive;
  }

  const nextState: SerataLiveState = {
    ...state,
    survey: activeSurvey,
    surveys: updatedSurveys,
  };

  return saveSerataLiveState(nextState);
};

