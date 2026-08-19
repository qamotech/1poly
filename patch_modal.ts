import fs from 'fs';
const file = fs.readFileSync('src/components/PropertyManagerModal.tsx', 'utf8');

let newFile = file.replace(
  "onClose: () => void;\n}",
  "onClose: () => void;\n  onMortgage?: (playerId: string, propertyId: string) => void;\n  onUnmortgage?: (playerId: string, propertyId: string) => void;\n}"
);

newFile = newFile.replace(
  "onClose }) => {",
  "onClose, onMortgage, onUnmortgage }) => {"
);

const oldGrouping = `  // Group player properties by color
  const groups: Record<string, typeof SPACES> = {};
  
  // First, map out all standard colored properties they own
  currentPlayer.properties.forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (space && space.groupColor) {
      if (!groups[space.groupColor]) groups[space.groupColor] = [];
      groups[space.groupColor].push(space);
    }
  });`;

const newGrouping = `  // Group player properties by color/type
  const groups: Record<string, typeof SPACES> = {};
  
  currentPlayer.properties.forEach(propId => {
    const space = SPACES.find(s => s.id === propId);
    if (space) {
      const groupKey = space.groupColor || (space.type === 'RAILROAD' ? '#444' : '#888');
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(space);
    }
  });
  
  const getSpaceArt = (space: any) => {
    if (space.type === 'RAILROAD') return '🚂';
    if (space.type === 'UTILITY') return space.name.includes('Water') ? '🚰' : '💡';
    return '🏙️';
  };
`;

newFile = newFile.replace(oldGrouping, newGrouping);

// Replace property rendering card to have background art, and show Mortgage buttons
const oldPropCard = `                                <div className="flex justify-between font-bold text-slate-200">
                                  <span>{space.name}</span>
                                  <span className="text-blue-400 font-mono">
                                    {propState.hasHotel ? '🏨 Hotel' : \`\${propState.houses} 🏠\`}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mb-2">
                                  House Cost: <span className="text-emerald-400">\${space.houseCost}</span>
                                </div>
                                <button 
                                  onClick={() => onBuildHouse(currentPlayer.id, space.id)}
                                  disabled={!canBuild}
                                  className={\`w-full py-2 rounded font-bold transition-colors \${canBuild ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}\`}
                                >
                                  {isMaxed ? 'Max Level' : 'Build House'}
                                </button>`;

const newPropCard = `                                <div className="absolute inset-0 flex items-center justify-center opacity-10 text-6xl pointer-events-none">
                                  {getSpaceArt(space)}
                                </div>
                                <div className="relative z-10 flex flex-col h-full gap-2 justify-between">
                                  <div className="flex justify-between font-bold text-slate-200 text-sm">
                                    <span className="truncate pr-1">{space.name}</span>
                                    {space.groupColor && (
                                      <span className="text-blue-400 font-mono whitespace-nowrap">
                                        {propState.hasHotel ? '🏨 Hotel' : \`\${propState.houses} 🏠\`}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {propState.isMortgaged ? (
                                    <div className="text-red-400 text-xs font-bold bg-red-900/50 p-1 text-center rounded">MORTGAGED</div>
                                  ) : (
                                    space.groupColor && (
                                      <div className="text-xs text-slate-400">
                                        House Cost: <span className="text-emerald-400">\${space.houseCost}</span>
                                      </div>
                                    )
                                  )}
                                  
                                  <div className="flex gap-1 mt-auto">
                                    {space.groupColor && !propState.isMortgaged && (
                                      <button 
                                        onClick={() => onBuildHouse(currentPlayer.id, space.id)}
                                        disabled={!canBuild}
                                        className={\`flex-1 py-1.5 rounded font-bold text-xs transition-colors \${canBuild ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}\`}
                                      >
                                        {isMaxed ? 'Max Level' : '+ Build'}
                                      </button>
                                    )}
                                    {propState.isMortgaged ? (
                                      <button 
                                        onClick={() => onUnmortgage?.(currentPlayer.id, space.id)}
                                        disabled={currentPlayer.money < Math.floor((space.price! / 2) * 1.1)}
                                        className={\`flex-1 py-1.5 rounded font-bold text-xs transition-colors \${currentPlayer.money >= Math.floor((space.price! / 2) * 1.1) ? 'bg-blue-600 hover:bg-blue-500 text-white shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}\`}
                                      >
                                        Pay \${Math.floor((space.price! / 2) * 1.1)}
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => onMortgage?.(currentPlayer.id, space.id)}
                                        disabled={propState.houses > 0 || propState.hasHotel}
                                        className={\`flex-1 py-1.5 rounded font-bold text-xs transition-colors \${propState.houses === 0 && !propState.hasHotel ? 'bg-orange-600 hover:bg-orange-500 text-white shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}\`}
                                      >
                                        Mortgage +\${Math.floor(space.price! / 2)}
                                      </button>
                                    )}
                                  </div>
                                </div>`;

newFile = newFile.replace('className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col gap-2"', 'className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative overflow-hidden h-28"');
newFile = newFile.replace(oldPropCard, newPropCard);

// Also set group title for Railroads/Utilities
newFile = newFile.replace(
  "Color Group {hasMonopoly && <span className=\"text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full\">Monopoly</span>}",
  "{color === '#444' ? 'Railroads' : color === '#888' ? 'Utilities' : 'Color Group'} {hasMonopoly && <span className=\"text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full\">Monopoly</span>}"
);

fs.writeFileSync('src/components/PropertyManagerModal.tsx', newFile);
