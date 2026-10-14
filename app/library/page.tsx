'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, History, ListMusic, Plus, Search, Trash2 } from 'lucide-react';
import { MediaCard } from '@/components/MediaCard';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { EmptyBox } from '@/components/States';
import { useLibrary } from '@/lib/library';
import { bestImage } from '@/lib/music';
import { usePlayMedia } from '@/lib/playMedia';
import type { MediaItem } from '@/lib/types';
import { useUI } from '@/lib/ui';

type Tab = 'playlists' | 'albums' | 'artists' | 'liked' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'playlists', label: 'Playlists' }, { key: 'albums', label: 'Albums' }, { key: 'artists', label: 'Artists' },
  { key: 'liked', label: 'Liked' }, { key: 'history', label: 'History' },
];

const GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #ec4899)', 'linear-gradient(135deg, #0ea5e9, #6366f1)', 'linear-gradient(135deg, #f97316, #db2777)',
  'linear-gradient(135deg, #14b8a6, #4f46e5)', 'linear-gradient(135deg, #a855f7, #3b82f6)', 'linear-gradient(135deg, #f43f5e, #f59e0b)',
];
const gradientFor = (key: string) => GRADIENTS[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % GRADIENTS.length];

function LibCard({ href, onClick, image, gradient, icon, title, count }: { href?: string; onClick?: () => void; image?: string; gradient?: string; icon?: React.ReactNode; title: string; count: string }) {
  const body = (
    <>
      <div className="lib-bg" style={image ? { backgroundImage: `url(${image})` } : { background: gradient }} />
      <div className="lib-shade" />
      {icon && <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-md">{icon}</div>}
      <div className="lib-text">
        <p className="truncate-1 text-[17px] font-bold leading-tight">{title}</p>
        <p className="truncate-1 mt-0.5 text-[13px] text-white/75">{count}</p>
      </div>
    </>
  );
  return href ? <Link href={href} className="lib-card">{body}</Link> : <button type="button" className="lib-card w-full" onClick={onClick}>{body}</button>;
}

function SavedGrid({ items, round = false, empty }: { items: MediaItem[]; round?: boolean; empty: { title: string; hint: string } }) {
  const playMedia = usePlayMedia();
  if (!items.length) return <EmptyBox title={empty.title} hint={empty.hint} />;
  return (
    <div className="grid-cards">
      {items.map((m) => (
        <MediaCard key={`${m.kind}-${m.id}`} round={round} title={m.title} subtitle={m.subtitle} image={m.image} href={`/${m.kind}/${encodeURIComponent(m.id)}`} onPlay={() => void playMedia(m.kind, m.id)} />
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const lib = useLibrary();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('playlists');
  const saved = (kind: MediaItem['kind']) => lib.saved.filter((m) => m.kind === kind);

  const newPlaylist = async () => {
    const name = await ui.askName('New playlist', '', 'Create');
    if (!name) return;
    lib.createPlaylist(name);
    ui.toast(`Created ${name}`);
  };

  return (
    <div className="page">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[34px] font-extrabold sm:text-4xl">Your Library</h1>
        <Link href="/search" className="icon-btn round" aria-label="Search"><Search size={20} /></Link>
      </header>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Library sections">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'playlists' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <LibCard href="/liked" gradient="linear-gradient(135deg, #8b5cf6, #ec4899)" icon={<Heart size={19} fill="white" />} title="Liked Songs" count={`${lib.favorites.length} songs`} />
            {lib.playlists.map((p) => {
              const art = p.songs.find((s) => s.image?.length)?.image;
              return <LibCard key={p.id} href={`/my/${p.id}`} image={art ? bestImage(art) : undefined} gradient={gradientFor(p.id)} icon={!art ? <ListMusic size={19} /> : undefined} title={p.name} count={`${p.songs.length} songs`} />;
            })}
            {saved('playlist').map((m) => (
              <LibCard key={`pl-${m.id}`} href={`/playlist/${encodeURIComponent(m.id)}`} image={m.image} gradient={gradientFor(m.id)} title={m.title} count={m.subtitle || 'Playlist'} />
            ))}
            <LibCard onClick={() => void newPlaylist()} gradient="linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))" icon={<Plus size={20} />} title="New playlist" count="Start from scratch" />
          </div>
        )}
        {tab === 'albums' && <SavedGrid items={saved('album')} empty={{ title: 'No saved albums yet', hint: 'Tap the heart on an album to keep it here.' }} />}
        {tab === 'artists' && <SavedGrid round items={saved('artist')} empty={{ title: 'Not following anyone yet', hint: 'Follow artists to find them quickly.' }} />}
        {tab === 'liked' && (
          lib.favorites.length === 0 ? (
            <EmptyBox icon={<Heart size={28} />} title="Songs you like will live here" hint="Tap the heart on any song to save it." />
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3"><PlayButtons songs={lib.favorites} source="Liked songs" /></div>
              <SongList songs={lib.favorites} showAlbum source="Liked songs" />
            </>
          )
        )}
        {tab === 'history' && (
          lib.history.length === 0 ? (
            <EmptyBox icon={<History size={28} />} title="Nothing played yet" hint="Songs you listen to will show up here." />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button className="btn !h-9" onClick={() => { lib.clearHistory(); ui.toast('History cleared'); }}><Trash2 size={16} />Clear history</button>
              </div>
              <SongList songs={lib.history} showAlbum source="Recently played" />
            </>
          )
        )}
      </div>
    </div>
  );
}
