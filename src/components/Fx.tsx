import React, { useEffect, useRef, useState } from 'react';

/** A7 — counts a number toward its new value whenever it changes. */
export function useAnimatedNumber(value: number, duration = 650): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    fromRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/**
 * Money that counts up/down to its real value.
 * R3-4/R3-5 — on change it flashes green (gain) or red (loss) and floats a
 * small "+$200" / "-$50" delta chip that drifts up and fades.
 */
export const AnimatedMoney: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = '$' }) => {
  const display = useAnimatedNumber(value);
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ key: number; dir: 'up' | 'down' } | null>(null);
  const [floats, setFloats] = useState<Array<{ key: number; delta: number }>>([]);
  useEffect(() => {
    if (prevRef.current !== null && value !== prevRef.current) {
      const delta = value - prevRef.current;
      const key = Date.now() + Math.random();
      setFlash({ key, dir: delta > 0 ? 'up' : 'down' });
      setFloats((f) => [...f, { key, delta }]);
      const timer = setTimeout(() => {
        setFloats((f) => f.filter((x) => x.key !== key));
      }, 1200);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);
  return (
    <span className="relative inline-block">
      <span key={flash?.key ?? 'base'} className={flash ? (flash.dir === 'up' ? 'fx-money-up' : 'fx-money-down') : undefined}>
        {prefix}{display}
      </span>
      {floats.map((f) => (
        <span key={f.key} className={`fx-money-float ${f.delta > 0 ? 'up' : 'down'}`} aria-hidden="true">
          {f.delta > 0 ? `+${prefix}${f.delta}` : `-${prefix}${Math.abs(f.delta)}`}
        </span>
      ))}
    </span>
  );
};

/** R3-9 — CSS confetti falling inside a (position:relative, overflow:hidden) card. */
export const Confetti: React.FC = () => (
  <span className="fx-confetti" aria-hidden="true">
    {Array.from({ length: 14 }, (_, i) => (
      <i
        key={i}
        style={{
          ['--cxl' as string]: `${(i * 71) % 100}%`,
          ['--cd' as string]: `${3 + ((i * 37) % 22) / 10}s`,
          ['--cdel' as string]: `${((i * 53) % 30) / 10}s`,
          ['--csx' as string]: `${((i * 29) % 41) - 20}px`,
        }}
      />
    ))}
  </span>
);

const BURST_COINS = ['🪙', '💵', '🪙', '✨', '🪙'];

/**
 * E7 — bursts coins over the parent (which must be position:relative)
 * whenever `amount` increases. Decreases and first mount stay quiet.
 */
export const CoinBurst: React.FC<{ amount: number }> = ({ amount }) => {
  const prevRef = useRef<number | null>(null);
  const [bursts, setBursts] = useState<number[]>([]);
  useEffect(() => {
    if (prevRef.current !== null && amount > prevRef.current) {
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, id]);
      const timer = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 1250);
      prevRef.current = amount;
      return () => clearTimeout(timer);
    }
    prevRef.current = amount;
  }, [amount]);
  if (bursts.length === 0) return null;
  return (
    <>
      {bursts.map((id) => (
        <span key={id} className="fx-coin-burst" aria-hidden="true">
          {BURST_COINS.map((coin, i) => (
            <i
              key={i}
              style={{ ['--cx' as string]: `${(i - 2) * 13}px`, animationDelay: `${i * 70}ms` }}
            >
              {coin}
            </i>
          ))}
        </span>
      ))}
    </>
  );
};

/**
 * C5-2 — sparkles that orbit the winner token on win screens.
 * Render inside an .fx-orbit-wrap element (position:relative); the ring
 * spins via .fx-orbit-sparkles in index.css. Pure decoration.
 */
export const OrbitSparkles: React.FC = () => (
  <span className="fx-orbit-sparkles" aria-hidden="true">
    <i /><i /><i /><i /><i /><i />
  </span>
);

/**
 * C9-2 — star burst for the DOUBLES dice readout.
 * Render inside an .fx-doubles-wrap element (position:relative);
 * 8 stars fly outward along per-star --sx/--sy vectors via
 * .fx-star-burst in index.css. Pure decoration.
 */
const STAR_VECTORS: Array<[number, number]> = [
  [-34, -16], [-18, -24], [0, -28], [18, -24],
  [34, -16], [-26, 10], [0, 16], [26, 10],
];
export const StarBurst: React.FC = () => (
  <span className="fx-star-burst" aria-hidden="true">
    {STAR_VECTORS.map(([x, y], i) => (
      <i
        key={i}
        style={{
          ['--sx' as string]: `${x}px`,
          ['--sy' as string]: `${y}px`,
          animationDelay: `${i * 90}ms`,
        }}
      >
        {i % 2 === 0 ? '✦' : '⭐'}
      </i>
    ))}
  </span>
);

/** A8 — renders text with each letter waving in sequence. */
export const WaveText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('').map((ch, i) => (
      <span key={i} className="fx-wave-letter" style={{ animationDelay: `${i * 90}ms` }}>
        {ch === ' ' ? '\u00A0' : ch}
      </span>
    ))}
  </>
);
