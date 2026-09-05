export type SongCandidate = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  decade?: string;
  votesCount: number;
  voterIds: string[];
};

export type SongVotingState = {
  enabled: boolean;
  title: string;
  description?: string;
  maxVotesPerUser?: number;
  songs: SongCandidate[];
};

export type SurveyOption = {
  id: string;
  text: string;
  votesCount: number;
  voterIds: string[];
};

export type CiurmaMinRank = "tutti" | "bucaniere" | "corsaro" | "capitano" | "leggenda";
export type SurveyTargetPlacement = "serata" | "ciurma_home" | "entrambi";

export type CiurmaSurveyState = {
  enabled: boolean;
  id: string;
  question: string;
  description?: string;
  targetPlacement: SurveyTargetPlacement;
  minRank: CiurmaMinRank;
  startDate?: string;
  endDate?: string;
  options: SurveyOption[];
  createdAt: string;
};

export type SerataLiveState = {
  songVoting: SongVotingState;
  survey: CiurmaSurveyState;
  surveys?: CiurmaSurveyState[];
};

