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

/** Money that counts up/down to its real value. */
export const AnimatedMoney: React.FC<{ value: number; prefix?: string }> = ({ value, prefix = '$' }) => {
  const display = useAnimatedNumber(value);
  return <>{prefix}{display}</>;
};

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
