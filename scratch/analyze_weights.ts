import { NEW_QUESTION_BANK } from "./lib/match-drink/new-question-bank";

const TRAIT_MAIN_CATEGORY_MAP = {
  romantico: "romantico",
  fedele: "romantico",
  timido: "romantico",
  diretto: "passionale",
  orgoglioso: "passionale",
  pericoloso: "passionale",
  ironico: "piccante",
  geloso: "piccante",
  investigatore: "piccante",
  festaiolo: "energico",
  libero: "energico",
  caotico: "energico",
};

const traitWeights = {};
const categoryWeights = {
  romantico: 0,
  passionale: 0,
  piccante: 0,
  energico: 0
};

NEW_QUESTION_BANK.forEach(q => {
  q.options.forEach(opt => {
    if (opt.traits) {
      Object.entries(opt.traits).forEach(([trait, weight]) => {
        traitWeights[trait] = (traitWeights[trait] || 0) + weight;
        const category = TRAIT_MAIN_CATEGORY_MAP[trait];
        if (category) {
          categoryWeights[category] += weight;
        }
      });
    }
  });
});

console.log("Trait Weights:", traitWeights);
console.log("Category Weights:", categoryWeights);
