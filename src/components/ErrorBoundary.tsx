import { Component, type ReactNode } from 'react';

// Safety net for the whole app: if anything throws while rendering —
// most importantly the on-demand Cards game code failing to load on a
// flaky connection — the player gets a friendly recovery screen with a
// Reload button instead of a dead white screen. Multiplayer state lives
// on the server, so a reload drops the player right back into their
// room, seat, and match.

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  // This repo resolves React without its type package, so the base class
  // doesn't surface `props` to the checker — declare it explicitly.
  declare props: { children: ReactNode };
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Kept to the console: enough to diagnose from a connected device,
    // and the recovery path below is what the player actually needs.
    console.error('1poly hit a snag:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-6xl">😵</div>
        <h1 className="text-2xl font-black">Something glitched</h1>
        <p className="max-w-sm text-sm text-slate-300">
          No worries — your game is still running. Tap reload and you'll drop
          straight back into your room and your seat, right where you left off.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-base shadow-lg transition active:scale-95 cursor-pointer"
          type="button"
        >
          🔄 Reload 1poly
        </button>
      </div>
    );
  }
}
