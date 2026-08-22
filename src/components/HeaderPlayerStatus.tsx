import React from 'react';
import { Player, PlayerType } from '../types';
import { Lock, Skull, Bot, User } from 'lucide-react';
import { audio } from '../audio';

interface HeaderPlayerStatusProps {
  players: Player[];
  currentPlayerIndex: number;
  onOpenPortfolio?: () => void;
  className?: string;
}

export const HeaderPlayerStatus: React.FC<HeaderPlayerStatusProps> = ({
  players,
  currentPlayerIndex,
  onOpenPortfolio,
  className = '',
}) => {
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;

  const getPlayerStatusInfo = (player: Player, isCurrent: boolean) => {
    if (player.isBankrupt) {
      return {
        status: 'bankrupt',
        label: 'Bankrupt',
        // Subtle grey ring for bankrupt
        ringClass: 'ring-2 ring-slate-600/80 shadow-sm opacity-55 grayscale border-slate-700',
        badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
        dotColor: 'bg-slate-500',
        icon: <Skull size={10} className="text-slate-400" />,
        tooltip: `${player.name} is Bankrupt`,
      };
    }

    if (player.inJail) {
      return {
        status: 'jail',
        label: 'In Jail',
        // Subtle yellow ring for in jail
        ringClass: isCurrent
          ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] border-amber-500/80 bg-amber-950/40'
          : 'ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.25)] border-amber-500/60 bg-amber-950/20',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotColor: 'bg-amber-400',
        icon: <Lock size={10} className="text-amber-400" />,
        tooltip: `${player.name} is In Jail (Turn ${player.jailTurns + 1}/3)`,
      };
    }

    if (isCurrent) {
      return {
        status: 'active',
        label: 'Turn',
        // Subtle green ring for current turn
        ringClass: 'ring-2 ring-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.35)] border-emerald-500/80 bg-emerald-950/30',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotColor: 'bg-emerald-400 animate-pulse',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />,
        tooltip: `${player.name}'s active turn`,
      };
    }

    return {
      status: 'waiting',
      label: 'Waiting',
      // Subtle slate ring for other players
      ringClass: 'ring-1 ring-slate-700/80 hover:ring-slate-500 border-slate-800 bg-slate-800/40',
      badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
      dotColor: 'bg-slate-500',
      icon: null,
      tooltip: `${player.name} ($${player.money})`,
    };
  };

  const currentStatus = getPlayerStatusInfo(currentPlayer, true);

  return (
    <div id="header-players-status-container" className={`flex items-center gap-2 sm:gap-3 min-w-0 ${className}`}>
      {/* Primary Active Player Card */}
      <div
        id={`header-active-player-${currentPlayer.id}`}
        onClick={() => {
          if (onOpenPortfolio) {
            audio.playUiClick();
            onOpenPortfolio();
          }
        }}
        className={`group relative flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all cursor-pointer select-none min-w-0 ${currentStatus.ringClass}`}
        title={`Click to open ${currentPlayer.name}'s portfolio • ${currentStatus.tooltip}`}
      >
        {/* Token with status ring badge */}
        <div className="relative shrink-0 flex items-center justify-center">
          <span className="text-sm sm:text-base drop-shadow">{currentPlayer.token}</span>
          {/* Status Indicator Dot/Badge on Avatar */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${currentStatus.dotColor}`}
          />
        </div>

        {/* Player Name & Balance */}
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`text-xs sm:text-sm font-bold truncate max-w-[70px] xs:max-w-[95px] sm:max-w-[130px] ${
                currentPlayer.isBankrupt ? 'line-through text-slate-500' : 'text-slate-100'
              }`}
            >
              {currentPlayer.name}
            </span>

            {/* Player Type Badge (CPU / User) */}
            {currentPlayer.type === PlayerType.CPU ? (
              <span className="text-[9px] bg-blue-600/80 text-white font-bold px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                <Bot size={9} /> CPU
              </span>
            ) : (
              <span className="text-[9px] bg-slate-700/80 text-slate-300 font-medium px-1 rounded uppercase tracking-wider hidden xs:flex items-center gap-0.5 shrink-0">
                <User size={9} /> YOU
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="font-mono font-black text-emerald-400">
              ${currentPlayer.money.toLocaleString()}
            </span>
            {currentPlayer.loan ? (
              <span className="font-mono text-[10px] text-red-400 hidden sm:inline">
                -${currentPlayer.loan}
              </span>
            ) : null}
          </div>
        </div>

        {/* Status Tag Pill */}
        {currentStatus.status !== 'waiting' && (
          <span
            className={`hidden xs:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${currentStatus.badgeBg}`}
          >
            {currentStatus.icon}
            <span>{currentStatus.label}</span>
          </span>
        )}
      </div>

      {/* Mini All-Players Status Roster (Visible on larger screens to give complete game overview) */}
      <div
        id="header-mini-players-roster"
        className="hidden md:flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800/80"
        aria-label="All players status roster"
      >
        {players.map((player, idx) => {
          const isCurrent = idx === currentPlayerIndex;
          const status = getPlayerStatusInfo(player, isCurrent);

          return (
            <div
              key={player.id}
              id={`header-player-pill-${player.id}`}
              onClick={() => {
                if (onOpenPortfolio) {
                  audio.playUiClick();
                  onOpenPortfolio();
                }
              }}
              title={status.tooltip}
              className={`relative flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer text-xs select-none ${
                isCurrent
                  ? status.ringClass
                  : player.isBankrupt
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 grayscale ring-1 ring-slate-600/50'
                  : player.inJail
                  ? 'bg-amber-950/20 border-amber-600/40 text-amber-200 ring-1 ring-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.2)]'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300 ring-1 ring-slate-700/50'
              }`}
            >
              <div className="relative shrink-0">
                <span className="text-xs">{player.token}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-slate-950 ${status.dotColor}`}
                />
              </div>

              <span
                className={`text-[11px] font-bold truncate max-w-[60px] lg:max-w-[85px] ${
                  player.isBankrupt ? 'line-through text-slate-500' : 'text-slate-200'
                }`}
              >
                {player.name}
              </span>

              <span
                className={`text-[10px] font-mono font-bold ${
                  player.isBankrupt
                    ? 'text-slate-500 line-through'
                    : isCurrent
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                ${player.money}
              </span>

              {player.inJail && <Lock size={9} className="text-amber-400 shrink-0" />}
              {player.isBankrupt && <Skull size={9} className="text-slate-400 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
