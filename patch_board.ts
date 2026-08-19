import fs from 'fs';
const file = fs.readFileSync('src/components/Board.tsx', 'utf8');

let newFile = file.replace(
  "isCpuTurn: boolean;\n}",
  "isCpuTurn: boolean;\n  onPayBail?: () => void;\n}"
);

newFile = newFile.replace(
  "isCpuTurn }) => {",
  "isCpuTurn, onPayBail }) => {"
);

// Enlarge board squares via grid track sizes:
newFile = newFile.replace(
  "className=\"w-full h-full grid grid-cols-11 grid-rows-11 gap-[2px] relative\"",
  "style={{ gridTemplateColumns: '1.5fr repeat(9, 1fr) 1.5fr', gridTemplateRows: '1.5fr repeat(9, 1fr) 1.5fr' }} className=\"w-full h-full grid gap-[2px] relative\""
);

// Add the Bail button
const bailButton = `
                  {currentPlayer?.inJail && (
                    <button 
                      onClick={() => {
                        audio.playUiClick();
                        onPayBail?.();
                      }}
                      disabled={isCpuTurn || gameState.phase !== GamePhase.TURN_START || currentPlayer.money < 50}
                      className={\`w-full font-bold py-3 px-6 rounded-xl transition-all shadow-xl border-2
                        \${!isCpuTurn && gameState.phase === GamePhase.TURN_START && currentPlayer.money >= 50
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 border-yellow-600 cursor-pointer'
                          : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed opacity-80'
                        }
                      \`}
                    >
                      PAY $50 BAIL
                    </button>
                  )}
`;

newFile = newFile.replace(
  "{/* Main Phase Action */}",
  bailButton + "\n                  {/* Main Phase Action */}"
);

// Enlarge buttons
newFile = newFile.replace(
  "w-full font-bold py-4 px-6 rounded-xl transition-all text-2xl shadow-xl border-4",
  "w-full font-bold py-5 px-6 rounded-xl transition-all text-3xl shadow-xl border-4"
);
newFile = newFile.replace(
  "flex-1 font-bold py-2 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-sm",
  "flex-1 font-bold py-3 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-base md:text-lg"
);

fs.writeFileSync('src/components/Board.tsx', newFile);
