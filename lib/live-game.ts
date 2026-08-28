export const liveGames = { cervellone: { label: "Cervellone", url: "http://192.168.0.125:8080" }, kantaquiz: { label: "Kantaquiz", url: "https://drwhy.tortugabay.it" } } as const;
export type LiveGameId = keyof typeof liveGames;
export type LiveGameState = { active_game: LiveGameId | null; activated_at: string | null; expires_at: string | null; };
export const isLiveGameId = (value: unknown): value is LiveGameId => value === "cervellone" || value === "kantaquiz";
