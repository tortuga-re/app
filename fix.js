const fs = require('fs');
let content = fs.readFileSync('components/profile-screen.tsx', 'utf8');
content = content.replace('"use client";', '"use client";\nimport { missions } from "@/lib/missions";');
fs.writeFileSync('components/profile-screen.tsx', content);
console.log('Fixed imports');
