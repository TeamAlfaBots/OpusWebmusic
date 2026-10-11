'use client';
import { LoaderCircle, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '@/lib/player';

export function PlayPauseButton({ small = false }: { small?: boolean }) {
  const { playing, buffering, current, toggle } = usePlayer();
  return (
    <button className={`play-fab ${small ? 'sm' : ''}`} aria-label={playing ? 'Pause' : 'Play'} disabled={!current} onClick={toggle}>
      {buffering && playing ? (
        <LoaderCircle size={small ? 18 : 24} className="animate-spin" />
      ) : playing ? (
        <Pause size={small ? 18 : 24} fill="currentColor" />
      ) : (
        <Play size={small ? 18 : 24} fill="currentColor" className="ml-0.5" />
      )}
    </button>
  );
}

export function TransportControls({ gap = 'gap-2' }: { gap?: string }) {
  const p = usePlayer();
  return (
    <div className={`flex items-center ${gap}`}>
      <button className={`icon-btn ${p.shuffle ? 'on' : ''}`} aria-label="Shuffle" aria-pressed={p.shuffle} onClick={p.toggleShuffle}><Shuffle size={19} /></button>
      <button className="icon-btn" aria-label="Previous" disabled={!p.current} onClick={p.prev}><SkipBack size={22} fill="currentColor" /></button>
      <PlayPauseButton />
      <button className="icon-btn" aria-label="Next" disabled={!p.current} onClick={p.next}><SkipForward size={22} fill="currentColor" /></button>
      <button className={`icon-btn ${p.repeat !== 'off' ? 'on' : ''}`} aria-label={`Repeat: ${p.repeat}`} onClick={p.cycleRepeat}>
        {p.repeat === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
      </button>
    </div>
  );
}
