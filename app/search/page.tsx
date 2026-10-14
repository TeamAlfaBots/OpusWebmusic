'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Search as SearchIcon, X } from 'lucide-react';
import { MediaCard } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { SongList } from '@/components/SongRow';
import { CardSkeletons, EmptyBox, ErrorBox, RowSkeletons } from '@/components/States';
import { searchSongs, searchAll } from '@/lib/api';
import { BROWSE } from '@/lib/home';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { decode, smallImage } from '@/lib/music';
import { usePlayMedia } from '@/lib/playMedia';
import { useVoiceSearch } from '@/lib/voice';
import type { AlbumLite, Song } from '@/lib/types';

type Filter = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'songs', label: 'Songs' }, { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' }, { key: 'playlists', label: 'Playlists' },
];

function albumSubtitle(a: AlbumLite): string {
  const names = (a.artists?.primary ?? a.artists?.all ?? []).map((x) => decode(x.name)).join(', ');
  return [a.year, names].filter(Boolean).join(' • ') || 'Album';
}

export default function SearchPage() {
  const lib = useLibrary();
  const playMedia = usePlayMedia();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [extra, setExtra] = useState<Song[]>([]);
  const [page, setPage] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedRecent = useRef('');
  const voice = useVoiceSearch(lib.prefs.language);

  // Start from ?q= if present (shared links).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') ?? '';
    if (q) { setText(q); setQuery(q.trim()); }
    else inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Debounce typing into the actual query, and mirror it in the address bar.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = text.trim();
      setQuery(q);
      const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
      window.history.replaceState(window.history.state, '', url);
    }, 350);
    return () => window.clearTimeout(t);
  }, [text]);

  const enabled = query.length >= 2;
  const { data, error, loading, reload } = useAsync((signal) => searchAll(query, signal), [query], enabled);

  useEffect(() => { setExtra([]); setPage(0); setNoMore(false); }, [query]);

  // Remember searches that actually returned something.
  useEffect(() => {
    if (!data || savedRecent.current === query) return;
    if (data.songs.length || data.albums.length || data.artists.length || data.playlists.length) {
      savedRecent.current = query;
      lib.addRecentSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query]);

  const loadMore = async () => {
    setMoreBusy(true);
    try {
      const next = page + 1;
      const res = await searchSongs(query, next, 20);
      const have = new Set([...(data?.songs ?? []), ...extra].map((s) => s.id));
      const fresh = res.results.filter((s) => !have.has(s.id));
      setExtra((e) => [...e, ...fresh]);
      setPage(next);
      if (!fresh.length) setNoMore(true);
    } catch { setNoMore(true); } finally { setMoreBusy(false); }
  };

  const allSongs = [...(data?.songs ?? []), ...extra];
  const nothing = !!data && !allSongs.length && !data.albums.length && !data.artists.length && !data.playlists.length;
  const show = (k: Filter) => filter === 'all' || filter === k;

  const artistCards = (data?.artists ?? []).map((a) => (
    <MediaCard key={a.id} round title={decode(a.name)} subtitle="Artist" image={smallImage(a.image)} href={`/artist/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('artist', a.id)} />
  ));
  const albumCards = (data?.albums ?? []).map((a) => (
    <MediaCard key={a.id} title={a.name} subtitle={albumSubtitle(a)} image={smallImage(a.image)} href={`/album/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('album', a.id)} />
  ));
  const playlistCards = (data?.playlists ?? []).map((p) => (
    <MediaCard key={p.id} title={p.name} subtitle={p.songCount ? `${p.songCount} songs` : 'Playlist'} image={smallImage(p.image)} href={`/playlist/${encodeURIComponent(p.id)}`} onPlay={() => void playMedia('playlist', p.id)} />
  ));

  return (
    <div className="page">
      <h1 className="sr-only">Search</h1>
      <div className="flex items-center gap-3">
        <div className="search-big min-w-0 flex-1">
          <SearchIcon size={20} className="shrink-0 text-white/55" />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Search songs, albums, artists and playlists"
            placeholder="Search songs, albums, artists, playlists"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {text ? (
            <button className="icon-btn !h-8 !w-8" aria-label="Clear search" onClick={() => { setText(''); inputRef.current?.focus(); }}><X size={18} /></button>
          ) : voice.supported ? (
            <button className={`icon-btn !h-9 !w-9 ${voice.listening ? 'on animate-pulse' : ''}`} aria-label="Search by voice" onClick={() => voice.listen((t) => setText(t))}><Mic size={19} /></button>
          ) : null}
        </div>
        {text && <button className="shrink-0 text-[15px] font-semibold text-white/85" onClick={() => { setText(''); setFilter('all'); }}>Cancel</button>}
      </div>

      {!enabled ? (
        <div className="mt-8">
          {query.length === 1 && <p className="mb-6 text-sm text-white/45">Keep typing — search starts from two characters.</p>}
          {lib.recentSearches.length > 0 && (
            <section className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">Recent searches</h2>
                <button className="text-sm font-semibold text-cherry-300 hover:underline" onClick={lib.clearRecentSearches}>Clear all</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lib.recentSearches.map((r) => (
                  <span key={r} className="chip !pr-1.5">
                    <button onClick={() => setText(r)}>{r}</button>
                    <button className="ml-1 rounded-full p-1 hover:bg-white/10" aria-label={`Remove ${r}`} onClick={() => lib.removeRecentSearch(r)}><X size={14} /></button>
                  </span>
                ))}
              </div>
            </section>
          )}
          <h2 className="mb-3 text-xl font-bold">Browse</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BROWSE.map((b) => (
              <button key={b.name} className="genre-tile" style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }} onClick={() => setText(b.query)}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto" role="group" aria-label="Filter results">
            {FILTERS.map((f) => (
              <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>

          <div className="mt-6">
            {loading && !data ? (
              <>
                <RowSkeletons count={6} />
                <div className="mt-8"><CardSkeletons /></div>
              </>
            ) : error ? (
              <ErrorBox message={error} onRetry={reload} />
            ) : nothing ? (
              <EmptyBox icon={<SearchIcon size={28} />} title={`No results for “${query}”`} hint="Check the spelling, or try a song, artist or album name." />
            ) : data ? (
              <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {show('songs') && allSongs.length > 0 && (
                  <section>
                    <h2 className="mb-2 text-xl font-bold">Songs</h2>
                    <SongList songs={filter === 'all' ? allSongs.slice(0, 8) : allSongs} playButton source={`Search “${query}”`} />
                    {filter === 'songs' && !noMore && (
                      <div className="mt-4 flex justify-center">
                        <button className="btn" disabled={moreBusy} onClick={() => void loadMore()}>{moreBusy ? 'Loading…' : 'Show more songs'}</button>
                      </div>
                    )}
                  </section>
                )}
                {show('artists') && artistCards.length > 0 && (
                  <div className="mt-9">
                    {filter === 'all' ? <Shelf title="Artists">{artistCards}</Shelf> : <div className="grid-cards">{artistCards}</div>}
                  </div>
                )}
                {show('albums') && albumCards.length > 0 && (
                  <div className="mt-9">
                    {filter === 'all' ? <Shelf title="Albums">{albumCards}</Shelf> : <div className="grid-cards">{albumCards}</div>}
                  </div>
                )}
                {show('playlists') && playlistCards.length > 0 && (
                  <div className="mt-9">
                    {filter === 'all' ? <Shelf title="Playlists">{playlistCards}</Shelf> : <div className="grid-cards">{playlistCards}</div>}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
