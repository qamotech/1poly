import React, { useState } from 'react';
import { Crown, Users, Sparkles, LogIn } from 'lucide-react';
import { audio } from '../audio';

interface RoomGateProps {
  onCreate: () => void;
  onJoin: (code: string) => void;
  onPlayCards: () => void;
  error?: string | null;
}

/**
 * Landing screen before the lobby: create a private room (you host) or join
 * one with its 4-letter code. Shown until this client is inside a room.
 */
export const RoomGate: React.FC<RoomGateProps> = ({ onCreate, onJoin, onPlayCards, error }) => {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleJoin = () => {
    audio.playUiClick();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length !== 4) {
      setLocalError('Room codes are 4 letters — check the code and try again.');
      return;
    }
    setLocalError(null);
    onJoin(cleaned);
  };

  const shownError = localError || error;

  return (
    <div className="min-h-screen bg-slate-950 fx-aura-bg fx-view-in text-slate-50 flex flex-col items-center justify-center p-4 space-y-6">
      <h1 className="text-5xl sm:text-6xl font-black fx-shimmer-text tracking-wider uppercase text-center flex items-center gap-3">
        <span className="text-4xl sm:text-5xl -scale-x-100 inline-block select-none fx-float-bob fx-runner-trail">🏃🏾‍♂️</span>
        1poly
      </h1>
      <p className="text-slate-400 text-sm font-semibold -mt-2 text-center">
        Play together from anywhere — one phone hosts, everyone else joins with a code.
      </p>

      <div className="w-full max-w-md space-y-4">
        {/* Create */}
        <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 space-y-3 shadow-2xl fx-glass">
          <div className="flex items-center gap-2 text-amber-300 font-black uppercase tracking-widest text-xs">
            <Crown size={15} /> Host a game
          </div>
          <p className="text-sm text-slate-300">
            Create a private room and share the 4-letter code — everyone joins with their own name and character token, and anyone can start the game.
          </p>
          <button
            onClick={() => {
              audio.playUiClick();
              onCreate();
            }}
            className="w-full py-3.5 fx-neon-btn font-black text-base rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <Users size={18} /> Create Game
          </button>
        </div>

        {/* Join */}
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 shadow-2xl fx-glass">
          <div className="flex items-center gap-2 text-blue-300 font-black uppercase tracking-widest text-xs">
            <LogIn size={15} /> Join a game
          </div>
          <div className="flex justify-center gap-2 fx-join-preview" aria-hidden="true">
            {[0, 1, 2, 3].map((i) =>
              code[i] ? (
                <span key={`${i}-${code[i]}`} className="fx-join-letter">
                  {code[i]}
                </span>
              ) : (
                <span key={`empty-${i}`} className="fx-join-slot">
                  –
                </span>
              ),
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder="CODE"
              autoCapitalize="characters"
              autoCorrect="off"
              className="flex-1 min-w-0 bg-slate-800 text-white text-center text-2xl font-black tracking-[0.4em] uppercase px-3 py-3 rounded-xl border-2 border-slate-600 focus:border-blue-500 outline-none placeholder:text-slate-600 placeholder:tracking-[0.4em]"
            />
            <button
              onClick={handleJoin}
              className="px-5 fx-neon-btn-blue font-black rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Join Game
            </button>
          </div>
          {shownError && (
            <div className="p-3 bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span>⚠️</span> {shownError}
            </div>
          )}
          <p className="text-xs text-slate-400">
            After joining, enter <strong className="text-slate-200">your own name</strong>, pick your{' '}
            <strong className="text-slate-200">character token</strong>, and tap Join Game — then anyone in the game can tap START GAME.
          </p>
        </div>

        <button
          onClick={() => {
            audio.playUiClick();
            onPlayCards();
          }}
          className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-blue-300 font-bold text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles size={16} /> Just play 1poly Cards (no room needed)
        </button>
      </div>
    </div>
  );
};
