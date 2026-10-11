'use client';
import { X } from 'lucide-react';
import { decode, smallImage, artistNames } from '@/lib/music';
import { upcoming } from '@/lib/queue';
import { usePlayer } from '@/lib/player';
import { Cover } from './Cover';
import { Equalizer } from './SongRow';

export function QueuePanel() {
  const p = usePlayer();
  const next = upcoming(p.queue);
  return (
    <div className="h-full overflow-y-auto pb-6 pr-1">
      {p.current && (
        <>
          <h3 className="mb-2 px-2 text-sm font-semibold text-white/55">Now playing</h3>
          <div className="row !cursor-default bg-white/5">
            <Cover src={smallImage(p.current.image)} className="h-11 w-11 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate-1 text-[15px] font-semibold text-cherry-400">{decode(p.current.name)}</p>
              <p className="truncate-1 mt-0.5 text-[13px] text-white/50">{artistNames(p.current)}</p>
            </div>
            <Equalizer paused={!p.playing} />
          </div>
        </>
      )}

      <div className="mb-2 mt-6 flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-white/55">Next up</h3>
        {next.length > 0 && <button className="text-sm font-semibold text-cherry-300 hover:underline" onClick={p.clearUpcoming}>Clear</button>}
      </div>

      {next.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">
          {p.autoplay ? 'Nothing queued. Similar songs will play when this one ends.' : 'Nothing queued. Add songs from the menu on any track.'}
        </p>
      ) : (
        next.map(({ song, orderPos }) => (
          <div key={`${orderPos}-${song.id}`} className="row" role="button" tabIndex={0} onClick={() => p.jumpToQueue(orderPos)} onKeyDown={(e) => { if (e.key === 'Enter') p.jumpToQueue(orderPos); }}>
            <Cover src={smallImage(song.image)} className="h-11 w-11 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate-1 text-[15px] font-semibold">{decode(song.name)}</p>
              <p className="truncate-1 mt-0.5 text-[13px] text-white/50">{artistNames(song)}</p>
            </div>
            <button className="icon-btn" aria-label={`Remove ${decode(song.name)} from queue`} onClick={(e) => { e.stopPropagation(); p.removeFromQueue(orderPos); }}>
              <X size={18} />
            </button>
          </div>
        ))
      )}

      <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold">Keep the music going</span>
          <span className="block text-xs text-white/45">Add similar songs when the queue ends</span>
        </span>
        <input type="checkbox" className="h-5 w-5 accent-[#ff5c7c]" checked={p.autoplay} onChange={p.toggleAutoplay} />
      </label>
    </div>
  );
}
