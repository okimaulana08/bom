import React, { useEffect, useRef, useState } from 'react';

interface RollingNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
}

/**
 * Smooth ease-out animated counter for Coins, Dust, and game reward badges.
 */
export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  durationMs = 420,
  className = '',
}) => {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    const startVal = currentRef.current;
    const diff = value - startVal;
    if (diff === 0) return;

    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startVal + diff * eased);
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        currentRef.current = value;
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return <span className={className}>{display.toLocaleString()}</span>;
};
