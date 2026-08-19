import fs from 'fs';
const file = fs.readFileSync('src/components/Board.tsx', 'utf8');

let newFile = file;

// 1. Add 3D Board Tilt state
const statePatch = `
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width - 0.5) * 2; // -1 to 1
    const yPct = (y / rect.height - 0.5) * 2; // -1 to 1
    setTilt({ x: -yPct * 5, y: xPct * 5 }); // 5 degree max tilt
  };
  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };
`;

newFile = newFile.replace("const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);", "const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);\n" + statePatch);

// 2. Apply tilt to the board container
newFile = newFile.replace(
  "className=\"w-full aspect-square max-w-[800px] mx-auto relative rounded-xl shadow-2xl bg-[#cde6d0] overflow-hidden\"",
  "className=\"w-full aspect-square max-w-[800px] mx-auto relative rounded-xl shadow-2xl bg-[#cde6d0] overflow-hidden transition-transform duration-200 ease-out\"\n      onMouseMove={handleMouseMove}\n      onMouseLeave={handleMouseLeave}\n      style={{ transform: \`perspective(1000px) rotateX(\${tilt.x}deg) rotateY(\${tilt.y}deg)\` }}"
);

// 3. Player Token Bouncing
const oldToken = `                   <motion.div
                     key={player.id}
                     layout
                     initial={{ scale: 0 }}
                     animate={{ scale: 1, x: offset, y: offset }}
                     transition={{ type: "spring", stiffness: 300, damping: 25 }}
                     style={{ gridRow, gridColumn }}
                     className="flex items-center justify-center w-full h-full pointer-events-none"
                   >`;
const newToken = `                   <motion.div
                     key={player.id}
                     layout
                     initial={{ scale: 0 }}
                     animate={
                       player.id === currentPlayer?.id && isRolling
                         ? { scale: 1.2, x: offset, y: [offset, offset - 15, offset], rotate: [0, -10, 10, 0] }
                         : { scale: 1, x: offset, y: offset, rotate: 0 }
                     }
                     transition={{ 
                       layout: { type: "spring", stiffness: 300, damping: 25 },
                       y: { duration: 0.3, repeat: (player.id === currentPlayer?.id && isRolling) ? Infinity : 0 }
                     }}
                     style={{ gridRow, gridColumn }}
                     className="flex items-center justify-center w-full h-full pointer-events-none"
                   >`;

newFile = newFile.replace(oldToken, newToken);

// 4. Update art on deeds
const oldDeedArt = `                      {space.groupColor ? (
                        <div className="h-24 flex items-center justify-center border-b-2 border-slate-900 text-center p-2" style={{ backgroundColor: space.groupColor }}>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-tight drop-shadow-sm">
                            TITLE DEED <br/> {space.name}
                          </h2>
                        </div>
                      ) : (
                        <div className="h-24 flex flex-col items-center justify-center border-b-2 border-slate-900 bg-slate-100 text-center p-2">
                          <span className="text-4xl mb-1">{getSpaceIcon(space)}</span>
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-tight">
                            {space.name}
                          </h2>
                        </div>
                      )}`;

const newDeedArt = `                      {space.groupColor ? (
                        <div className="h-32 flex flex-col items-center justify-center border-b-2 border-slate-900 text-center p-2 relative overflow-hidden" style={{ backgroundColor: space.groupColor }}>
                          <div className="absolute inset-0 flex items-center justify-center opacity-20 text-7xl pointer-events-none">
                            🏙️
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-tight drop-shadow-sm relative z-10">
                            TITLE DEED <br/> {space.name}
                          </h2>
                        </div>
                      ) : (
                        <div className="h-32 flex flex-col items-center justify-center border-b-2 border-slate-900 bg-slate-100 text-center p-2 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center opacity-10 text-8xl pointer-events-none">
                            {getSpaceIcon(space)}
                          </div>
                          <span className="text-4xl mb-1 relative z-10">{getSpaceIcon(space)}</span>
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-tight relative z-10">
                            {space.name}
                          </h2>
                        </div>
                      )}`;

newFile = newFile.replace(oldDeedArt, newDeedArt);

fs.writeFileSync('src/components/Board.tsx', newFile);
