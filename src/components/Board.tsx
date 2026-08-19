import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, GamePhase, SpaceType } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';

const getSpaceIcon = (space: any) => {
  if (space.type === SpaceType.RAILROAD) return '🚂';
  if (space.type === SpaceType.UTILITY) return space.name.includes('Water') ? '🚰' : '💡';
  if (space.type === SpaceType.CHANCE) return '❓';
  if (space.type === SpaceType.COMMUNITY_CHEST) return '💰';
  if (space.type === SpaceType.TAX) return space.name.includes('Luxury') ? '💍' : '🧾';
  if (space.name === 'Jail') return '🚓';
  if (space.name === 'Go To Jail') return '👮';
  if (space.name === 'Free Parking') return '🚗';
  if (space.name === 'GO') return '🏁';
  return null;
};

interface BoardProps {
  gameState: GameState;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyProperty: () => void;
  onOpenTradeModal: () => void;
  onOpenPropertyModal: () => void;
  isCpuTurn: boolean;
}

export const Board: React.FC<BoardProps> = ({ gameState, onRoll, onEndTurn, onBuyProperty, onOpenTradeModal, onOpenPropertyModal, isCpuTurn }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentSpace = currentPlayer ? SPACES[currentPlayer.position] : null;
  const propertyState = currentSpace ? gameState.propertyStates[currentSpace.id] : null;

  const canBuyProperty = 
    gameState.phase === GamePhase.POST_ROLL && 
    !isCpuTurn && 
    currentSpace && 
    [SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(currentSpace.type) &&
    propertyState && 
    !propertyState.ownerId &&
    currentSpace.price !== undefined &&
    currentPlayer.money >= currentSpace.price;

  const rollAnimationKey = `${gameState.turnCount}-${gameState.doublesRolledCount}-${gameState.logs.length}`;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Base board is designed at exactly 800px width.
        // We calculate the scale required to fit the current container.
        const { width } = entries[0].contentRect;
        setScale(width / 800);
      }
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  // Initialize visual positions instantly
  useEffect(() => {
    setVisualPositions(prev => {
      const next = { ...prev };
      let changed = false;
      gameState.players.forEach(p => {
        if (next[p.id] === undefined) {
          next[p.id] = p.position;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [gameState.players]);

  // Animate step-by-step token movement
  useEffect(() => {
    const timer = setInterval(() => {
      setVisualPositions(prev => {
        const next = { ...prev };
        let changed = false;
        gameState.players.forEach(p => {
          if (next[p.id] !== undefined && next[p.id] !== p.position) {
            // If they are sent to jail, just teleport them to avoid going around the board backward
            if (p.inJail && p.position === 10) {
              next[p.id] = 10;
            } else {
              // Otherwise walk them forward 1 space at a time
              next[p.id] = (next[p.id] + 1) % 40;
            }
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 150); // Speed of token step animation (150ms per square)

    return () => clearInterval(timer);
  }, [gameState.players]);

  // A standard Monopoly board is 11x11 squares.
  const getGridPosition = (position: number) => {
    if (position >= 0 && position <= 10) return { gridRow: 11, gridColumn: 11 - position };
    if (position > 10 && position <= 20) return { gridRow: 11 - (position - 10), gridColumn: 1 };
    if (position > 20 && position <= 30) return { gridRow: 1, gridColumn: 1 + (position - 20) };
    return { gridRow: 1 + (position - 30), gridColumn: 11 };
  };

  return (
    // Outer responsive container
    <div 
      ref={containerRef} 
      className="w-full aspect-square max-w-[800px] mx-auto relative rounded-xl shadow-2xl bg-[#cde6d0] overflow-hidden"
    >
      {/* Inner fixed-size scaling board. This guarantees no text wrapping/jumbling on mobile. */}
      <div 
        style={{ 
          width: '800px', 
          height: '800px', 
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
        className="absolute top-0 left-0 bg-[#b3d4b8] border-[12px] border-slate-300 border-t-slate-200 border-l-slate-200 border-b-slate-500 border-r-slate-500 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] p-[8px]"
      >
        <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-[2px] relative">
          {SPACES.map((space) => {
            const { gridRow, gridColumn } = getGridPosition(space.position);
            const isCorner = [0, 10, 20, 30].includes(space.position);
            const isGo = space.position === 0;
            
            let rotationClass = '';
            if (!isCorner) {
              if (space.position > 0 && space.position < 10) rotationClass = ''; // Bottom
              if (space.position > 10 && space.position < 20) rotationClass = 'rotate-90'; // Left
              if (space.position > 20 && space.position < 30) rotationClass = 'rotate-180'; // Top
              if (space.position > 30 && space.position < 40) rotationClass = '-rotate-90'; // Right
            }

            const propState = gameState.propertyStates[space.id];
            const owner = propState?.ownerId ? gameState.players.find(p => p.id === propState.ownerId) : null;

            const bgClass = isGo 
              ? 'bg-gradient-to-br from-yellow-200 via-orange-200 to-red-400'
              : 'bg-gradient-to-br from-[#f2f9f3] to-[#cde6d0]';

            const isActiveTarget = gameState.phase === GamePhase.POST_ROLL && 
                                   currentPlayer?.position === space.position && 
                                   visualPositions[currentPlayer?.id] === space.position;

            return (
              <motion.div 
                key={space.id} 
                style={{ gridRow, gridColumn }}
                animate={isActiveTarget ? { 
                  scale: [1, 1.08, 1], 
                  boxShadow: [
                    'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.15), 0 0 0px 0px rgba(59, 130, 246, 0)',
                    'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.15), 0 0 25px 8px rgba(59, 130, 246, 0.7)',
                    'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.15), 0 0 0px 0px rgba(59, 130, 246, 0)'
                  ],
                  zIndex: 10 
                } : { 
                  scale: 1, 
                  boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.15), 0 0 0px 0px rgba(59, 130, 246, 0)',
                  zIndex: 1 
                }}
                transition={isActiveTarget ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                onClick={() => setSelectedSpaceId(space.id)}
                className={`group relative ${bgClass} border border-slate-400 flex flex-col overflow-visible cursor-pointer hover:brightness-110 transition-colors ${isCorner ? 'p-2' : ''}`}
              >
                <div className={`w-full h-full flex flex-col ${rotationClass}`}>
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
                  <div className={`flex-1 flex flex-col items-center justify-center p-1 text-center ${isCorner ? 'transform rotate-45' : ''}`}>
                    {getSpaceIcon(space) && (
                      <span className={`${isCorner ? 'text-4xl' : 'text-3xl'} filter drop-shadow-md`}>
                        {getSpaceIcon(space)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ownership Indicator */}
                {owner && (
                  <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: owner.token === '🚗' ? 'red' : 'blue' }}>
                    <div className="w-full h-full bg-slate-800 opacity-80" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Center Area */}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-[#cde6d0] flex flex-col items-center justify-center pointer-events-none z-10">
             
             {/* Center Rotation Container */}
             <div className="transform -rotate-45 flex flex-col items-center justify-center gap-6 w-full h-full pointer-events-none">

               {/* Free Parking Pot - Vibrant Design */}
               {gameState.pot > 0 && (
                 <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-4 rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.5)] border-4 border-yellow-400 flex flex-col items-center justify-center relative overflow-hidden pointer-events-auto min-w-[200px]">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                   <h3 className="text-yellow-100 text-sm uppercase tracking-widest mb-1 relative z-10 flex items-center gap-2 font-black drop-shadow-md">
                     <span>🚗</span> FREE PARKING
                   </h3>
                   <p className="text-yellow-300 font-mono text-5xl font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] relative z-10">
                     ${gameState.pot}
                   </p>
                 </div>
               )}

               {/* Action Center overlay */}
               <div className="pointer-events-auto flex flex-col items-center gap-4 w-72">
                 {/* Main Phase Action */}
                 <button 
                    onClick={() => {
                      audio.playUiClick();
                      if (gameState.phase === GamePhase.TURN_START) onRoll();
                      else if (gameState.phase === GamePhase.POST_ROLL) onEndTurn();
                    }}
                    disabled={isCpuTurn || (gameState.phase !== GamePhase.TURN_START && gameState.phase !== GamePhase.POST_ROLL)}
                    className={`w-full font-bold py-4 px-6 rounded-xl transition-all text-2xl shadow-xl border-4
                      ${!isCpuTurn && gameState.phase === GamePhase.TURN_START 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 cursor-pointer animate-pulse' 
                        : !isCpuTurn && gameState.phase === GamePhase.POST_ROLL
                        ? (gameState.players[gameState.currentPlayerIndex]?.money < 0 ? 'bg-red-900 hover:bg-red-800 text-red-100 border-red-700 cursor-pointer animate-pulse' : 'bg-red-600 hover:bg-red-500 text-white border-red-400 cursor-pointer animate-pulse')
                        : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed opacity-80'
                      }
                    `}
                  >
                    {gameState.phase === GamePhase.TURN_START ? 'ROLL DICE' : (gameState.players[gameState.currentPlayerIndex]?.money < 0 && !isCpuTurn ? 'BANKRUPT 💀' : 'END TURN')}
                  </button>

                  {/* Dice visual */}
                  {gameState.lastDiceRoll && (
                    <div className="flex justify-center gap-4 py-2" style={{ perspective: "1000px" }}>
                      <motion.div 
                        key={`${rollAnimationKey}-die0`}
                        initial={{ rotateX: 360, rotateY: 360, y: -50, scale: 0.5, opacity: 0 }}
                        animate={{ rotateX: 0, rotateY: 0, y: 0, scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
                        className="w-16 h-16 bg-gradient-to-b from-white to-slate-200 rounded-xl shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.3)] border border-slate-300 flex items-center justify-center text-4xl font-bold text-slate-800"
                      >
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, duration: 0.2 }}
                        >
                          {gameState.lastDiceRoll[0]}
                        </motion.span>
                      </motion.div>
                      <motion.div 
                        key={`${rollAnimationKey}-die1`}
                        initial={{ rotateX: -360, rotateY: 360, y: -50, scale: 0.5, opacity: 0 }}
                        animate={{ rotateX: 0, rotateY: 0, y: 0, scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.1, type: "spring", bounce: 0.5 }}
                        className="w-16 h-16 bg-gradient-to-b from-white to-slate-200 rounded-xl shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.3)] border border-slate-300 flex items-center justify-center text-4xl font-bold text-slate-800"
                      >
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4, duration: 0.2 }}
                        >
                          {gameState.lastDiceRoll[1]}
                        </motion.span>
                      </motion.div>
                    </div>
                  )}

                  {/* Secondary Actions Row */}
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => {
                        audio.playUiClick();
                        onOpenTradeModal();
                      }}
                      disabled={isCpuTurn || (gameState.phase !== GamePhase.TURN_START && gameState.phase !== GamePhase.POST_ROLL)}
                      className={`flex-1 font-bold py-2 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-sm
                        ${!isCpuTurn && (gameState.phase === GamePhase.TURN_START || gameState.phase === GamePhase.POST_ROLL)
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                        }
                      `}
                    >
                      <span>🤝</span> Trade
                    </button>

                    <button 
                      onClick={() => {
                        audio.playUiClick();
                        onOpenPropertyModal();
                      }}
                      disabled={isCpuTurn || (gameState.phase !== GamePhase.TURN_START && gameState.phase !== GamePhase.POST_ROLL)}
                      className={`flex-1 font-bold py-2 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-sm
                        ${!isCpuTurn && (gameState.phase === GamePhase.TURN_START || gameState.phase === GamePhase.POST_ROLL)
                          ? (gameState.players[gameState.currentPlayerIndex]?.money < 0 ? 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer animate-pulse border border-yellow-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer')
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                        }
                      `}
                    >
                      <span>{gameState.players[gameState.currentPlayerIndex]?.money < 0 ? '💰' : '🏘️'}</span> {gameState.players[gameState.currentPlayerIndex]?.money < 0 ? 'Take Loan' : 'Manage'}
                    </button>
                  </div>

                  {/* Buy Property Button */}
                  <AnimatePresence>
                    {canBuyProperty && currentSpace && (
                      <motion.button 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => {
                          audio.playUiClick();
                          onBuyProperty();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-400 text-white font-black py-3 px-6 rounded-xl transition-colors shadow-2xl flex flex-col items-center justify-center pointer-events-auto mt-2"
                      >
                        <span className="text-xl">BUY {currentSpace.name.toUpperCase()}</span>
                        <span className="text-lg text-emerald-200 font-mono">${currentSpace.price}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
               </div>
               
             </div>
          </div>

          {/* Players/Tokens Overlay */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="relative w-full h-full grid grid-cols-11 grid-rows-11 gap-[2px]">
               {gameState.players.map((player, idx) => {
                 const currentVisualPos = visualPositions[player.id] !== undefined ? visualPositions[player.id] : player.position;
                 const { gridRow, gridColumn } = getGridPosition(currentVisualPos);
                 
                 // Offset multiple players on the same space
                 const offset = (idx * 5) - (gameState.players.length * 2.5);

                 return (
                   <motion.div
                     key={player.id}
                     layout
                     initial={{ scale: 0 }}
                     animate={{ scale: 1, x: offset, y: offset }}
                     transition={{ type: "spring", stiffness: 300, damping: 25 }}
                     style={{ gridRow, gridColumn }}
                     className="flex items-center justify-center w-full h-full pointer-events-none"
                   >
                     <div className="text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] filter">
                       {player.token}
                     </div>
                   </motion.div>
                 );
               })}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Space Details Modal */}
      <AnimatePresence>
        {selectedSpaceId && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
            onClick={() => setSelectedSpaceId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const space = SPACES.find(s => s.id === selectedSpaceId);
                if (!space) return null;
                const propState = gameState.propertyStates[space.id];
                const owner = propState?.ownerId ? gameState.players.find(p => p.id === propState.ownerId) : null;
                
                return (
                  <div className="p-1 border-2 border-slate-900 m-2 rounded-lg bg-white">
                    <div className="border-2 border-slate-900 h-full flex flex-col">
                      {space.groupColor ? (
                        <div className="h-24 flex items-center justify-center border-b-2 border-slate-900 text-center p-2" style={{ backgroundColor: space.groupColor }}>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-tight drop-shadow-sm">
                            TITLE DEED<br/>{space.name}
                          </h2>
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center border-b-2 border-slate-900 text-center p-2 bg-slate-100">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{space.name}</h2>
                        </div>
                      )}
                      
                      <div className="p-6 flex-1 flex flex-col items-center text-slate-800 text-lg bg-[#faf9f6]">
                        {space.price && <p className="mb-4">Price: <span className="font-bold">${space.price}</span></p>}
                        
                        {space.rent && (
                          <div className="w-full space-y-1 text-sm font-medium mb-4">
                            <p className="flex justify-between"><span>Rent</span> <span>${space.rent[0]}</span></p>
                            <p className="flex justify-between"><span>With 1 House</span> <span>${space.rent[1]}</span></p>
                            <p className="flex justify-between"><span>With 2 Houses</span> <span>${space.rent[2]}</span></p>
                            <p className="flex justify-between"><span>With 3 Houses</span> <span>${space.rent[3]}</span></p>
                            <p className="flex justify-between"><span>With 4 Houses</span> <span>${space.rent[4]}</span></p>
                            <p className="flex justify-between mt-2 pt-2 border-t border-slate-300 font-bold"><span>With HOTEL</span> <span>${space.rent[5]}</span></p>
                          </div>
                        )}
                        
                        {space.houseCost && (
                          <div className="text-sm font-medium text-center space-y-1">
                            <p>Houses cost ${space.houseCost} each</p>
                            <p>Hotels, ${space.houseCost} plus 4 houses</p>
                          </div>
                        )}
                        
                        <div className="mt-6 pt-4 border-t-2 border-slate-900 w-full text-center">
                          {owner ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm text-slate-500 uppercase tracking-wider mb-1">Owned By</span>
                              <span className="font-bold text-blue-600 text-xl flex items-center gap-2">
                                <span className="text-2xl drop-shadow-sm">{owner.token}</span> {owner.name}
                              </span>
                            </div>
                          ) : (
                            <span className={`font-bold text-xl uppercase ${space.price ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {space.price ? 'Unowned' : 'Action Space'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="p-4 bg-slate-100 border-t border-slate-200">
                <button 
                  onClick={() => setSelectedSpaceId(null)} 
                  className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg text-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
