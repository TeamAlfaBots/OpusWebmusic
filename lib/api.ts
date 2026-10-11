import type { Album, AlbumLite, Artist, ArtistLite, Playlist, PlaylistLite, Song } from './types';
import { cleanTitle, decode } from './music';
import { htmlToPlain } from './lrc';

/**
 * Every call to the music API goes through here. If your API's response shape or
 * endpoint paths differ from the JioSaavn-compatible layout, fix it in this file only.
 */
type Params = Record<string, string | number | undefined>;
type Envelope<T> = { success?: boolean; data?: T; error?: string; message?: string };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

function qs(params?: Params): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/saavn/${path.replace(/^\/+/, '')}${qs(params)}`, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('Network error. Check your connection and try again.');
  }
  let json: Envelope<T> | null = null;
  try { json = (await res.json()) as Envelope<T>; } catch { /* non-JSON body */ }
  if (!res.ok || !json || json.success === false || json.data === undefined || json.data === null) {
    throw new ApiError(json?.error || json?.message || `The music service returned ${res.status || 'an error'}.`, res.status);
  }
  return json.data;
}

/** Try several endpoint styles in order (e.g. `?id=` then `/{id}`), returning the first that works. */
async function firstOf<T>(attempts: Array<() => Promise<T>>): Promise<T> {
  let last: unknown;
  for (const run of attempts) {
    try { return await run(); } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      last = e;
    }
  }
  throw last instanceof Error ? last : new ApiError('Request failed.');
}

type Paged<T> = { results?: T[]; total?: number } | T[];
function results<T>(d: Paged<T> | undefined | null): T[] {
  if (!d) return [];
  return Array.isArray(d) ? d : d.results ?? [];
}

function fixSong(s: Song): Song {
  return { ...s, id: String(s.id), name: decode(s.name), album: s.album ? { ...s.album, name: decode(s.album.name) } : s.album };
}
const fixSongs = (list?: Song[]) => (list ?? []).filter((s) => s && s.id).map(fixSong);
const fixName = <T extends { name: string; id: string }>(x: T): T => ({ ...x, id: String(x.id), name: decode(x.name) });

export type SearchBundle = { songs: Song[]; albums: AlbumLite[]; artists: ArtistLite[]; playlists: PlaylistLite[] };

export async function searchSongs(query: string, page = 0, limit = 20, signal?: AbortSignal): Promise<{ results: Song[]; total: number }> {
  const d = await request<Paged<Song>>('search/songs', { query, page, limit }, signal);
  return { results: fixSongs(results(d)), total: Array.isArray(d) ? d.length : d.total ?? 0 };
}

export async function searchAlbums(query: string, limit = 12, signal?: AbortSignal): Promise<AlbumLite[]> {
  return results(await request<Paged<AlbumLite>>('search/albums', { query, page: 0, limit }, signal)).map(fixName);
}
export async function searchArtists(query: string, limit = 12, signal?: AbortSignal): Promise<ArtistLite[]> {
  return results(await request<Paged<ArtistLite>>('search/artists', { query, page: 0, limit }, signal)).map(fixName);
}
export async function searchPlaylists(query: string, limit = 12, signal?: AbortSignal): Promise<PlaylistLite[]> {
  return results(await request<Paged<PlaylistLite>>('search/playlists', { query, page: 0, limit }, signal)).map(fixName);
}

export async function searchAll(query: string, signal?: AbortSignal): Promise<SearchBundle> {
  const [s, a, ar, p] = await Promise.allSettled([
    searchSongs(query, 0, 20, signal),
    searchAlbums(query, 12, signal),
    searchArtists(query, 12, signal),
    searchPlaylists(query, 12, signal),
  ]);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (s.status === 'rejected' && a.status === 'rejected' && ar.status === 'rejected' && p.status === 'rejected') {
    throw s.reason instanceof Error ? s.reason : new ApiError('Search failed.');
  }
  return {
    songs: s.status === 'fulfilled' ? s.value.results : [],
    albums: a.status === 'fulfilled' ? a.value : [],
    artists: ar.status === 'fulfilled' ? ar.value : [],
    playlists: p.status === 'fulfilled' ? p.value : [],
  };
}

export async function getSong(id: string): Promise<Song | null> {
  const d = await firstOf<Song[] | Song | { songs?: Song[] }>([
    () => request(`songs/${encodeURIComponent(id)}`),
    () => request('songs', { ids: id }),
  ]);
  const list = Array.isArray(d) ? d : 'songs' in d && Array.isArray(d.songs) ? d.songs : [d as Song];
  const s = list[0];
  return s && s.id ? fixSong(s) : null;
}

export async function getSuggestions(id: string, limit = 20): Promise<Song[]> {
  const d = await firstOf<Paged<Song>>([
    () => request(`songs/${encodeURIComponent(id)}/suggestions`, { limit }),
    () => request('recommendations', { id, limit }),
  ]);
  return fixSongs(results(d));
}

export async function getAlbum(id: string): Promise<Album> {
  const d = await firstOf<Album>([
    () => request('albums', { id }),
    () => request(`albums/${encodeURIComponent(id)}`),
  ]);
  return { ...fixName(d), songs: fixSongs(d.songs) };
}

export async function getPlaylist(id: string): Promise<Playlist> {
  const d = await firstOf<Playlist>([
    () => request('playlists', { id, limit: 100 }),
    () => request(`playlists/${encodeURIComponent(id)}`, { limit: 100 }),
  ]);
  return { ...fixName(d), songs: fixSongs(d.songs) };
}

export async function getArtist(id: string): Promise<Artist> {
  const d = await firstOf<Artist>([
    () => request('artists', { id }),
    () => request(`artists/${encodeURIComponent(id)}`),
  ]);
  return {
    ...fixName(d),
    topSongs: fixSongs(d.topSongs),
    topAlbums: (d.topAlbums ?? []).map(fixName),
    singles: (d.singles ?? []).map(fixName),
    similarArtists: (d.similarArtists ?? []).map(fixName),
  };
}

export async function getArtistSongs(id: string, page = 0): Promise<Song[]> {
  const d = await firstOf<{ songs?: Song[]; results?: Song[] } | Song[]>([
    () => request(`artists/${encodeURIComponent(id)}/songs`, { page, sortBy: 'popularity', sortOrder: 'desc' }),
  ]);
  return fixSongs(Array.isArray(d) ? d : d.songs ?? d.results);
}

export async function getArtistAlbums(id: string, page = 0): Promise<AlbumLite[]> {
  const d = await firstOf<{ albums?: AlbumLite[]; results?: AlbumLite[] } | AlbumLite[]>([
    () => request(`artists/${encodeURIComponent(id)}/albums`, { page, sortBy: 'popularity', sortOrder: 'desc' }),
  ]);
  return (Array.isArray(d) ? d : d.albums ?? d.results ?? []).map(fixName);
}

export type LyricsResult = { synced: string | null; plain: string | null; source: 'lrclib' | 'saavn' | null };

export async function getLyrics(song: Song, signal?: AbortSignal): Promise<LyricsResult> {
  const artist = (song.artists?.primary?.[0] ?? song.artists?.all?.[0])?.name ?? '';
  try {
    const url = `/api/lrc${qs({ track: cleanTitle(song.name), artist: decode(artist), album: decode(song.album?.name), duration: song.duration ?? undefined })}`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const j = (await res.json()) as { synced?: string | null; plain?: string | null };
      if (j.synced || j.plain) return { synced: j.synced ?? null, plain: j.plain ?? null, source: 'lrclib' };
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
  }
  if (song.hasLyrics !== false) {
    try {
      const res = await fetch(`/api/lyrics/${encodeURIComponent(song.lyricsId || song.id)}`, { signal });
      if (res.ok) {
        const j = (await res.json()) as { data?: { lyrics?: string; snippet?: string } | null };
        const text = j.data?.lyrics || j.data?.snippet;
        if (text) {
          return { synced: null, plain: htmlToPlain(text), source: 'saavn' };
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
    }
  }
  return { synced: null, plain: null, source: null };
}
