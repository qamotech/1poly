import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, GamePhase, SpaceType } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';
import { Dice3D } from './Dice3D';
import { 
  Train, 
  Lightbulb, 
  Droplet, 
  HelpCircle, 
  Briefcase, 
  Receipt, 
  Gem, 
  ShieldAlert, 
  Car, 
  Flag, 
  Flame, 
  Sparkles,
  Building,
  Home,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2
} from 'lucide-react';

const renderSpaceIcon = (space: any, isCorner: boolean) => {
  const iconSize = isCorner ? 26 : 20;
  if (space.type === SpaceType.RAILROAD) {
    return <Train size={iconSize} className="text-slate-800 drop-shadow-sm" />;
  }
  if (space.type === SpaceType.UTILITY) {
    return space.name.includes('Water') 
      ? <Droplet size={iconSize} className="text-cyan-700 drop-shadow-sm fill-cyan-400/30" /> 
      : <Lightbulb size={iconSize} className="text-amber-600 drop-shadow-sm fill-amber-300/40" />;
  }
  if (space.type === SpaceType.CHANCE) {
    return <HelpCircle size={iconSize} className="text-orange-600 drop-shadow-sm stroke-[2.5]" />;
  }
  if (space.type === SpaceType.COMMUNITY_CHEST) {
    return <Briefcase size={iconSize} className="text-blue-700 drop-shadow-sm" />;
  }
  if (space.type === SpaceType.TAX) {
    return space.name.includes('Luxury') 
      ? <Gem size={iconSize} className="text-purple-700 drop-shadow-sm" /> 
      : <Receipt size={iconSize} className="text-rose-700 drop-shadow-sm" />;
  }
  if (space.name === 'Jail') {
    return <ShieldAlert size={iconSize} className="text-orange-700 drop-shadow-sm" />;
  }
  if (space.name === 'Go To Jail') {
    return <ShieldAlert size={iconSize} className="text-red-700 drop-shadow-sm animate-pulse" />;
  }
  if (space.name === 'Free Parking') {
    return <Car size={iconSize} className="text-emerald-700 drop-shadow-sm fill-emerald-400/30" />;
  }
  if (space.name === 'GO') {
    return <Flag size={iconSize} className="text-red-600 drop-shadow-sm fill-red-500" />;
  }
  return null;
};

interface BoardProps {
  gameState: GameState;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyProperty: () => void;
  onDeclineProperty?: () => void;
  onOpenTradeModal: () => void;
  onOpenPropertyModal: () => void;
  isCpuTurn: boolean;
  onPayBail?: () => void;
}

