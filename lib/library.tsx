'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AudioQuality, MediaItem, MediaKind, Song, SyncPayload, UserPlaylist } from './types';
import { slimSong, uid } from './music';
import { KEYS, loadJson, saveJson } from './storage';

export type Profile = { name: string; handle: string };
export type Prefs = { dynamic: boolean; island: boolean; language: string };

type Persisted = {
  favorites: Song[];
  saved: MediaItem[];
  playlists: UserPlaylist[];
  history: Song[];
  recentSearches: string[];
  quality: AudioQuality;
  profile: Profile;
  prefs: Prefs;
};

const DEFAULTS: Persisted = {
  favorites: [], saved: [], playlists: [], history: [], recentSearches: [], quality: 'high',
  profile: { name: '', handle: '' },
  prefs: { dynamic: true, island: true, language: 'Hindi' },
};
const HISTORY_MAX = 60;

type LibraryAPI = Persisted & {
  ready: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (song: Song) => boolean;
  isSaved: (kind: MediaKind, id: string) => boolean;
  toggleSaved: (item: MediaItem) => boolean;
  createPlaylist: (name: string, firstSongs?: Song[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, songs: Song[]) => number;
  removeFromPlaylist: (id: string, songId: string) => void;
  addHistory: (song: Song) => void;
  clearHistory: () => void;
  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  setQuality: (q: AudioQuality) => void;
  setProfile: (p: Partial<Profile>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  getSyncPayload: () => SyncPayload;
  applySyncPayload: (p: SyncPayload) => void;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
};

const LibraryCtx = createContext<LibraryAPI | null>(null);

export function useLibrary(): LibraryAPI {
  const ctx = useContext(LibraryCtx);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}

function sanitize(raw: Partial<Persisted> | null | undefined): Persisted {
  const r = raw ?? {};
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    favorites: arr<Song>(r.favorites).filter((s) => s && s.id),
    saved: arr<MediaItem>(r.saved).filter((s) => s && s.id && s.kind),
    playlists: arr<UserPlaylist>(r.playlists)
      .filter((p) => p && p.id && typeof p.name === 'string')
      .map((p) => ({ ...p, songs: arr<Song>(p.songs).filter((s) => s && s.id) })),
    history: arr<Song>(r.history).filter((s) => s && s.id).slice(0, HISTORY_MAX),
    recentSearches: arr<string>(r.recentSearches).filter((s) => typeof s === 'string').slice(0, 10),
    quality: r.quality === 'low' || r.quality === 'normal' || r.quality === 'high' ? r.quality : 'high',
    profile: {
      name: typeof r.profile?.name === 'string' ? r.profile.name.slice(0, 40) : '',
      handle: typeof r.profile?.handle === 'string' ? r.profile.handle.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 30) : '',
    },
    prefs: {
      dynamic: r.prefs?.dynamic !== false,
      island: r.prefs?.island !== false,
      language: typeof r.prefs?.language === 'string' && r.prefs.language ? r.prefs.language.slice(0, 20) : 'Hindi',
    },
  };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load once on the client (after hydration, so server and client markup match).
  useEffect(() => {
    setData(sanitize(loadJson<Partial<Persisted> | null>(KEYS.library, null)));
    setReady(true);
  }, []);

  // Debounced save.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => saveJson(KEYS.library, data), 300);
    return () => window.clearTimeout(t);
  }, [data, ready]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.library && e.newValue) {
        try { setData(sanitize(JSON.parse(e.newValue) as Partial<Persisted>)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const favIds = useMemo(() => new Set(data.favorites.map((s) => s.id)), [data.favorites]);
  const savedKeys = useMemo(() => new Set(data.saved.map((s) => `${s.kind}:${s.id}`)), [data.saved]);

  const isFavorite = useCallback((id: string) => favIds.has(id), [favIds]);
  const isSaved = useCallback((kind: MediaKind, id: string) => savedKeys.has(`${kind}:${id}`), [savedKeys]);

  const toggleFavorite = useCallback((song: Song) => {
    const has = dataRef.current.favorites.some((s) => s.id === song.id);
    setData((d) => ({
      ...d,
      favorites: has ? d.favorites.filter((s) => s.id !== song.id) : [slimSong(song), ...d.favorites],
    }));
    return !has;
  }, []);

  const toggleSaved = useCallback((item: MediaItem) => {
    const has = dataRef.current.saved.some((s) => s.kind === item.kind && s.id === item.id);
    setData((d) => ({
      ...d,
      saved: has ? d.saved.filter((s) => !(s.kind === item.kind && s.id === item.id)) : [item, ...d.saved],
    }));
    return !has;
  }, []);

  const createPlaylist = useCallback((name: string, firstSongs: Song[] = []) => {
    const id = uid('pl');
    const now = Date.now();
    const clean = name.trim().slice(0, 80) || 'New playlist';
    setData((d) => ({ ...d, playlists: [{ id, name: clean, createdAt: now, updatedAt: now, songs: firstSongs.map(slimSong) }, ...d.playlists] }));
    return id;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, 80);
    if (!clean) return;
    setData((d) => ({ ...d, playlists: d.playlists.map((p) => (p.id === id ? { ...p, name: clean, updatedAt: Date.now() } : p)) }));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setData((d) => ({ ...d, playlists: d.playlists.filter((p) => p.id !== id) }));
  }, []);

  const addToPlaylist = useCallback((id: string, songs: Song[]) => {
    const target = dataRef.current.playlists.find((p) => p.id === id);
    if (!target) return 0;
    const have = new Set(target.songs.map((s) => s.id));
    const fresh = songs.filter((s) => !have.has(s.id)).map(slimSong);
    if (!fresh.length) return 0;
    setData((d) => ({
      ...d,
      playlists: d.playlists.map((p) => (p.id === id ? { ...p, songs: [...p.songs, ...fresh], updatedAt: Date.now() } : p)),
    }));
    return fresh.length;
  }, []);

  const removeFromPlaylist = useCallback((id: string, songId: string) => {
    setData((d) => ({
      ...d,
      playlists: d.playlists.map((p) => (p.id === id ? { ...p, songs: p.songs.filter((s) => s.id !== songId), updatedAt: Date.now() } : p)),
    }));
  }, []);

  const addHistory = useCallback((song: Song) => {
    setData((d) => ({ ...d, history: [slimSong(song), ...d.history.filter((s) => s.id !== song.id)].slice(0, HISTORY_MAX) }));
  }, []);
  const clearHistory = useCallback(() => setData((d) => ({ ...d, history: [] })), []);

  const addRecentSearch = useCallback((q: string) => {
    const clean = q.trim();
    if (clean.length < 2) return;
    setData((d) => ({ ...d, recentSearches: [clean, ...d.recentSearches.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 10) }));
  }, []);
  const removeRecentSearch = useCallback((q: string) => setData((d) => ({ ...d, recentSearches: d.recentSearches.filter((x) => x !== q) })), []);
  const clearRecentSearches = useCallback(() => setData((d) => ({ ...d, recentSearches: [] })), []);
  const setQuality = useCallback((quality: AudioQuality) => setData((d) => ({ ...d, quality })), []);
  const setProfile = useCallback((p: Partial<Profile>) => setData((d) => ({ ...d, profile: sanitize({ ...d, profile: { ...d.profile, ...p } }).profile })), []);
  const setPrefs = useCallback((p: Partial<Prefs>) => setData((d) => ({ ...d, prefs: sanitize({ ...d, prefs: { ...d.prefs, ...p } }).prefs })), []);

  const getSyncPayload = useCallback((): SyncPayload => {
    const d = dataRef.current;
    return { favorites: d.favorites, saved: d.saved, playlists: d.playlists, quality: d.quality };
  }, []);

  const applySyncPayload = useCallback((p: SyncPayload) => {
    setData((d) => {
      const s = sanitize({ ...d, ...p });
      return { ...d, favorites: s.favorites, saved: s.saved, playlists: s.playlists, quality: s.quality };
    });
  }, []);

  const exportData = useCallback(() => JSON.stringify({ app: 'cherry-music', version: 1, exportedAt: new Date().toISOString(), ...dataRef.current }, null, 2), []);

  const importData = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as Partial<Persisted> & { app?: string };
      if (parsed.app !== 'cherry-music') return { ok: false, error: 'This file is not a Cherry Music backup.' };
      const next = sanitize(parsed);
      setData((d) => ({
        ...next,
        // merge instead of replace, so importing never loses what is already here
        favorites: [...next.favorites, ...d.favorites.filter((s) => !next.favorites.some((n) => n.id === s.id))],
        playlists: [...next.playlists, ...d.playlists.filter((p) => !next.playlists.some((n) => n.id === p.id))],
        saved: [...next.saved, ...d.saved.filter((s) => !next.saved.some((n) => n.id === s.id && n.kind === s.kind))],
        history: [...next.history, ...d.history.filter((s) => !next.history.some((n) => n.id === s.id))].slice(0, HISTORY_MAX),
        recentSearches: d.recentSearches,
        profile: d.profile,
        prefs: d.prefs,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not read that file.' };
    }
  }, []);

  const value = useMemo<LibraryAPI>(
    () => ({
      ...data, ready, isFavorite, toggleFavorite, isSaved, toggleSaved, createPlaylist, renamePlaylist, deletePlaylist,
      addToPlaylist, removeFromPlaylist, addHistory, clearHistory, addRecentSearch, removeRecentSearch, clearRecentSearches,
      setQuality, setProfile, setPrefs, getSyncPayload, applySyncPayload, exportData, importData,
    }),
    [data, ready, isFavorite, toggleFavorite, isSaved, toggleSaved, createPlaylist, renamePlaylist, deletePlaylist, addToPlaylist,
      removeFromPlaylist, addHistory, clearHistory, addRecentSearch, removeRecentSearch, clearRecentSearches, setQuality, setProfile, setPrefs, getSyncPayload, applySyncPayload, exportData, importData],
  );

  return <LibraryCtx.Provider value={value}>{children}</LibraryCtx.Provider>;
}
