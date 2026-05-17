const fs = require('fs');
let lines = fs.readFileSync('components/profile-screen.tsx', 'utf8').split('\n');
// Line 883 is index 882.
const startIdx = 882;
const length = 105;

// Double check we are removing the right thing
if (lines[startIdx].includes('panel mb-5 rounded-[2rem] p-5') && lines[startIdx + length - 1].includes('</div>')) {
  const replacement = `          <ProfileDashboard
            data={data}
            loyaltyProgress={loyaltyProgress}
            missions={missions}
            setSelectedMission={setSelectedMission}
            triggerHaptic={triggerHaptic}
            hasOnPremiseAccess={hasOnPremiseAccess}
          />`;
  lines.splice(startIdx, length, replacement);
  fs.writeFileSync('components/profile-screen.tsx', lines.join('\n'));
  console.log('Replaced ProfileDashboard');
} else {
  console.log('Failed to match lines:', lines[startIdx], lines[startIdx + length - 1]);
}
