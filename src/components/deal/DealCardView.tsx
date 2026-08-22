import React from 'react';
import { motion } from 'motion/react';
import { DealCard, DealCardType, DealColor, DealActionName } from '../../deal/dealTypes';
import { COLOR_CONFIG } from '../../deal/dealCards';
import { DollarSign, Home, Shield, Swords, Sparkles, Building, Shuffle, Zap } from 'lucide-react';

interface DealCardViewProps {
  card: DealCard;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showActionButtons?: boolean;
  onBank?: () => void;
  onPlayProperty?: (color?: DealColor) => void;
  onPlayAction?: () => void;
  onMoveWildcard?: () => void;
  disabled?: boolean;
}

export const DealCardView: React.FC<DealCardViewProps> = ({
  card,
  onClick,
  isSelected = false,
  isPlayable = true,
  size = 'md',
  showActionButtons = false,
  onBank,
  onPlayProperty,
  onPlayAction,
  onMoveWildcard,
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'w-20 h-28 text-[9px]',
    md: 'w-28 h-40 text-[11px]',
    lg: 'w-36 h-52 text-xs',
  }[size];

  // Derive card styling
  let topBarColor = 'bg-slate-700';
  let cardBorder = 'border-slate-700';
  let cardBg = 'bg-slate-900';
  let cardTitle = card.name;
  let typeLabel = 'Card';

  if (card.type === DealCardType.MONEY) {
    topBarColor = 'bg-emerald-700';
    cardBorder = 'border-emerald-500/80';
    cardBg = 'bg-gradient-to-b from-emerald-950/90 to-slate-950';
    typeLabel = 'MONEY';
  } else if (card.type === DealCardType.PROPERTY) {
    const config = card.color ? COLOR_CONFIG[card.color] : null;
    topBarColor = config ? config.bgClass : 'bg-slate-700';
    cardBorder = config ? config.borderClass : 'border-slate-600';
    cardBg = 'bg-slate-950';
    typeLabel = 'PROPERTY';
  } else if (card.type === DealCardType.PROPERTY_WILD) {
    topBarColor = 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500';
    cardBorder = 'border-yellow-400';
    cardBg = 'bg-gradient-to-b from-slate-900 to-slate-950';
    typeLabel = 'WILDCARD';
  } else if (card.type === DealCardType.RENT) {
    topBarColor = 'bg-gradient-to-r from-blue-700 to-cyan-600';
    cardBorder = 'border-cyan-500';
    cardBg = 'bg-slate-950';
    typeLabel = 'RENT';
  } else if (card.type === DealCardType.BUILDING) {
    topBarColor = card.actionName === DealActionName.HOTEL ? 'bg-red-700' : 'bg-emerald-700';
    cardBorder = card.actionName === DealActionName.HOTEL ? 'border-red-500' : 'border-emerald-500';
    cardBg = 'bg-slate-950';
    typeLabel = 'BUILDING';
  } else if (card.type === DealCardType.ACTION) {
    topBarColor = 'bg-amber-600';
    cardBorder = 'border-amber-400';
    cardBg = 'bg-slate-950';
    typeLabel = 'ACTION';
  }

  return (
    <motion.div
      whileHover={!disabled && isPlayable ? { y: -6, scale: 1.03 } : {}}
      whileTap={!disabled && isPlayable ? { scale: 0.97 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`relative ${sizeClasses} rounded-xl border-2 ${cardBorder} ${cardBg} shadow-lg flex flex-col justify-between overflow-hidden select-none cursor-pointer transition-shadow ${
        isSelected ? 'ring-4 ring-yellow-400 scale-105 z-20 shadow-[0_0_20px_rgba(250,204,21,0.6)]' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Top Value and Color Bar */}
      <div className={`${topBarColor} px-1.5 py-1 flex items-center justify-between text-white font-black shadow-inner`}>
        <span className="text-[10px] sm:text-xs font-mono drop-shadow-sm">
          ${card.value}M
        </span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold opacity-90 truncate max-w-[65%]">
          {typeLabel}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-1.5 flex flex-col items-center justify-center text-center gap-1">
        {/* Visual Badge Icon */}
        {card.type === DealCardType.MONEY && (
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-mono font-black text-sm shadow-inner">
            ${card.value}M
          </div>
        )}

        {card.type === DealCardType.PROPERTY && (
          <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
            <Home size={14} />
          </div>
        )}

        {card.type === DealCardType.PROPERTY_WILD && (
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold">
            <Shuffle size={14} />
          </div>
        )}

        {card.type === DealCardType.ACTION && (
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center justify-center">
            {card.actionName === DealActionName.JUST_SAY_NO ? <Shield size={14} /> : <Zap size={14} />}
          </div>
        )}

        {card.type === DealCardType.RENT && (
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 flex items-center justify-center font-bold text-xs">
            $
          </div>
        )}

        {card.type === DealCardType.BUILDING && (
          <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center">
            <Building size={14} />
          </div>
        )}

        {/* Card Name */}
        <p className="font-bold text-slate-100 leading-tight line-clamp-2 px-0.5">
          {cardTitle}
        </p>

        {/* Short summary or subtext */}
        {size !== 'sm' && (
          <p className="text-[8.5px] text-slate-400 leading-none line-clamp-2 px-1">
            {card.description}
          </p>
        )}
      </div>

      {/* Wildcard Dual Color Dots indicator if wildcard */}
      {card.colors && card.colors.length > 0 && (
        <div className="flex items-center justify-center gap-1 pb-1">
          {card.colors.slice(0, 4).map((c, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full border border-slate-900 ${COLOR_CONFIG[c]?.bgClass || 'bg-slate-500'}`}
              title={COLOR_CONFIG[c]?.name}
            />
          ))}
          {card.colors.length > 4 && <span className="text-[7px] text-slate-400 font-bold">+</span>}
        </div>
      )}

      {/* Floating Action Buttons overlay if requested */}
      {showActionButtons && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 p-1 z-30">
          {/* Bank button */}
          {card.value > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBank?.();
              }}
              className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
            >
              <DollarSign size={11} /> Bank (${card.value}M)
            </button>
          )}

          {/* Play Property button */}
          {(card.type === DealCardType.PROPERTY || card.type === DealCardType.PROPERTY_WILD || card.type === DealCardType.BUILDING) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayProperty?.();
              }}
              className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-md transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
            >
              <Home size={11} /> Play Property
            </button>
          )}

          {/* Play Action button */}
          {(card.type === DealCardType.ACTION || card.type === DealCardType.RENT) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAction?.();
              }}
              className="w-full py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-[10px] rounded-md transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap size={11} /> Play Action
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
