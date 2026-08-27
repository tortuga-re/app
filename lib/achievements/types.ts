export type AchievementSecrecy = "hinted" | "secret" | "hidden";

export type AchievementView = {
  id: string;
  label: string;
  description: string;
  icon: string;
  image?: string;
  secrecy: AchievementSecrecy;
  unlocked: boolean;
};

export type AchievementEvaluationInput = {
  visitDates: string[];
  eventKeys?: string[];
  unlockedIds: string[];
  formats: Array<{ id: string; title: string; weekday: number }>;
};

export type AchievementEvaluation = {
  id: string;
  unlocked: boolean;
  completedDetail?: string;
};

export type AchievementDefinition = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  image?: string;
  secrecy: AchievementSecrecy;
};
