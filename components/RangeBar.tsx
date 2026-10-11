'use client';
import { useRef, useState, type CSSProperties } from 'react';

type Props = {
  value: number;
  max: number;
  step?: number;
  label: string;
  onCommit: (value: number) => void;
  /** Report every change while dragging (volume) instead of only on release (seeking). */
  live?: boolean;
  big?: boolean;
  disabled?: boolean;
  className?: string;
};

export function RangeBar({ value, max, step = 0.1, label, onCommit, live = false, big = false, disabled = false, className = '' }: Props) {
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = useRef(false);
  const top = max > 0 ? max : 1;
  const shown = Math.min(drag ?? value, top);
  const pct = Math.min(100, Math.max(0, (shown / top) * 100));

  return (
    <input
      type="range"
      aria-label={label}
      className={`range ${big ? 'big' : ''} ${className}`}
      min={0}
      max={top}
      step={step}
      value={shown}
      disabled={disabled}
      style={{ '--pct': `${pct}%` } as CSSProperties}
      onPointerDown={() => { dragging.current = true; }}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (live || !dragging.current) onCommit(v);
        if (dragging.current) setDrag(v);
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        if (!live) onCommit(Number(e.currentTarget.value));
        setDrag(null);
      }}
      onPointerCancel={() => { dragging.current = false; setDrag(null); }}
    />
  );
}
