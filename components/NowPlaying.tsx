'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, Heart, ListMusic, Mic, Moon, Pause, Play, Share2, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { bestImage, decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { shareOrCopy } from '@/lib/share';
import { useUI, type NpView } from '@/lib/ui';
import { ArtistLinks } from './ArtistLinks';
import { Cover } from './Cover';
import { EllipsisIcon } from './icons';
import { Lyrics } from './Lyrics';
import { QueuePanel } from './QueuePanel';
import { RangeBar } from './RangeBar';
import { Seekbar } from './Seekbar';
import { TransportControls } from './Transport';

function SleepTimer() {
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!p.sleepAt) return;
    const t = window.setInterval(() => tick((n) => n + 1), 15000);
    return () => window.clearInterval(t);
  }, [p.sleepAt]);

  const left = p.sleepAt ? Math.max(1, Math.ceil((p.sleepAt - Date.now()) / 60000)) : 0;
  const active = !!p.sleepAt || p.sleepEnd;
  const pick = (v: number | 'end' | null) => { p.setSleep(v); setOpen(false); };
  return (
    <div className="relative">
      <ActionButton label="Sleep" on={active} aria-expanded={open} aria-label="Sleep timer" onClick={() => setOpen((o) => !o)}><Moon size={21} /></ActionButton>
      {active && <span className="pointer-events-none absolute right-0 top-0 rounded-full bg-cherry-500 px-1.5 text-[10px] font-bold text-white">{p.sleepEnd ? 'end' : `${left}m`}</span>}
      {open && (
        <div className="glass-strong absolute bottom-[78px] left-1/2 z-10 w-52 -translate-x-1/2 rounded-2xl p-1.5" role="menu">
          <p className="px-3 py-2 text-xs text-white/50">Stop playing after…</p>
          {[15, 30, 45, 60].map((m) => (
            <button key={m} role="menuitem" className="sheet-item !py-2.5" onClick={() => pick(m)}>{m} minutes</button>
          ))}
          <button role="menuitem" className="sheet-item !py-2.5" onClick={() => pick('end')}>End of this track</button>
          {active && <button role="menuitem" className="sheet-item danger !py-2.5" onClick={() => pick(null)}>Turn off timer</button>}
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, on = false, children, ...rest }: { label: string; on?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`flex flex-col items-center gap-1.5 text-[12px] font-medium ${on ? 'text-cherry-400' : 'text-white/75'}`} {...rest}>
      <span className="glass flex h-12 w-12 items-center justify-center rounded-2xl">{children}</span>
      {label}
    </button>
  );
}

function MiniBar() {
  const p = usePlayer();
  const ui = useUI();
  const song = p.current;
  if (!song) return null;
  return (
    <div className="glass-strong mx-1 flex items-center gap-3 rounded-[26px] p-2.5 lg:hidden">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Back to player" onClick={() => ui.setNpView('player')}>
        <Cover src={smallImage(song.image)} className="h-12 w-12 rounded-[14px]" />
        <span className="min-w-0">
          <span className="truncate-1 block text-[15px] font-semibold">{decode(song.name)}</span>
          <span className="truncate-1 mt-0.5 block text-[13px] text-white/60">{(song.artists?.primary ?? song.artists?.all ?? []).map((a) => decode(a.name)).join(', ')}</span>
        </span>
      </button>
      <button className="play-fab sm" aria-label={p.playing ? 'Pause' : 'Play'} onClick={p.toggle}>
        {p.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}
      </button>
    </div>
  );
}

