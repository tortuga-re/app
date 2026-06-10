export const ACTIVE_GAMES_CHANNEL = "active-games";
export const ACTIVE_GAMES_STATUS_EVENT = "status_update";

export type ActiveGamesStatusPatch = {
  buzzer?: boolean;
  matchDrink?: boolean;
  updatedAt?: string;
};
