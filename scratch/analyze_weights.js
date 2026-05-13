const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../lib/match-drink/new-question-bank.ts'), 'utf8');

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

// Very simple regex to find traits and weights
// Example: romantico: 3
const regex = /(\w+):\s*(\d+)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const trait = match[1];
  const weight = parseInt(match[2]);
  if (TRAIT_MAIN_CATEGORY_MAP[trait]) {
    traitWeights[trait] = (traitWeights[trait] || 0) + weight;
    categoryWeights[TRAIT_MAIN_CATEGORY_MAP[trait]] += weight;
  }
}

console.log("Trait Weights:", JSON.stringify(traitWeights, null, 2));
console.log("Category Weights:", JSON.stringify(categoryWeights, null, 2));