export const Board: React.FC<BoardProps> = ({ gameState, onRoll, onEndTurn, onBuyProperty, onDeclineProperty, onOpenTradeModal, onOpenPropertyModal, isCpuTurn, onPayBail }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    audio.playUiClick();
    setZoomMultiplier(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    audio.playUiClick();
    setZoomMultiplier(prev => {
      const next = Math.max(0.75, Number((prev - 0.15).toFixed(2)));
      if (next <= 1.0) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetView = () => {
    audio.playUiClick();
    setZoomMultiplier(1);
    setPanOffset({ x: 0, y: 0 });
    setTilt({ x: 0, y: 0 });
  };

  const stateRef = useRef({ zoomMultiplier, isDragging, scale, panOffset });
  useEffect(() => {
    stateRef.current = { zoomMultiplier, isDragging, scale, panOffset };
  }, [zoomMultiplier, isDragging, scale, panOffset]);

  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement) => {
    if (target.closest('button, [role="button"], input, #title-deed-modal, #board-zoom-toolbar')) return;
    const currentZoom = stateRef.current.zoomMultiplier;
    if (currentZoom <= 1.0) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: stateRef.current.panOffset.x,
      panY: stateRef.current.panOffset.y,
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return;
    const { zoomMultiplier: currentZoom, scale: currentScale } = stateRef.current;
    const effScale = Math.max(0.2, currentScale * currentZoom);
    const dx = (clientX - dragStartRef.current.x) / effScale;
    const dy = (clientY - dragStartRef.current.y) / effScale;
    const maxPan = 350 * (currentZoom - 0.8);
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width - 0.5) * 2; // -1 to 1
    const yPct = (y / rect.height - 0.5) * 2; // -1 to 1
    setTilt({ x: -yPct * 4, y: xPct * 4 }); // 4 degree max tilt
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Listen to mouse/touch drag-to-pan events directly on the entire view panel container
  useEffect(() => {
    const viewPanel = document.getElementById('view-panel-board');
    if (!viewPanel) return;

    const updateCursor = () => {
      if (zoomMultiplier > 1.0) {
        viewPanel.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else {
        viewPanel.style.cursor = '';
      }
    };
    updateCursor();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      handleDragStart(e.clientX, e.clientY, e.target as HTMLElement);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleDragEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY, e.target as HTMLElement);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = () => {
      handleDragEnd();
    };

    viewPanel.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    viewPanel.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      viewPanel.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      viewPanel.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      viewPanel.style.cursor = '';
    };
  }, [zoomMultiplier, isDragging]);

  const [isRolling, setIsRolling] = useState(false);

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

  const hasDoublesRollAgain = 
    gameState.phase === GamePhase.POST_ROLL &&
    !currentPlayer?.inJail &&
    !currentPlayer?.isBankrupt &&
    gameState.doublesRolledCount > 0 &&
    gameState.doublesRolledCount < 3 &&
    gameState.lastDiceRoll !== null &&
    gameState.lastDiceRoll[0] === gameState.lastDiceRoll[1];

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

  // A standard board is 11x11 squares.
  const getGridPosition = (position: number) => {
    if (position >= 0 && position <= 10) return { gridRow: 11, gridColumn: 11 - position };
    if (position > 10 && position <= 20) return { gridRow: 11 - (position - 10), gridColumn: 1 };
    if (position > 20 && position <= 30) return { gridRow: 1, gridColumn: 1 + (position - 20) };
    return { gridRow: 1 + (position - 30), gridColumn: 11 };
  };

  // Maps 1-indexed grid position to absolute percentage positions on the board
  const getPercent = (index: number) => {
    if (index === 1) return { start: 0, size: 12.5 };
    if (index === 11) return { start: 87.5, size: 12.5 };
    return { start: 12.5 + (index - 2) * (100 / 12), size: 100 / 12 };
  };

  return (
    // Outer responsive container
    <div 
      ref={containerRef} 
      className={`w-full aspect-square max-w-[800px] mx-auto relative rounded-xl shadow-2xl bg-[#cde6d0] overflow-hidden transition-transform duration-200 ease-out select-none ${
        zoomMultiplier > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
    >
      {/* Floating Secondary Navigation & Quick Zoom Toolbar */}
      <div
        id="board-zoom-toolbar"
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex items-center gap-1 p-1 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl transition-all select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          id="board-zoom-out-btn"
          type="button"
          onClick={handleZoomOut}
          disabled={zoomMultiplier <= 0.75}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
        >
          <ZoomOut size={15} />
        </button>

        <span
          id="board-zoom-indicator"
          title="Current Zoom Level"
          className="px-1.5 py-0.5 text-[11px] sm:text-xs font-mono font-bold text-emerald-400 bg-slate-950/60 rounded border border-slate-800 min-w-[40px] text-center select-none"
        >
          {Math.round(zoomMultiplier * 100)}%
        </span>

        <button
          id="board-zoom-in-btn"
          type="button"
          onClick={handleZoomIn}
          disabled={zoomMultiplier >= 2.0}
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
        >
          <ZoomIn size={15} />
        </button>

        <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

        <button
          id="board-reset-view-btn"
          type="button"
          onClick={handleResetView}
          title="Reset View (100% Zoom & Centered)"
          aria-label="Reset View"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw size={12} className={zoomMultiplier !== 1 || panOffset.x !== 0 || panOffset.y !== 0 ? 'text-amber-400' : 'text-slate-400'} />
          <span className="hidden xs:inline">Reset View</span>
        </button>
      </div>

      {/* Inner fixed-size scaling board. This guarantees no text wrapping/jumbling on mobile. */}
      <div 
        style={{ 
          width: '800px', 
          height: '800px', 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${panOffset.x * scale}px), calc(-50% + ${panOffset.y * scale}px)) scale(${scale * zoomMultiplier})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
        className="bg-[#b3d4b8] border-[12px] border-slate-300 border-t-slate-200 border-l-slate-200 border-b-slate-500 border-r-slate-500 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] p-[8px]"
      >
        <div style={{ gridTemplateColumns: '1.5fr repeat(9, 1fr) 1.5fr', gridTemplateRows: '1.5fr repeat(9, 1fr) 1.5fr' }} className="w-full h-full grid gap-[2px] relative">
          {SPACES.map((space) => {
            const { gridRow, gridColumn } = getGridPosition(space.position);
            const isCorner = [0, 10, 20, 30].includes(space.position);
            const isGo = space.position === 0;
            
            let contentDirClass = 'flex-col';
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
            }

            const propState = gameState.propertyStates[space.id];
            const owner = propState?.ownerId ? gameState.players.find(p => p.id === propState.ownerId) : null;

            const bgClass = isGo 
              ? 'bg-gradient-to-br from-yellow-200 via-orange-200 to-red-400'
              : 'bg-gradient-to-br from-[#f2f9f3] to-[#cde6d0]';

            const isSelected = selectedSpaceId === space.id;
            const isCurrentPlayerPosition = currentPlayer?.position === space.position;
            const isLandedOn = (gameState.phase === GamePhase.POST_ROLL || gameState.phase === GamePhase.TURN_START) && 
                               isCurrentPlayerPosition && 
                               visualPositions[currentPlayer?.id] === space.position;
            const shouldHighlight = isLandedOn || isSelected;

            return (
              <motion.div 
                key={space.id} 
                id={`board-space-${space.id}`}
                style={{ gridRow, gridColumn }}
                animate={shouldHighlight ? { 
                  scale: isSelected ? [1, 1.03, 1] : [1, 1.05, 1], 
                  zIndex: 15 
                } : { 
                  scale: 1, 
                  zIndex: 1 
                }}
                transition={shouldHighlight ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                onClick={() => setSelectedSpaceId(space.id)}
                className={`group relative ${bgClass} border border-slate-600/60 flex flex-col overflow-hidden cursor-pointer hover:brightness-105 transition-all select-none ${isCorner ? 'p-1.5' : ''}`}
              >
                {/* Subtle Framer Motion Pulsing Border Overlay for High-Visibility Navigation */}
                {shouldHighlight && (
                  <motion.div
                    id={`board-space-pulse-${space.id}`}
                    initial={{ opacity: 0.6 }}
                    animate={{
                      opacity: [0.65, 1, 0.65],
                      boxShadow: isSelected
                        ? [
                            'inset 0 0 0 2px #06b6d4, 0 0 8px 2px rgba(6, 182, 212, 0.6)',
                            'inset 0 0 0 3px #22d3ee, 0 0 18px 5px rgba(6, 182, 212, 0.85)',
                            'inset 0 0 0 2px #06b6d4, 0 0 8px 2px rgba(6, 182, 212, 0.6)'
                          ]
                        : [
                            'inset 0 0 0 2px #f59e0b, 0 0 10px 2px rgba(245, 158, 11, 0.7)',
                            'inset 0 0 0 3.5px #fbbf24, 0 0 22px 6px rgba(245, 158, 11, 0.95)',
                            'inset 0 0 0 2px #f59e0b, 0 0 10px 2px rgba(245, 158, 11, 0.7)'
                          ]
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 pointer-events-none z-30 rounded-[2px]"
                  />
                )}

                <div className={`w-full h-full flex ${contentDirClass}`}>
                  {/* Property Color Bar */}
                  {space.groupColor && (
                    <div 
                      className={`${colorBarClass} shrink-0 border-slate-900/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.6)] flex items-center justify-center gap-1 relative overflow-hidden`}
                      style={{ backgroundColor: space.groupColor }}
                    >
                      {propState?.hasHotel ? (
                        <div className="w-4 h-3 bg-red-600 border border-red-950 rounded-sm shadow-sm flex items-center justify-center text-[7px] text-white font-black">
                          H
                        </div>
                      ) : propState?.houses > 0 ? (
                        Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 bg-emerald-500 border border-emerald-950 rounded-xs shadow-xs"></div>
                        ))
                      ) : null}
                    </div>
                  )}
                  
                  {/* Space Details */}
                  <div className={`flex-1 flex flex-col items-center justify-between p-1 text-center ${isCorner ? 'transform rotate-45 justify-center gap-1' : ''}`}>
                    <div className={`flex flex-col items-center justify-center gap-0.5 w-full ${contentRotClass}`}>
                      {/* Space Name */}
                      <span className={`font-bold tracking-tight text-slate-900 leading-[1.05] ${isCorner ? 'text-[11px] uppercase font-black' : 'text-[8.5px]'}`}>
                        {space.name}
                      </span>

                      {/* Icon */}
                      {renderSpaceIcon(space, isCorner) && (
                        <div className="my-0.5 flex items-center justify-center">
                          {renderSpaceIcon(space, isCorner)}
                        </div>
                      )}

                      {/* Price Badge */}
                      {space.price && !isCorner && (
                        <span className="text-[8px] font-mono font-bold text-slate-700 bg-slate-200/80 px-1 py-0.2 rounded-xs">
                          ${space.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mortgaged Visual Badge */}
                {propState?.isMortgaged && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-500/70 shadow-sm">
                      MORTGAGED
                    </span>
                  </div>
                )}

                {/* Ownership Ribbon Indicator */}
                {owner && !propState?.isMortgaged && (
                  <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-900/90 flex items-center justify-center z-5 border-t border-slate-700">
                    <span className="text-[7px] leading-none select-none">{owner.token}</span>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Center Area */}
          <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-[#c5e1c8] flex flex-col items-center justify-center pointer-events-none z-10">
             
             {/* Center Rotation Container */}
             <div className="transform -rotate-45 flex flex-col items-center justify-center gap-5 w-full h-full pointer-events-none">

               {/* Center Logo graphic */}
               <div className="flex flex-col items-center pointer-events-none select-none -mb-2">
                 <div className="px-6 py-2 bg-red-600 border-4 border-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] rounded-lg transform -rotate-2">
                   <h1 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">
                     1POLY
                   </h1>
                 </div>
               </div>

               {/* Free Parking Pot - Vibrant Design */}
               {gameState.pot > 0 && (
                 <motion.div 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 p-3 rounded-2xl shadow-[0_0_35px_rgba(168,85,247,0.6)] border-3 border-amber-400 flex flex-col items-center justify-center relative overflow-hidden pointer-events-auto min-w-[180px]"
                 >
                   <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                   <h3 className="text-amber-200 text-[11px] uppercase tracking-widest mb-0.5 relative z-10 flex items-center gap-1.5 font-black drop-shadow-md">
                     <Car size={13} className="text-amber-300 fill-amber-300" /> FREE PARKING POT
                   </h3>
                   <p className="text-amber-300 font-mono text-4xl font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.7)] relative z-10">
                     ${gameState.pot}
                   </p>
                 </motion.div>
               )}

               {/* Action Center overlay */}
               <div className="pointer-events-auto flex flex-col items-center gap-4 w-72">
                       <button 
                    onClick={() => {
                      if (gameState.phase === GamePhase.TURN_START || hasDoublesRollAgain) {
                        setIsRolling(true);
                        audio.playDice(0);
                        setTimeout(() => {
                          onRoll();
                          setIsRolling(false);
                        }, 1200);
                      } else if (gameState.phase === GamePhase.POST_ROLL) {
                        audio.playUiClick();
                        onEndTurn();
                      }
                    }}
                    disabled={isCpuTurn || isRolling || (gameState.phase !== GamePhase.TURN_START && gameState.phase !== GamePhase.POST_ROLL)}
                    className={`w-full font-bold py-5 px-6 rounded-xl transition-all text-2xl md:text-3xl shadow-xl border-4
                      ${!isCpuTurn && !isRolling && (gameState.phase === GamePhase.TURN_START || hasDoublesRollAgain)
                        ? (hasDoublesRollAgain 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400 cursor-pointer animate-pulse' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 cursor-pointer animate-pulse')
                        : !isCpuTurn && !isRolling && gameState.phase === GamePhase.POST_ROLL
                        ? (gameState.players[gameState.currentPlayerIndex]?.money < 0 ? 'bg-red-900 hover:bg-red-800 text-red-100 border-red-700 cursor-pointer animate-pulse' : 'bg-red-600 hover:bg-red-500 text-white border-red-400 cursor-pointer animate-pulse')
                        : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed opacity-80'
                      }
                    `}
                  >
                    {isRolling 
                      ? 'ROLLING...' 
                      : gameState.phase === GamePhase.TURN_START 
                      ? 'ROLL DICE' 
                      : hasDoublesRollAgain 
                      ? 'ROLL DICE 🎲' 
                      : (gameState.players[gameState.currentPlayerIndex]?.money < 0 && !isCpuTurn ? 'BANKRUPT 💀' : 'END TURN')}
                  </button>

                  {/* Dice visual */}
                  {(gameState.lastDiceRoll || isRolling) && (
                    <div className="flex flex-col items-center gap-2 py-1 pb-4">
                      <div className="flex justify-center gap-6">
                        <Dice3D rolling={isRolling} face={gameState.lastDiceRoll ? gameState.lastDiceRoll[0] : 1} />
                        <Dice3D rolling={isRolling} face={gameState.lastDiceRoll ? gameState.lastDiceRoll[1] : 1} />
                      </div>
                      {!isRolling && gameState.lastDiceRoll && (
                        <div 
                          className={`text-xs font-bold px-3 py-1 rounded-full border shadow-md flex items-center gap-1.5 transition-all ${
                            gameState.lastDiceRoll[0] === gameState.lastDiceRoll[1]
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-slate-800/90 text-slate-300 border-slate-700'
                          }`}
                        >
                          {gameState.lastDiceRoll[0] === gameState.lastDiceRoll[1] 
                            ? `🎲 DOUBLES! (${gameState.lastDiceRoll[0]} & ${gameState.lastDiceRoll[1]})` 
                            : `🎲 Total: ${gameState.lastDiceRoll[0] + gameState.lastDiceRoll[1]} (${gameState.lastDiceRoll[0]} & ${gameState.lastDiceRoll[1]})`
                          }
                        </div>
                      )}
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
                      className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all shadow flex items-center justify-center gap-2 text-base md:text-lg
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

                  {/* Buy / Auction Property Actions */}
                  <AnimatePresence>
                    {gameState.phase === GamePhase.POST_ROLL && !isCpuTurn && currentSpace && [SpaceType.PROPERTY, SpaceType.RAILROAD, SpaceType.UTILITY].includes(currentSpace.type) && propertyState && !propertyState.ownerId && currentSpace.price !== undefined && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full flex flex-col gap-1.5 mt-2 pointer-events-auto"
                      >
                        {canBuyProperty && (
                          <button 
                            onClick={() => {
                              audio.playUiClick();
                              onBuyProperty();
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 border-4 border-emerald-400 text-white font-black py-2.5 px-4 rounded-xl transition-colors shadow-2xl flex flex-col items-center justify-center cursor-pointer"
                          >
                            <span className="text-lg leading-tight">BUY {currentSpace.name.toUpperCase()}</span>
                            <span className="text-sm text-emerald-200 font-mono">${currentSpace.price}</span>
                          </button>
                        )}
                        
                        {onDeclineProperty && (
                          <button
                            onClick={() => {
                              audio.playUiClick();
                              onDeclineProperty();
                            }}
                            className="w-full bg-amber-600 hover:bg-amber-500 border-2 border-amber-400 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow cursor-pointer"
                          >
                            <span>🔨</span> Pass to Auction (Bidding for All)
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Players/Tokens Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="relative w-full h-full">
                {gameState.players.filter(p => !p.isBankrupt).map((player, idx) => {
                  const currentVisualPos = visualPositions[player.id] !== undefined ? visualPositions[player.id] : player.position;
                  const { gridRow, gridColumn } = getGridPosition(currentVisualPos);
                  
                  const colInfo = getPercent(gridColumn);
                  const rowInfo = getPercent(gridRow);

                  // Offset multiple players on the same space
                  const offset = (idx * 5) - (gameState.players.filter(p => !p.isBankrupt).length * 2.5);

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ 
                        left: `${colInfo.start}%`, 
                        top: `${rowInfo.start}%`,
                        width: `${colInfo.size}%`,
                        height: `${rowInfo.size}%`,
                        scale: 0 
                      }}
                      animate={{
                        left: `${colInfo.start}%`,
                        top: `${rowInfo.start}%`,
                        width: `${colInfo.size}%`,
                        height: `${rowInfo.size}%`,
                        scale: player.id === currentPlayer?.id && isRolling ? 1.25 : 1,
                        x: offset,
                        y: player.id === currentPlayer?.id && isRolling ? [offset, offset - 15, offset] : offset,
                        rotate: player.id === currentPlayer?.id && isRolling ? [0, -10, 10, 0] : 0,
                      }}
                      transition={{
                        left: { type: "spring", stiffness: 100, damping: 15 },
                        top: { type: "spring", stiffness: 100, damping: 15 },
                        scale: { type: "spring", stiffness: 300, damping: 25 },
                        y: player.id === currentPlayer?.id && isRolling 
                          ? { duration: 0.3, repeat: Infinity, ease: "easeInOut" }
                          : { type: "spring", stiffness: 300, damping: 25 },
                        rotate: player.id === currentPlayer?.id && isRolling
                          ? { duration: 0.3, repeat: Infinity, ease: "easeInOut" }
                          : { type: "spring", stiffness: 300, damping: 25 }
                      }}
                      style={{
                        position: 'absolute',
                        zIndex: player.id === currentPlayer?.id ? 25 : 20,
                      }}
                      className="flex items-center justify-center pointer-events-none"
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
