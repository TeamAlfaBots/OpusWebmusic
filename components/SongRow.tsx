'use client';
import { Heart, Pause, Play } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { decode, durationLabel, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import type { Song } from '@/lib/types';
import { useUI } from '@/lib/ui';
import { ArtistLinks } from './ArtistLinks';
import { Cover } from './Cover';
import { EllipsisIcon } from './icons';
import Link from 'next/link';

export function Equalizer({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`eq ${paused ? 'paused' : ''}`} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

type RowProps = {
  song: Song;
  index: number;
  songs: Song[];
  showIndex?: boolean;
  showAlbum?: boolean;
  onRemove?: (song: Song) => void;
  removeLabel?: string;
};

export function SongRow({ song, index, songs, showIndex = false, showAlbum = false, onRemove, removeLabel }: RowProps) {
  const player = usePlayer();
  const lib = useLibrary();
  const ui = useUI();
  const active = player.current?.id === song.id;
  const isPlaying = active && player.playing;
  const fav = lib.isFavorite(song.id);
  const activate = () => (active ? player.toggle() : player.playList(songs, index));

  return (
    <div
      className={`row ${showIndex ? 'has-index' : ''} ${showAlbum ? 'has-album' : ''} ${active ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${active && player.playing ? 'Pause' : 'Play'} ${decode(song.name)}`}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); activate(); } }}
    >
      {showIndex && <div className="idx">{active ? <Equalizer paused={!isPlaying} /> : index + 1}</div>}

      <div className="relative h-11 w-11">
        <Cover src={smallImage(song.image)} className="h-11 w-11 rounded-lg" />
        {!showIndex && active && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/55"><Equalizer paused={!isPlaying} /></div>
        )}
        {!(active && !showIndex) && (
          <div className="thumb-play rounded-lg">
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className={`truncate-1 text-[15px] font-semibold ${active ? 'text-cherry-400' : ''}`}>
          {decode(song.name)}
          {song.explicitContent && <span className="ml-2 inline-block rounded border border-white/25 px-1 align-middle text-[9px] font-bold leading-[14px] text-white/60">E</span>}
        </p>
        <p className="truncate-1 mt-0.5 text-[13px] text-white/50"><ArtistLinks credits={song.artists} /></p>
      </div>

      {showAlbum && (
        <div className="hidden min-w-0 md:block">
          {song.album?.id ? (
            <Link href={`/album/${encodeURIComponent(song.album.id)}`} className="truncate-1 link-u block text-[13px] text-white/50" onClick={(e) => e.stopPropagation()}>
              {decode(song.album.name)}
            </Link>
          ) : (
            <span className="truncate-1 block text-[13px] text-white/50">{decode(song.album?.name)}</span>
          )}
        </div>
      )}

      <div className="row-actions">
        <button
          type="button"
          className={`icon-btn row-heart ${fav ? 'on' : ''}`}
          aria-label={fav ? 'Remove from liked songs' : 'Add to liked songs'}
          aria-pressed={fav}
          onClick={(e) => { e.stopPropagation(); const added = lib.toggleFavorite(song); ui.toast(added ? 'Added to liked songs' : 'Removed from liked songs'); }}
        >
          <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
        </button>
        <span className="hidden w-10 text-right text-[13px] tabular-nums text-white/40 sm:block">{durationLabel(song.duration)}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`More options for ${decode(song.name)}`}
          onClick={(e) => { e.stopPropagation(); ui.openSongMenu(song, onRemove ? { onRemove: () => onRemove(song), removeLabel } : undefined); }}
        >
          <EllipsisIcon size={18} />
        </button>
      </div>
    </div>
  );
}

export function SongList({ songs, showIndex = false, showAlbum = false, onRemove, removeLabel }: { songs: Song[]; showIndex?: boolean; showAlbum?: boolean; onRemove?: (song: Song) => void; removeLabel?: string }) {
  return (
    <div className="flex flex-col">
      {songs.map((s, i) => (
        <SongRow key={`${s.id}-${i}`} song={s} index={i} songs={songs} showIndex={showIndex} showAlbum={showAlbum} onRemove={onRemove} removeLabel={removeLabel} />
      ))}
    </div>
  );
}
