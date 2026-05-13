const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../lib/match-drink/new-question-bank.ts'), 'utf8');

// Regex to find question blocks
const questionBlocks = content.split(/\{\s*category:/).slice(1);

questionBlocks.forEach((block, index) => {
  const textMatch = block.match(/text:\s*"([^"]+)"/);
  const text = textMatch ? textMatch[1] : `Question ${index + 1}`;
  
  // Find options
  const optionMatches = block.split(/\{ id:/).slice(1);
  
  optionMatches.forEach((opt, optIndex) => {
    if (!opt.includes('traits:')) {
      console.log(`Question "${text}" - Option ${optIndex + 1} is MISSING traits.`);
    }
  });
});

console.log("Finished checking all questions.");
