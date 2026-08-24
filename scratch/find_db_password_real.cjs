const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\4f990444-93d6-4a91-b14e-c8ae7effefd4\\.system_generated\\logs\\transcript_full.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found at:', logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Client') && line.includes('password') && !line.includes('process.argv')) {
    console.log(`Line ${i}:`, line.substring(0, 1000));
  }
}
