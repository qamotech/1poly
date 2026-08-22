const fs = require('fs');
const content = fs.readFileSync('src/components/Board.tsx', 'utf-8');

const targetStr = `            let rotationClass = '';
            if (!isCorner) {
              if (space.position > 0 && space.position < 10) rotationClass = ''; // Bottom
              if (space.position > 10 && space.position < 20) rotationClass = 'rotate-90'; // Left
              if (space.position > 20 && space.position < 30) rotationClass = 'rotate-180'; // Top
              if (space.position > 30 && space.position < 40) rotationClass = '-rotate-90'; // Right
            }`;

const replacementStr = `            let contentDirClass = 'flex-col';
            let contentRotClass = '';
            let colorBarClass = 'w-full h-1/4 border-b-2 flex-row';

            if (!isCorner) {
              if (space.position > 0 && space.position < 10) {
                 contentDirClass = 'flex-col';
                 contentRotClass = '';
                 colorBarClass = 'w-full h-[25%] border-b-2 flex-row';
              }
              if (space.position > 10 && space.position < 20) {
                 contentDirClass = 'flex-row-reverse';
                 contentRotClass = 'rotate-90';
                 colorBarClass = 'w-[25%] h-full border-l-2 flex-col';
              }
              if (space.position > 20 && space.position < 30) {
                 contentDirClass = 'flex-col-reverse';
                 contentRotClass = 'rotate-180';
                 colorBarClass = 'w-full h-[25%] border-t-2 flex-row';
              }
              if (space.position > 30 && space.position < 40) {
                 contentDirClass = 'flex-row';
                 contentRotClass = '-rotate-90';
                 colorBarClass = 'w-[25%] h-full border-r-2 flex-col';
              }
            }`;

let newContent = content.replace(targetStr, replacementStr);

const oldDivStr = `                <div className={\`w-full h-full flex flex-col \${rotationClass}\`}>
                  {/* Property Color Bar */}
                  {space.groupColor && (
                    <div 
                      className="w-full h-1/4 shrink-0 border-b-2 border-slate-800 shadow-[inset_0_2px_5px_rgba(255,255,255,0.7)] flex items-center justify-center gap-[2px]"
                      style={{ backgroundColor: space.groupColor }}
                    >
                      {propState?.hasHotel ? (
                        <div className="w-4 h-3 bg-red-600 border border-red-900 rounded-sm shadow-sm flex items-center justify-center text-[8px] leading-none text-white font-bold">H</div>
                      ) : propState?.houses > 0 ? (
                        Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 bg-emerald-500 border border-emerald-900 rounded-[1px] shadow-sm"></div>
                        ))
                      ) : null}
                    </div>
                  )}
                  
                  {/* Space Details */}
                  <div className={\`flex-1 flex flex-col items-center justify-center p-1 text-center \${isCorner ? 'transform rotate-45' : ''}\`}>
                    {getSpaceIcon(space) && (
                      <span className={\`\${isCorner ? 'text-4xl' : 'text-3xl'} filter drop-shadow-md\`}>
                        {getSpaceIcon(space)}
                      </span>
                    )}
                  </div>
                </div>`;

const newDivStr = `                <div className={\`w-full h-full flex \${contentDirClass}\`}>
                  {/* Property Color Bar */}
                  {space.groupColor && (
                    <div 
                      className={\`\${colorBarClass} shrink-0 border-slate-800 shadow-[inset_0_2px_5px_rgba(255,255,255,0.7)] flex items-center justify-center gap-[2px]\`}
                      style={{ backgroundColor: space.groupColor }}
                    >
                      {propState?.hasHotel ? (
                        <div className="w-4 h-3 bg-red-600 border border-red-900 rounded-sm shadow-sm flex items-center justify-center text-[8px] leading-none text-white font-bold">H</div>
                      ) : propState?.houses > 0 ? (
                        Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 bg-emerald-500 border border-emerald-900 rounded-[1px] shadow-sm"></div>
                        ))
                      ) : null}
                    </div>
                  )}
                  
                  {/* Space Details */}
                  <div className={\`flex-1 flex flex-col items-center justify-center p-1 text-center \${isCorner ? 'transform rotate-45' : ''}\`}>
                    <div className={\`flex flex-col items-center justify-center \${contentRotClass}\`}>
                      {getSpaceIcon(space) && (
                        <span className={\`\${isCorner ? 'text-4xl' : 'text-3xl'} filter drop-shadow-md\`}>
                          {getSpaceIcon(space)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>`;

newContent = newContent.replace(oldDivStr, newDivStr);

fs.writeFileSync('src/components/Board.tsx', newContent);
console.log("Replaced successfully:", newContent !== content);
