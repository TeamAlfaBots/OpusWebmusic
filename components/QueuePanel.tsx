'use client';
import { useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { artistNames, decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { upcoming } from '@/lib/queue';
import { useUI } from '@/lib/ui';
import { Cover } from './Cover';
import { Equalizer } from './SongRow';

/** Now playing + numbered "Next in queue" list. Drag the grip handle to reorder. */
export function QueuePanel() {
  const p = usePlayer();
  const lib = useLibrary();
  const ui = useUI();
  const next = upcoming(p.queue);
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);

  const save = async () => {
    if (!next.length && !p.current) return;
    const name = await ui.askName('Save queue as playlist', 'My queue', 'Save');
    if (!name) return;
    const songs = [...(p.current ? [p.current] : []), ...next.map((n) => n.song)];
    lib.createPlaylist(name, songs);
    ui.toast(`Saved “${name}”`);
  };

  const startDrag = (e: React.PointerEvent, orderPos: number) => {
    e.preventDefault();
    e.stopPropagation();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-qpos]') ?? []);
    if (!items.length) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    let over = orderPos;
    setDrag({ from: orderPos, over });
    const move = (ev: PointerEvent) => {
      let best = orderPos;
      for (const el of items) {
        const r = el.getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) best = Number(el.dataset.qpos);
      }
      if (ev.clientY < items[0].getBoundingClientRect().top) best = Number(items[0].dataset.qpos);
      if (ev.clientY > items[items.length - 1].getBoundingClientRect().bottom) best = Number(items[items.length - 1].dataset.qpos);
      if (best !== over) { over = best; setDrag({ from: orderPos, over }); }
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      setDrag(null);
      if (over !== orderPos) p.moveInQueue(orderPos, over);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  return (
    <div className="h-full overflow-y-auto pb-6">
      {p.current && (
        <>
          <h3 className="mb-2 px-1 text-lg font-bold">Now Playing</h3>
          <div className="glass flex items-center gap-3 rounded-[22px] p-2.5">
            <Cover src={smallImage(p.current.image)} className="h-14 w-14 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate-1 text-[16px] font-semibold">{decode(p.current.name)}</p>
              <p className="truncate-1 mt-0.5 text-[13px] text-white/60">{artistNames(p.current)}</p>
            </div>
            <span className="pr-2"><Equalizer paused={!p.playing} /></span>
          </div>
        </>
      )}

      <div className="mb-2 mt-6 flex items-center justify-between px-1">
        <h3 className="text-lg font-bold">Next In Queue</h3>
        <div className="flex gap-2">
          <button className="chip !h-9" disabled={!p.current} onClick={() => void save()}>Save</button>
          <button className="chip !h-9" disabled={!next.length} onClick={p.clearUpcoming}>Clear</button>
        </div>
      </div>

      {next.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/12 px-4 py-6 text-center text-sm text-white/55">
          {p.autoplay ? 'Nothing queued. Similar songs will play when this one ends.' : 'Nothing queued. Add songs from the menu on any track.'}
        </p>
      ) : (
        <div ref={listRef} className="flex flex-col">
          {next.map(({ song, orderPos }, i) => (
            <div
              key={`${orderPos}-${song.id}`}
              data-qpos={orderPos}
              className={`row has-index ${drag?.from === orderPos ? 'active opacity-80' : ''} ${drag && drag.over === orderPos && drag.from !== orderPos ? 'ring-1 ring-cherry-400/60' : ''}`}
              style={{ gridTemplateColumns: '24px 52px minmax(0, 1fr) auto' }}
              role="button"
              tabIndex={0}
              onClick={() => p.jumpToQueue(orderPos)}
              onKeyDown={(e) => { if (e.key === 'Enter') p.jumpToQueue(orderPos); }}
            >
              <span className="idx">{i + 1}</span>
              <Cover src={smallImage(song.image)} className="h-[52px] w-[52px] rounded-[14px]" />
              <div className="min-w-0">
                <p className="truncate-1 text-[15.5px] font-semibold">{decode(song.name)}</p>
                <p className="truncate-1 mt-0.5 text-[13px] text-white/60">{artistNames(song)}</p>
              </div>
              <div className="row-actions">
                <button className="icon-btn !h-9 !w-9" aria-label={`Remove ${decode(song.name)} from queue`} onClick={(e) => { e.stopPropagation(); p.removeFromQueue(orderPos); }}><X size={17} /></button>
                <button className="icon-btn !h-9 !w-9 cursor-grab touch-none" aria-label={`Reorder ${decode(song.name)}`} onPointerDown={(e) => startDrag(e, orderPos)} onClick={(e) => e.stopPropagation()}>
                  <GripVertical size={19} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/12 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold">Keep the music going</span>
          <span className="block text-xs text-white/50">Add similar songs when the queue ends</span>
        </span>
        <input type="checkbox" className="h-5 w-5 accent-[#ff5fa2]" checked={p.autoplay} onChange={p.toggleAutoplay} />
      </label>
    </div>
  );
}
