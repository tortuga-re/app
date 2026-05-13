const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../lib/match-drink/new-question-bank.ts'), 'utf8');

// Regex to find question blocks
const questionBlocks = content.split(/\{\s*category:/).slice(1);

let missingTraits = 0;
questionBlocks.forEach(block => {
  if (!block.includes('traits:')) {
    missingTraits++;
  }
});

console.log("Total Questions Analyzed:", questionBlocks.length);
console.log("Questions Missing Traits:", missingTraits);
