'use client';
import { Trash2 } from 'lucide-react';
import { BackButton } from '@/components/DetailHeader';
import { QueuePanel } from '@/components/QueuePanel';
import { usePlayer } from '@/lib/player';

export default function QueuePage() {
  const p = usePlayer();
  return (
    <div className="page flex h-[calc(100dvh-8rem)] min-h-[420px] flex-col lg:h-[calc(100dvh-10rem)]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-3xl font-extrabold">Queue</h1>
        </div>
        <button className="icon-btn round" aria-label="Clear upcoming songs" disabled={!p.current} onClick={p.clearUpcoming}><Trash2 size={19} /></button>
      </header>
      <div className="mt-5 min-h-0 flex-1"><QueuePanel /></div>
    </div>
  );
}
