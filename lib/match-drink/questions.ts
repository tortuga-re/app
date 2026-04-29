import { MatchDrinkQuestion } from "./types";

export const MATCH_DRINK_QUESTIONS: MatchDrinkQuestion[] = [
  {
    id: "fallback-1",
    text: "Sei pronto per una serata leggendaria?",
    category: "light",
    options: [
      { id: "A", text: "Assolutamente sì", traits: { festaiolo: 1 } },
      { id: "B", text: "Fammi bere prima", traits: { ironico: 1 } }
    ]
  }
];
