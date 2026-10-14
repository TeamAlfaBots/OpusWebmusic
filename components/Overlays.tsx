'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Disc3, Heart, ListEnd, ListMusic, ListPlus, ListStart, Plus, Radio, Share2, Trash2, User } from 'lucide-react';
import { useLibrary } from '@/lib/library';
import { shareOrCopy } from '@/lib/share';
import { decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { useUI } from '@/lib/ui';
import { ArtistLinks } from './ArtistLinks';
import { Cover } from './Cover';

export function ToastHost() {
  const { toasts } = useUI();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast glass-strong">{t.message}</div>
      ))}
    </div>
  );
}

export function NameDialog() {
  const { nameDialog, closeNameDialog } = useUI();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameDialog) {
      setValue(nameDialog.initial);
      window.setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [nameDialog]);

  useEffect(() => {
    if (!nameDialog) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNameDialog(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nameDialog, closeNameDialog]);

  if (!nameDialog) return null;
  const submit = () => { const v = value.trim(); if (v) closeNameDialog(v); };
  return (
    <div className="scrim" onClick={() => closeNameDialog(null)}>
      <div className="sheet glass-strong p-5" role="dialog" aria-modal="true" aria-label={nameDialog.title} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold">{nameDialog.title}</h3>
        <input
          ref={inputRef}
          className="text-input mt-4"
          value={value}
          maxLength={80}
          placeholder="Playlist name"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={() => closeNameDialog(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={!value.trim()} onClick={submit}>{nameDialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function SongMenu() {
  const { menu, closeSongMenu, toast, askName } = useUI();
  const player = usePlayer();
  const lib = useLibrary();
  const router = useRouter();
  const [view, setView] = useState<'main' | 'playlists'>('main');

  useEffect(() => { setView('main'); }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSongMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, closeSongMenu]);

  if (!menu) return null;
  const { song, onRemove, removeLabel } = menu;
  const fav = lib.isFavorite(song.id);
  const artist = (song.artists?.primary ?? song.artists?.all ?? []).find((a) => a.id);
  const done = (fn: () => void) => () => { closeSongMenu(); fn(); };

  const shareSong = async () => {
    const m = await shareOrCopy({ title: decode(song.name), text: `${decode(song.name)} on CherryMusic`, url: song.url });
    if (m) toast(m);
  };

  const addTo = (playlistId: string, name: string) => {
    const n = lib.addToPlaylist(playlistId, [song]);
    toast(n ? `Added to ${name}` : `Already in ${name}`);
    closeSongMenu();
  };

  const createAndAdd = async () => {
    const name = await askName('New playlist', '', 'Create');
    if (!name) return;
    lib.createPlaylist(name, [song]);
    toast(`Created ${name}`);
    closeSongMenu();
  };

  return (
    <div className="scrim" onClick={closeSongMenu}>
      <div className="sheet glass-strong" role="dialog" aria-modal="true" aria-label="Song options" onClick={(e) => e.stopPropagation()}>
        {view === 'main' ? (
          <>
            <div className="flex items-center gap-3 px-3 pb-3 pt-3">
              <Cover src={smallImage(song.image)} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate-1 font-semibold">{decode(song.name)}</p>
                <p className="truncate-1 text-sm text-white/50"><ArtistLinks credits={song.artists} /></p>
              </div>
            </div>
            <div className="mx-3 mb-1 h-px bg-white/10" />
            <button className="sheet-item" onClick={done(() => player.playNext(song))}><ListStart size={20} />Play next</button>
            <button className="sheet-item" onClick={done(() => player.addToQueue(song))}><ListEnd size={20} />Add to queue</button>
            <button className="sheet-item" onClick={done(() => void player.startRadio(song))}><Radio size={20} />Start song radio</button>
            <button className="sheet-item" onClick={() => setView('playlists')}><ListPlus size={20} />Add to playlist</button>
            <button className="sheet-item" onClick={done(() => toast(lib.toggleFavorite(song) ? 'Added to liked songs' : 'Removed from liked songs'))}>
              <Heart size={20} fill={fav ? 'currentColor' : 'none'} className={fav ? '!text-cherry-400' : ''} />{fav ? 'Remove from liked songs' : 'Add to liked songs'}
            </button>
            {song.album?.id && (
              <button className="sheet-item" onClick={done(() => router.push(`/album/${encodeURIComponent(song.album!.id as string)}`))}><Disc3 size={20} />Go to album</button>
            )}
            {artist && (
              <button className="sheet-item" onClick={done(() => router.push(`/artist/${encodeURIComponent(artist.id)}`))}><User size={20} />Go to artist</button>
            )}
            <button className="sheet-item" onClick={done(() => void shareSong())}><Share2 size={20} />Share</button>
            {onRemove && (
              <button className="sheet-item danger" onClick={done(onRemove)}><Trash2 size={20} />{removeLabel ?? 'Remove'}</button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 pb-2 pt-2">
              <button className="icon-btn" aria-label="Back" onClick={() => setView('main')}><ArrowLeft size={20} /></button>
              <h3 className="text-lg font-bold">Add to playlist</h3>
            </div>
            <button className="sheet-item" onClick={() => void createAndAdd()}><Plus size={20} />New playlist</button>
            {lib.playlists.length === 0 && <p className="px-4 py-6 text-center text-sm text-white/45">You have no playlists yet. Create your first one above.</p>}
            {lib.playlists.map((p) => {
              const has = p.songs.some((s) => s.id === song.id);
              return (
                <button key={p.id} className="sheet-item" onClick={() => addTo(p.id, p.name)}>
                  <ListMusic size={20} />
                  <span className="min-w-0 flex-1 truncate-1">{p.name}</span>
                  {has && <Check size={18} className="!text-cherry-400" />}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
