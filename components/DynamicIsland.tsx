'use client';
import { useLibrary } from '@/lib/library';
import { decode } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { useUI } from '@/lib/ui';
import { CherryMark } from './icons';

/**
 * An in-app lookalike of the iPhone Dynamic Island: cherries on the left, and on the right an equalizer
 * that dances while music plays and turns into a pause symbol when it is paused. (A website cannot draw
 * inside the phone's real island; on iPhone it sits right over it when the app is installed to the home screen.)
 */
export function DynamicIsland() {
  const { current, playing } = usePlayer();
  const { prefs } = useLibrary();
  const ui = useUI();
  if (!prefs.island) return null;
  const state = !current ? 'idle' : playing ? 'playing' : 'paused';
  return (
    <button
      type="button"
      className={`island ${current ? 'live' : ''}`}
      data-state={state}
      disabled={!current}
      aria-label={current ? `${decode(current.name)} is ${playing ? 'playing' : 'paused'}. Open player` : 'Cherry Music'}
      onClick={() => ui.openNowPlaying('player')}
    >
      <CherryMark size={19} />
      {current && (playing ? (
        <span className="island-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      ) : (
        <span className="island-pause" aria-hidden="true"><i /><i /></span>
      ))}
    </button>
  );
}
