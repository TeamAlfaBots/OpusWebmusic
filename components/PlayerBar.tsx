'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Heart, ListMusic, Maximize2, Mic, Pause, Play, Search, SkipForward, Library, Volume1, Volume2, VolumeX, LoaderCircle } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { decode, smallImage } from '@/lib/music';
import { usePlayer, usePlayerTime } from '@/lib/player';
import { useUI } from '@/lib/ui';
import { ArtistLinks } from './ArtistLinks';
import { Cover } from './Cover';
import { HomeIcon } from './icons';
import { RangeBar } from './RangeBar';
import { Seekbar } from './Seekbar';
import { TransportControls } from './Transport';

function MiniProgress() {
  const { progress, duration } = usePlayerTime();
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  return <div className="mini-progress"><span style={{ width: `${pct}%` }} /></div>;
}

function DesktopDock() {
  const p = usePlayer();
  const lib = useLibrary();
  const ui = useUI();
  const song = p.current;
  const fav = song ? lib.isFavorite(song.id) : false;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="glass-strong hidden h-[88px] grid-cols-[1fr_1.5fr_1fr] items-center gap-4 rounded-none border-x-0 border-b-0 px-5 lg:grid">
      <div className="flex min-w-0 items-center gap-3">
        <button className="shrink-0" aria-label="Open now playing" disabled={!song} onClick={() => ui.openNowPlaying('player')}>
          <Cover src={song ? smallImage(song.image) : ''} className="h-14 w-14 rounded-xl" />
        </button>
        <div className="min-w-0">
          <p className="truncate-1 text-[15px] font-semibold">{song ? decode(song.name) : 'Nothing playing'}</p>
          <p className="truncate-1 mt-0.5 text-[13px] text-white/50">{song ? <ArtistLinks credits={song.artists} /> : 'Pick a song to start listening'}</p>
        </div>
        {song && (
          <button
            className={`icon-btn ml-1 shrink-0 ${fav ? 'on' : ''}`}
            aria-label={fav ? 'Remove from liked songs' : 'Add to liked songs'}
            aria-pressed={fav}
            onClick={() => ui.toast(lib.toggleFavorite(song) ? 'Added to liked songs' : 'Removed from liked songs')}
          >
            <Heart size={19} fill={fav ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <TransportControls gap="gap-2" />
        <Seekbar compact />
      </div>

      <div className="flex items-center justify-end gap-1">
        <button className="icon-btn" aria-label="Lyrics" disabled={!song} onClick={() => ui.openNowPlaying('lyrics')}><Mic size={19} /></button>
        <button className="icon-btn" aria-label="Queue" onClick={() => ui.openNowPlaying('queue')}><ListMusic size={19} /></button>
        <button className="icon-btn" aria-label={p.muted ? 'Unmute' : 'Mute'} onClick={p.toggleMute}><VolIcon size={19} /></button>
        <div className="w-24"><RangeBar label="Volume" live value={p.muted ? 0 : p.volume} max={1} step={0.01} onCommit={p.setVolume} /></div>
        <button className="icon-btn" aria-label="Open full screen player" disabled={!song} onClick={() => ui.openNowPlaying('player')}><Maximize2 size={18} /></button>
      </div>
    </div>
  );
}

function MiniPlayer() {
  const p = usePlayer();
  const ui = useUI();
  const song = p.current;
  return (
    <div className="mini glass-strong">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open now playing" disabled={!song} onClick={() => ui.openNowPlaying('player')}>
        <Cover src={song ? smallImage(song.image) : ''} className="h-12 w-12 rounded-[14px]" />
        <span className="min-w-0">
          <span className="truncate-1 block text-[15px] font-semibold">{song ? decode(song.name) : 'Nothing playing'}</span>
          <span className="truncate-1 mt-0.5 block text-[13px] text-white/60">{song ? (song.artists?.primary ?? song.artists?.all ?? []).map((a) => decode(a.name)).join(', ') : 'Pick a song to start'}</span>
        </span>
      </button>
      <button className="icon-btn" aria-label="Next" disabled={!song} onClick={p.next}><SkipForward size={20} fill="currentColor" /></button>
      <button className="play-fab sm" aria-label={p.playing ? 'Pause' : 'Play'} disabled={!song} onClick={p.toggle}>
        {p.buffering && p.playing ? <LoaderCircle size={20} className="animate-spin" /> : p.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}
      </button>
      {song && <MiniProgress />}
    </div>
  );
}

const NAV = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/premium', label: 'Premium', icon: Crown },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="tabbar glass-strong" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const on = isActivePath(pathname, href) || (href === '/library' && (pathname === '/liked' || pathname.startsWith('/my/')));
        return (
          <Link key={href} href={href} className={`tab ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined}>
            <Icon size={21} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlayerBar() {
  return (
    <div className="dock">
      <DesktopDock />
      <div className="dock-mobile lg:hidden">
        <MiniPlayer />
        <BottomNav />
      </div>
    </div>
  );
}

export { NAV };
