'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListMusic, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { DetailHeader } from '@/components/DetailHeader';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { EmptyBox, RowSkeletons } from '@/components/States';
import { searchSongs } from '@/lib/api';
import { useLibrary } from '@/lib/library';
import { artistNames, bestImage, decode, smallImage, totalLabel } from '@/lib/music';
import type { Song } from '@/lib/types';
import { useUI } from '@/lib/ui';

function AddSongs({ playlistId }: { playlistId: string }) {
  const lib = useLibrary();
  const ui = useUI();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const pl = lib.playlists.find((p) => p.id === playlistId);
  const have = new Set(pl?.songs.map((s) => s.id));

  const run = async () => {
    const q = text.trim();
    if (q.length < 2) return;
    setBusy(true);
    try { setResults((await searchSongs(q, 0, 8)).results); setSearched(true); }
    catch (e) { ui.toast(e instanceof Error ? e.message : 'Search failed'); }
    finally { setBusy(false); }
  };

  return (
    <section className="pad-x mt-12 max-w-3xl">
      <h2 className="text-xl font-bold">Find songs to add</h2>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <input className="text-input" placeholder="Search for a song" aria-label="Search for songs to add" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit" disabled={busy || text.trim().length < 2}><Search size={17} />Search</button>
      </form>
      <div className="mt-3">
        {busy ? <RowSkeletons count={3} /> : results.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
            <Cover src={smallImage(s.image)} className="h-11 w-11 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate-1 text-[15px] font-semibold">{decode(s.name)}</p>
              <p className="truncate-1 text-[13px] text-white/50">{artistNames(s)}</p>
            </div>
            <button
              className="btn !h-9"
              disabled={have.has(s.id)}
              onClick={() => { lib.addToPlaylist(playlistId, [s]); ui.toast(`Added ${decode(s.name)}`); }}
            >
              {have.has(s.id) ? 'Added' : <><Plus size={16} />Add</>}
            </button>
          </div>
        ))}
        {!busy && searched && results.length === 0 && <p className="py-4 text-sm text-white/50">Nothing found. Try another name.</p>}
      </div>
    </section>
  );
}

export default function MyPlaylistPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const router = useRouter();
  const pl = lib.playlists.find((p) => p.id === id);

  if (!lib.ready) return <div className="page"><RowSkeletons count={6} /></div>;
  if (!pl) {
    return (
      <div className="page">
        <EmptyBox title="Playlist not found" hint="It may have been deleted, or it lives on another device.">
          <button className="btn" onClick={() => router.push('/library')}>Back to library</button>
        </EmptyBox>
      </div>
    );
  }

  const total = pl.songs.reduce((n, s) => n + (s.duration ?? 0), 0);
  const cover = pl.songs.find((s) => s.image?.length)?.image;

  const rename = async () => {
    const name = await ui.askName('Rename playlist', pl.name, 'Save');
    if (name) lib.renamePlaylist(pl.id, name);
  };
  const remove = () => {
    if (!window.confirm(`Delete “${pl.name}”? This can’t be undone.`)) return;
    lib.deletePlaylist(pl.id);
    ui.toast('Playlist deleted');
    router.push('/library');
  };

  return (
    <div className="page-flush">
      <DetailHeader
        label="Your playlist"
        title={pl.name}
        image={bestImage(cover)}
        artNode={cover ? undefined : <div className="flex h-full w-full items-start justify-end bg-gradient-to-br from-cherry-700 to-violet-800 p-10"><ListMusic size={88} className="text-white/60" /></div>}
        actions={
          <>
            <PlayButtons songs={pl.songs} source={`Playlist “${pl.name}”`} />
            <button className="icon-btn round !h-[52px] !w-[52px]" aria-label="Rename playlist" onClick={() => void rename()}><Pencil size={19} /></button>
            <button className="icon-btn round !h-[52px] !w-[52px]" aria-label="Delete playlist" onClick={remove}><Trash2 size={19} /></button>
          </>
        }
      >
        <p className="mt-2 text-sm text-white/65">{[`By you`, `${pl.songs.length} ${pl.songs.length === 1 ? 'song' : 'songs'}`, totalLabel(total)].filter(Boolean).join(' • ')}</p>
      </DetailHeader>

      <div className="pad-x mt-4">
        {pl.songs.length === 0 ? (
          <EmptyBox title="This playlist is empty" hint="Search below, or use the ⋯ menu on any song and choose Add to playlist." />
        ) : (
          <SongList songs={pl.songs} showAlbum source={`Playlist “${pl.name}”`} removeLabel="Remove from this playlist" onRemove={(s) => { lib.removeFromPlaylist(pl.id, s.id); ui.toast('Removed from playlist'); }} />
        )}
      </div>
      <AddSongs playlistId={pl.id} />
      <div className="h-6" />
    </div>
  );
}
