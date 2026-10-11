'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Heart, ListMusic, Mic, Moon, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { bestImage, decode } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { useUI, type NpView } from '@/lib/ui';
import { ArtistLinks } from './ArtistLinks';
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
      <button className={`icon-btn ${active ? 'on' : ''}`} aria-label="Sleep timer" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Moon size={19} />
      </button>
      {active && <span className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-cherry-500 px-1.5 text-[10px] font-bold text-[#2a0613]">{p.sleepEnd ? 'end' : `${left}m`}</span>}
      {open && (
        <div className="glass-strong absolute bottom-12 left-1/2 z-10 w-52 -translate-x-1/2 rounded-2xl p-1.5" role="menu">
          <p className="px-3 py-2 text-xs text-white/45">Stop playing after…</p>
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

  return (
    <>
      {art && <div className="np-bg" style={{ backgroundImage: `url(${art})` }} />}
      <div className="np-shade" />
      <div className="relative z-10 flex h-full flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-3 py-3 sm:px-6">
          <button className="icon-btn" aria-label="Close player" onClick={ui.closeNowPlaying}><ChevronDown size={26} /></button>
          <p className="text-sm font-semibold text-white/70">Now playing</p>
          <button className="icon-btn" aria-label="Song options" disabled={!song} onClick={() => song && ui.openSongMenu(song)}><EllipsisIcon size={20} /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 px-5 pb-2 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-14">
          {/* Player column */}
          <div className={`${view === 'player' ? 'flex' : 'hidden'} min-h-0 flex-col justify-center lg:flex`}>
            <div className="mx-auto w-full max-w-[min(420px,52vh)]">
              <div className="np-art">
                {art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art} alt={song ? `${decode(song.name)} artwork` : ''} referrerPolicy="no-referrer" />
                )}
              </div>
            </div>
            <div className="mx-auto mt-6 w-full max-w-[460px]">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate-1 text-2xl font-bold">{song ? decode(song.name) : 'Nothing playing'}</h2>
                  <p className="truncate-1 mt-1 text-white/60">{song ? <ArtistLinks credits={song.artists} /> : 'Pick a song to start'}</p>
                </div>
                {song && (
                  <button
                    className={`icon-btn ${fav ? 'on' : ''}`}
                    aria-label={fav ? 'Remove from liked songs' : 'Add to liked songs'}
                    aria-pressed={fav}
                    onClick={() => ui.toast(lib.toggleFavorite(song) ? 'Added to liked songs' : 'Removed from liked songs')}
                  >
                    <Heart size={24} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
              <div className="mt-4"><Seekbar big /></div>
              <div className="mt-2 flex justify-center"><TransportControls gap="gap-1.5 sm:gap-3" /></div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <SleepTimer />
                <div className="hidden flex-1 items-center justify-center gap-2 sm:flex">
                  <button className="icon-btn" aria-label={p.muted ? 'Unmute' : 'Mute'} onClick={p.toggleMute}><VolIcon size={19} /></button>
                  <div className="w-32"><RangeBar label="Volume" live value={p.muted ? 0 : p.volume} max={1} step={0.01} onCommit={p.setVolume} /></div>
                </div>
                <button className="icon-btn lg:hidden" aria-label="Show lyrics" onClick={() => setView('lyrics')}><Mic size={19} /></button>
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

        {/* Mobile view switcher */}
        <div className="flex justify-center px-5 pb-4 pt-2 lg:hidden" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="glass flex rounded-full p-1">
            {([['player', 'Player', null], ['lyrics', 'Lyrics', Mic], ['queue', 'Up next', ListMusic]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${view === key ? 'bg-white/90 text-[#2a0613]' : 'text-white/65'}`}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {Icon && <Icon size={16} />}{label}
              </button>
            ))}
          </div>
        </div>
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
