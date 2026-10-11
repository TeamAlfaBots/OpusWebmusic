'use client';
import { durationLabel } from '@/lib/music';
import { usePlayer, usePlayerTime } from '@/lib/player';
import { RangeBar } from './RangeBar';

export function Seekbar({ big = false, compact = false }: { big?: boolean; compact?: boolean }) {
  const { progress, duration } = usePlayerTime();
  const { current, seek } = usePlayer();
  const total = duration || current?.duration || 0;
  return (
    <div className={`flex w-full items-center gap-2.5 ${compact ? 'max-w-xl' : ''}`}>
      <span className="w-10 text-right text-xs tabular-nums text-white/45">{durationLabel(progress)}</span>
      <RangeBar label="Seek" value={progress} max={total} step={0.5} big={big} disabled={!current || !total} onCommit={seek} />
      <span className="w-10 text-xs tabular-nums text-white/45">{durationLabel(total)}</span>
    </div>
  );
}
