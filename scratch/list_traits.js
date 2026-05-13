const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../lib/match-drink/new-question-bank.ts'), 'utf8');

// Regex to find question blocks
const questionBlocks = content.split(/\{\s*category:/).slice(1);

console.log(`Found ${questionBlocks.length} questions.`);

questionBlocks.forEach((block, index) => {
  const textMatch = block.match(/text:\s*"([^"]+)"/);
  const text = textMatch ? textMatch[1] : `Question ${index + 1}`;
  
  const hasTraits = block.includes('traits:');
  console.log(`${index + 1}. "${text}" - Has traits: ${hasTraits}`);
});