function NowPlayingBody() {
  const p = usePlayer();
  const lib = useLibrary();
  const ui = useUI();
  const song = p.current;
  const view = ui.npView;
  const tab: 'lyrics' | 'queue' = view === 'queue' ? 'queue' : 'lyrics';
  const art = song ? bestImage(song.image) : '';
  const fav = song ? lib.isFavorite(song.id) : false;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  const setView = (v: NpView) => ui.setNpView(v);
  const share = async () => {
    if (!song) return;
    const m = await shareOrCopy({ title: decode(song.name), text: `${decode(song.name)} on CherryMusic`, url: song.url });
    if (m) ui.toast(m);
  };

  return (
    <>
      {art && <div className="np-bg" style={{ backgroundImage: `url(${art})` }} />}
      <div className="np-shade" />
      <div className="relative z-10 flex h-full flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
        {/* header: full on the player view, back + title on lyrics/queue views (mobile) */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {view === 'player' ? (
            <button className="icon-btn round" aria-label="Close player" onClick={ui.closeNowPlaying}><ChevronDown size={24} /></button>
          ) : (
            <>
              <button className="icon-btn round lg:hidden" aria-label="Back to player" onClick={() => setView('player')}><ChevronLeft size={22} /></button>
              <button className="icon-btn round hidden lg:inline-flex" aria-label="Close player" onClick={ui.closeNowPlaying}><ChevronDown size={24} /></button>
            </>
          )}
          <div className="min-w-0 px-3 text-center">
            <p className="truncate-1 text-[15px] font-semibold text-white/85">
              <span className={view === 'player' ? '' : 'lg:hidden'}>{view === 'lyrics' ? 'Lyrics' : view === 'queue' ? 'Up next' : ''}</span>
              <span className={view === 'player' ? '' : 'hidden lg:inline'}>{p.source ? `Playing from ${p.source}` : 'Now playing'}</span>
            </p>
          </div>
          <button className="icon-btn round" aria-label="Song options" disabled={!song} onClick={() => song && ui.openSongMenu(song)}><EllipsisIcon size={20} /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 px-5 pb-2 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-14">
          {/* Player column */}
          <div className={`${view === 'player' ? 'flex' : 'hidden'} min-h-0 flex-col justify-center overflow-y-auto lg:flex`}>
            <div className="mx-auto w-full max-w-[min(380px,44vh)]">
              <div className="np-art">
                {art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art} alt={song ? `${decode(song.name)} artwork` : ''} referrerPolicy="no-referrer" />
                )}
              </div>
            </div>
            <div className="mx-auto mt-6 w-full max-w-[440px]">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate-1 text-[26px] font-bold">{song ? decode(song.name) : 'Nothing playing'}</h2>
                  <p className="truncate-1 mt-0.5 text-[17px] text-white/70">{song ? <ArtistLinks credits={song.artists} /> : 'Pick a song to start'}</p>
                </div>
                {song && (
                  <button
                    className={`icon-btn !h-12 !w-12 ${fav ? 'on' : ''}`}
                    style={fav ? { filter: 'drop-shadow(0 0 10px rgba(255,95,162,.8))' } : undefined}
                    aria-label={fav ? 'Remove from liked songs' : 'Add to liked songs'}
                    aria-pressed={fav}
                    onClick={() => ui.toast(lib.toggleFavorite(song) ? 'Added to liked songs' : 'Removed from liked songs')}
                  >
                    <Heart size={28} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
              <div className="mt-4"><Seekbar big /></div>
              <div className="mt-3 flex justify-center"><TransportControls gap="gap-1.5 sm:gap-4" /></div>
              <div className="mt-4 hidden items-center justify-center gap-2 sm:flex">
                <button className="icon-btn" aria-label={p.muted ? 'Unmute' : 'Mute'} onClick={p.toggleMute}><VolIcon size={19} /></button>
                <div className="w-40"><RangeBar label="Volume" live value={p.muted ? 0 : p.volume} max={1} step={0.01} onCommit={p.setVolume} /></div>
              </div>
              <div className="mt-5 flex items-start justify-between px-1 pb-3">
                <ActionButton label="Lyrics" aria-label="Show lyrics" disabled={!song} onClick={() => setView('lyrics')}><Mic size={21} /></ActionButton>
                <ActionButton label="Queue" aria-label="Show queue" onClick={() => setView('queue')}><ListMusic size={21} /></ActionButton>
                <SleepTimer />
                <ActionButton label="Share" aria-label="Share song" disabled={!song} onClick={() => void share()}><Share2 size={21} /></ActionButton>
                <ActionButton label="More" aria-label="More options" disabled={!song} onClick={() => song && ui.openSongMenu(song)}><EllipsisIcon size={21} /></ActionButton>
              </div>
            </div>
          </div>

          {/* Lyrics / queue column */}
          <div className={`${view === 'player' ? 'hidden' : 'flex'} min-h-0 flex-col lg:flex`}>
            <div className="mb-3 hidden gap-2 lg:flex">
              <button className={`chip ${tab === 'lyrics' ? 'active' : ''}`} onClick={() => setView('lyrics')}>Lyrics</button>
              <button className={`chip ${tab === 'queue' ? 'active' : ''}`} onClick={() => setView('queue')}>Up next</button>
            </div>
            <div className="min-h-0 flex-1">
              {tab === 'queue' ? <QueuePanel /> : song ? <Lyrics song={song} visible /> : null}
            </div>
          </div>
        </div>

        {view !== 'player' && (
          <div className="px-3 pt-2" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}><MiniBar /></div>
        )}
      </div>
    </>
  );
}

export function NowPlaying() {
  const { npOpen, closeNowPlaying } = useUI();

  useEffect(() => {
    if (!npOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNowPlaying(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [npOpen, closeNowPlaying]);

  return (
    <AnimatePresence>
      {npOpen && (
        <motion.div
          key="np"
          className="np"
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <NowPlayingBody />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
