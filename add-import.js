const fs = require('fs');
let lines = fs.readFileSync('components/profile-screen.tsx', 'utf8').split('\n');
const insertIndex = lines.findIndex(l => l.includes('import { ProfileEditor }'));
if (insertIndex > -1) {
  lines.splice(insertIndex + 1, 0, 'import { ProfileDashboard } from "@/features/profile/components/ProfileDashboard";');
  fs.writeFileSync('components/profile-screen.tsx', lines.join('\n'));
  console.log('Import added successfully.');
} else {
  console.log('Failed to find import location.');
}
