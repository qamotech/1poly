import fs from 'fs';
const file = fs.readFileSync('src/components/HUD.tsx', 'utf8');

let newFile = file.replace("let currentRent = 0;", "let currentRent: number | string = 0;");
fs.writeFileSync('src/components/HUD.tsx', newFile);
