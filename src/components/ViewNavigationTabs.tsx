import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid, BarChart3, Dice5, ScrollText } from 'lucide-react';
import { audio } from '../audio';
import { GameState } from '../types';

export type ActiveGameView = 'board' | 'hud';

const STORAGE_KEY = '1poly_active_game_view';

/**
 * Hook to persist active view across orientation changes, reloads, and game mode switches
 */
export function usePersistentActiveView(defaultView: ActiveGameView = 'board') {
  const [activeView, setActiveViewState] = useState<ActiveGameView>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'board' || saved === 'hud') {
          return saved;
        }
      } catch {
        // Fallback if localStorage access is restricted
      }
    }
    return defaultView;
  });

  const setActiveView = (view: ActiveGameView) => {
    setActiveViewState(view);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, view);
      } catch {
        // ignore
      }
    }
  };

  // Orientation and resize change preservation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationOrResize = () => {
      // Re-affirm state from storage or current state on orientation switch
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as ActiveGameView | null;
        if (saved === 'board' || saved === 'hud') {
          setActiveViewState(saved);
        }
      } catch {
        // ignore
      }
    };

    // Modern screen orientation API
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationOrResize);
    }
    // Legacy orientationchange
    window.addEventListener('orientationchange', handleOrientationOrResize);
    // Media query orientation listeners
    const portraitMql = window.matchMedia('(orientation: portrait)');
    const landscapeMql = window.matchMedia('(orientation: landscape)');

    portraitMql.addEventListener?.('change', handleOrientationOrResize);
    landscapeMql.addEventListener?.('change', handleOrientationOrResize);

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationOrResize);
      }
      window.removeEventListener('orientationchange', handleOrientationOrResize);
      portraitMql.removeEventListener?.('change', handleOrientationOrResize);
      landscapeMql.removeEventListener?.('change', handleOrientationOrResize);
    };
  }, []);

  return [activeView, setActiveView] as const;
}

interface ViewNavigationTabsProps {
  activeView: ActiveGameView;
  onViewChange: (view: ActiveGameView) => void;
  gameState?: GameState | null;
  variant?: 'header' | 'floating-bottom' | 'embedded';
  className?: string;
}

export const ViewNavigationTabs: React.FC<ViewNavigationTabsProps> = ({
  activeView,
  onViewChange,
  gameState,
  variant = 'header',
  className = '',
}) => {
  const activePlayersCount = gameState?.players.filter((p) => !p.isBankrupt).length ?? 0;
  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;

  const handleSelect = (view: ActiveGameView) => {
    if (view !== activeView) {
      audio.playUiClick();
      onViewChange(view);
    }
  };

  const tabs: Array<{
    id: ActiveGameView;
    label: string;
    sublabel?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'board',
      label: 'Board',
      sublabel: 'Game Grid',
      icon: LayoutGrid,
      badge: currentPlayer ? (
        <span
          className="text-xs shrink-0 animate-pulse"
          title={`Turn: ${currentPlayer.name}`}
        >
          {currentPlayer.token}
        </span>
      ) : null,
    },
    {
      id: 'hud',
      label: 'Stats & Controls',
      sublabel: 'Actions & Log',
      icon: BarChart3,
      badge: (
        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono font-bold border border-slate-700">
          {activePlayersCount}
        </span>
      ),
    },
  ];

  if (variant === 'floating-bottom') {
    return (
      <div
        id="persistent-mobile-nav-bar"
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-40 lg:hidden w-[92%] max-w-sm ${className}`}
      >
        <div
          role="tablist"
          aria-label="Game view switcher"
          className="bg-slate-950/95 backdrop-blur-xl p-1.5 rounded-2xl border-2 border-slate-700/90 shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1"
        >
          {tabs.map((tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`floating-nav-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`view-panel-${tab.id}`}
                onClick={() => handleSelect(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="floatingActiveTabPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg border border-blue-400/40"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Header / Embedded variant
  return (
    <div
      role="tablist"
      aria-label="Game view tabs"
      id="header-view-navigation-tabs"
      className={`flex bg-slate-950/90 p-1 rounded-xl border border-slate-700/80 shadow-inner ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeView === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`header-nav-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`view-panel-${tab.id}`}
            onClick={() => handleSelect(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="headerActiveTabPill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 bg-blue-600 rounded-lg shadow-md border border-blue-400/30"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
};
