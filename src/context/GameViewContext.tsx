import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ActiveGameView = 'board' | 'hud';

export const GAME_VIEW_STORAGE_KEY = '1poly_active_game_view';
const VIEW_CHANGE_EVENT = '1poly_view_change_event';

/**
 * Synchronously reads the saved view from localStorage with safety guards
 */
export function getSavedGameView(fallback: ActiveGameView = 'board'): ActiveGameView {
  const defaultFallback: ActiveGameView = fallback || 'board';
  if (typeof window === 'undefined') return defaultFallback;
  try {
    const saved = localStorage.getItem(GAME_VIEW_STORAGE_KEY);
    if (saved === 'board' || saved === 'hud') {
      return saved as ActiveGameView;
    }
  } catch {
    // In restricted sandbox / private browsing modes
  }
  return defaultFallback;
}

/**
 * Safely persists the game view to localStorage and dispatches a notification
 */
export function persistGameView(view: ActiveGameView): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAME_VIEW_STORAGE_KEY, view);
    // Broadcast for same-window / across components synchronization
    window.dispatchEvent(
      new CustomEvent(VIEW_CHANGE_EVENT, { detail: { view } })
    );
  } catch {
    // In restricted sandbox / storage quota exceeded
  }
}

interface GameViewContextValue {
  activeView: ActiveGameView;
  setActiveView: (view: ActiveGameView) => void;
  toggleView: () => void;
  isBoard: boolean;
  isHud: boolean;
}

const GameViewContext = createContext<GameViewContextValue | null>(null);

export function GameViewProvider({
  children,
  defaultView = 'board',
}: {
  children: React.ReactNode;
  defaultView?: ActiveGameView;
}) {
  // Synchronously initialize from localStorage to guarantee instant mount restoration
  const [activeView, setActiveViewState] = useState<ActiveGameView>(() => {
    return getSavedGameView(defaultView);
  });

  const setActiveView = useCallback((view: ActiveGameView) => {
    setActiveViewState(view);
    persistGameView(view);
  }, []);

  const toggleView = useCallback(() => {
    setActiveViewState((current) => {
      const nextView = current === 'board' ? 'hud' : 'board';
      persistGameView(nextView);
      return nextView;
    });
  }, []);

  // Multi-tier orientation, resize, and storage synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncWithStorage = () => {
      const currentPersisted = getSavedGameView(activeView);
      setActiveViewState((prev) => (prev !== currentPersisted ? currentPersisted : prev));
    };

    // 1. Storage event from other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === GAME_VIEW_STORAGE_KEY && e.newValue) {
        if (e.newValue === 'board' || e.newValue === 'hud') {
          setActiveViewState(e.newValue);
        }
      }
    };

    // 2. Intra-window custom event
    const handleCustomViewChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ view: ActiveGameView }>;
      if (customEvent.detail?.view) {
        setActiveViewState(customEvent.detail.view);
      }
    };

    // 3. Screen orientation changes (modern & legacy)
    const handleOrientationChange = () => {
      // Re-verify that orientation shift didn't desync active view
      syncWithStorage();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(VIEW_CHANGE_EVENT, handleCustomViewChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }

    const portraitMql = window.matchMedia?.('(orientation: portrait)');
    const landscapeMql = window.matchMedia?.('(orientation: landscape)');
    portraitMql?.addEventListener?.('change', handleOrientationChange);
    landscapeMql?.addEventListener?.('change', handleOrientationChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(VIEW_CHANGE_EVENT, handleCustomViewChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);

      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      portraitMql?.removeEventListener?.('change', handleOrientationChange);
      landscapeMql?.removeEventListener?.('change', handleOrientationChange);
    };
  }, [activeView]);

  const value = useMemo<GameViewContextValue>(
    () => ({
      activeView,
      setActiveView,
      toggleView,
      isBoard: activeView === 'board',
      isHud: activeView === 'hud',
    }),
    [activeView, setActiveView, toggleView]
  );

  return <GameViewContext.Provider value={value}>{children}</GameViewContext.Provider>;
};

/**
 * Hook to consume persistent active view state from context.
 * Automatically falls back gracefully to standalone persistent storage if used outside provider.
 */
export function useGameView(): GameViewContextValue {
  const context = useContext(GameViewContext);
  if (!context) {
    // Graceful fallback if component is rendered outside GameViewProvider
    const [fallbackView, setFallbackViewState] = useState<ActiveGameView>(() => getSavedGameView('board'));

    const setView = (v: ActiveGameView) => {
      setFallbackViewState(v);
      persistGameView(v);
    };

    const toggle = () => {
      setFallbackViewState((curr) => {
        const next = curr === 'board' ? 'hud' : 'board';
        persistGameView(next);
        return next;
      });
    };

    return {
      activeView: fallbackView,
      setActiveView: setView,
      toggleView: toggle,
      isBoard: fallbackView === 'board',
      isHud: fallbackView === 'hud',
    };
  }
  return context;
}

/**
 * Compatible tuple hook `[activeView, setActiveView]` for legacy/convenience usage
 */
export function usePersistentActiveView(defaultView: ActiveGameView = 'board') {
  const context = useContext(GameViewContext);
  if (context) {
    return [context.activeView, context.setActiveView] as const;
  }

  // Standalone fallback
  const [view, setViewState] = useState<ActiveGameView>(() => getSavedGameView(defaultView));
  const setView = useCallback((v: ActiveGameView) => {
    setViewState(v);
    persistGameView(v);
  }, []);

  return [view, setView] as const;
}
