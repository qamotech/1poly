import React from 'react';
import { motion } from 'motion/react';
import { GameState, SpaceType } from '../types';
import { SPACES } from '../engine/board';

interface BoardProps {
  gameState: GameState;
}

export const Board: React.FC<BoardProps> = ({ gameState }) => {
  // A standard Monopoly board is 11x11 squares.
  // We calculate the row/col for each of the 40 spaces to map them to the grid.
  const getGridPosition = (position: number) => {
    if (position >= 0 && position <= 10) {
      // Bottom row (Right to Left)
      return { gridRow: 11, gridColumn: 11 - position };
    } else if (position > 10 && position <= 20) {
      // Left column (Bottom to Top)
      return { gridRow: 11 - (position - 10), gridColumn: 1 };
    } else if (position > 20 && position <= 30) {
      // Top row (Left to Right)
      return { gridRow: 1, gridColumn: 1 + (position - 20) };
    } else {
      // Right column (Top to Bottom)
      return { gridRow: 1 + (position - 30), gridColumn: 11 };
    }
  };

  return (
    <div className="relative aspect-square w-full max-w-[800px] mx-auto bg-[#cde6d0] border-4 border-slate-900 rounded-lg shadow-2xl p-2 flex flex-col justify-between">
      
      {/* 11x11 Grid Layout */}
      <div className="absolute inset-2 grid grid-cols-11 grid-rows-11 gap-[2px]">
        {SPACES.map((space) => {
          const { gridRow, gridColumn } = getGridPosition(space.position);
          
          // Identify corner spaces vs edge spaces
          const isCorner = [0, 10, 20, 30].includes(space.position);
          
          // Determine rotation based on board side
          let rotationClass = '';
          if (!isCorner) {
            if (space.position > 0 && space.position < 10) rotationClass = ''; // Bottom
            if (space.position > 10 && space.position < 20) rotationClass = 'rotate-90'; // Left
            if (space.position > 20 && space.position < 30) rotationClass = 'rotate-180'; // Top
            if (space.position > 30 && space.position < 40) rotationClass = '-rotate-90'; // Right
          }

          const propState = gameState.propertyStates[space.id];
          const owner = propState?.ownerId ? gameState.players.find(p => p.id === propState.ownerId) : null;

          return (
            <div 
              key={space.id} 
              style={{ gridRow, gridColumn }}
              className={`relative bg-[#cde6d0] border border-slate-400 flex flex-col ${isCorner ? 'p-2' : ''} ${space.position === 0 ? 'bg-red-100' : ''}`}
            >
              <div className={`w-full h-full flex flex-col ${rotationClass}`}>
                {/* Property Color Bar */}
                {space.groupColor && (
                  <div 
                    className="w-full h-1/4 border-b border-slate-400"
                    style={{ backgroundColor: space.groupColor }}
                  />
                )}
                
                {/* Space Details */}
                <div className={`flex-1 flex flex-col items-center justify-center p-1 text-center ${isCorner ? 'transform rotate-45' : ''}`}>
                  <span className={`font-bold leading-tight uppercase ${isCorner ? 'text-lg' : 'text-[0.5rem] lg:text-[0.6rem]'}`}>
                    {space.name}
                  </span>
                  {space.price && (
                    <span className="text-[0.45rem] lg:text-[0.55rem] text-slate-700 font-semibold mt-1">
                      ${space.price}
                    </span>
                  )}
                </div>
              </div>

              {/* Ownership Indicator */}
              {owner && (
                <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: owner.token === '🚗' ? 'red' : 'blue' }}>
                  {/* Simplistic ownership marker. In a real app we'd map player colors */}
                  <div className="w-full h-full bg-slate-800 opacity-80" />
                </div>
              )}
            </div>
          );
        })}

        {/* Center Logo Area (Occupies rows 2-10, cols 2-10) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-[#cde6d0] flex items-center justify-center">
           <div className="transform -rotate-45 p-12">
             <h1 className="text-7xl lg:text-8xl font-black text-red-600 drop-shadow-lg tracking-widest uppercase border-[6px] border-red-600 px-8 py-2 bg-white flex flex-col items-center shadow-[10px_10px_0px_rgba(0,0,0,0.2)]">
                <span className="text-xl tracking-widest text-slate-800 font-bold -mb-2 mt-2">A.I.</span>
                MONOPOLY
             </h1>
           </div>
        </div>
      </div>

      {/* Players/Tokens Overlay */}
      <div className="absolute inset-2 pointer-events-none">
        <div className="relative w-full h-full grid grid-cols-11 grid-rows-11 gap-[2px]">
           {gameState.players.map((player, idx) => {
             const { gridRow, gridColumn } = getGridPosition(player.position);
             
             // Offset multiple players on the same space so they don't overlap perfectly
             const offset = (idx * 5) - (gameState.players.length * 2.5);

             return (
               <motion.div
                 key={player.id}
                 layout
                 initial={{ scale: 0 }}
                 animate={{ scale: 1, x: offset, y: offset }}
                 transition={{ type: "spring", stiffness: 100, damping: 15 }}
                 style={{ gridRow, gridColumn }}
                 className="flex items-center justify-center z-50 w-full h-full pointer-events-none"
               >
                 <div className="text-2xl lg:text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] filter">
                   {player.token}
                 </div>
               </motion.div>
             );
           })}
        </div>
      </div>

    </div>
  );
};
