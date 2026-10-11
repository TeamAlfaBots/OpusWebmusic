'use client';
import { useRef } from 'react';
import { searchAlbums, searchArtists, searchPlaylists, searchSongs } from '@/lib/api';
import { useAsync, useInView } from '@/lib/hooks';
import type { ShelfKind } from '@/lib/home';
import { artistNames, decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { usePlayMedia } from '@/lib/playMedia';
import type { AlbumLite, ArtistLite, PlaylistLite, Song } from '@/lib/types';
import { MediaCard } from './MediaCard';
import { Shelf } from './Shelf';
import { CardSkeletons } from './States';

type Items = { kind: 'songs'; list: Song[] } | { kind: 'albums'; list: AlbumLite[] } | { kind: 'playlists'; list: PlaylistLite[] } | { kind: 'artists'; list: ArtistLite[] };

function albumSubtitle(a: AlbumLite): string {
  const names = (a.artists?.primary ?? a.artists?.all ?? []).map((x) => decode(x.name)).join(', ');
  return [a.year, names].filter(Boolean).join(' • ') || 'Album';
}

/** A shelf that fetches its content from a search query once it scrolls into view. */
export function QueryShelf({ title, subtitle, kind, query, limit = 14 }: { title: string; subtitle?: string; kind: ShelfKind; query: string; limit?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref);
  const { data, error, loading, reload } = useAsync<Items>(
    async (signal) => {
      if (kind === 'songs') return { kind, list: (await searchSongs(query, 0, limit, signal)).results };
      if (kind === 'albums') return { kind, list: await searchAlbums(query, limit, signal) };
      if (kind === 'playlists') return { kind, list: await searchPlaylists(query, limit, signal) };
      return { kind: 'artists', list: await searchArtists(query, limit, signal) };
    },
    [kind, query, limit],
    seen,
  );
  const { playList } = usePlayer();
  const playMedia = usePlayMedia();

  return (
    <div ref={ref} className="mt-9 first:mt-0 min-h-[40px]">
      {!seen || loading ? (
        <>
          <div className="skeleton mb-3 h-6 w-48" />
          <CardSkeletons />
        </>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/60">
          <span>Couldn’t load “{title}”.</span>
          <button className="btn !h-9" onClick={reload}>Retry</button>
        </div>
      ) : !data || !data.list.length ? null : (
        <Shelf title={title} subtitle={subtitle}>
          {data.kind === 'songs' &&
            data.list.map((s, i) => (
              <MediaCard key={s.id} title={s.name} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(data.list, i)} onPlay={() => playList(data.list, i)} />
            ))}
          {data.kind === 'albums' &&
            data.list.map((a) => (
              <MediaCard key={a.id} title={a.name} subtitle={albumSubtitle(a)} image={smallImage(a.image)} href={`/album/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('album', a.id)} />
            ))}
          {data.kind === 'playlists' &&
            data.list.map((p) => (
              <MediaCard key={p.id} title={p.name} subtitle={p.songCount ? `${p.songCount} songs` : 'Playlist'} image={smallImage(p.image)} href={`/playlist/${encodeURIComponent(p.id)}`} onPlay={() => void playMedia('playlist', p.id)} />
            ))}
          {data.kind === 'artists' &&
            data.list.map((a) => (
              <MediaCard key={a.id} round title={a.name} subtitle="Artist" image={smallImage(a.image)} href={`/artist/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('artist', a.id)} />
            ))}
        </Shelf>
      )}
    </div>
  );
}
