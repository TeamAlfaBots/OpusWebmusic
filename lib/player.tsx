'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RepeatMode, Song } from './types';
import { appendMany, advance, current as currentOf, emptyQ, enqueue, enqueueNext, jumpTo, makeQueue, moveUpcoming, removeAt, replaceSong, retreat, setShuffle, type Q } from './queue';
import { artistNames, decode, pickAudio, slimSong } from './music';
import { getSong, getSuggestions } from './api';
import { KEYS, loadJson, saveJson } from './storage';
import { useLibrary } from './library';
import { useUI } from './ui';

export type PlayerState = {
  ready: boolean;
  current: Song | null;
  queue: Q;
  playing: boolean;
  buffering: boolean;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
  sleepAt: number | null;
  sleepEnd: boolean;
  /** Where the queue came from, e.g. Search “arijit”. */
  source: string;
};

export type PlayerActions = {
  playList: (songs: Song[], startIndex?: number, opts?: { shuffle?: boolean; source?: string }) => void;
  moveInQueue: (from: number, to: number) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (orderPos: number) => void;
  jumpToQueue: (orderPos: number) => void;
  clearUpcoming: () => void;
  startRadio: (song: Song) => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleAutoplay: () => void;
  setSleep: (v: number | 'end' | null) => void;
};

type Player = PlayerState & PlayerActions;
type Time = { progress: number; duration: number };

const PlayerCtx = createContext<Player | null>(null);
const TimeCtx = createContext<Time>({ progress: 0, duration: 0 });

export function usePlayer(): Player {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
export const usePlayerTime = (): Time => useContext(TimeCtx);

type Saved = { songs: Song[]; order: number[]; pos: number; shuffle: boolean; repeat: RepeatMode; volume: number; muted: boolean; autoplay: boolean; source?: string };

const STORAGE_MAX = 200;

/** Keep the saved queue small: if it is huge, store a window around the current track in playback order. */
function trimForStorage(q: Q): Q {
  if (q.songs.length <= STORAGE_MAX) return q;
  const ordered = q.order.map((i) => q.songs[i]);
  const start = Math.max(0, q.pos - 20);
  const songs = ordered.slice(start, start + STORAGE_MAX);
  return { songs, order: songs.map((_, i) => i), pos: Math.max(0, q.pos - start), shuffle: q.shuffle };
}

function artworkFor(song: Song) {
  return (song.image ?? []).filter((i) => i?.url).map((i) => ({
    src: i.url,
    sizes: /^\d+x\d+$/.test(i.quality ?? '') ? (i.quality as string) : '500x500',
    type: 'image/jpeg',
  }));
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const lib = useLibrary();
  const ui = useUI();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [q, setQ] = useState<Q>(emptyQ);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [autoplay, setAutoplay] = useState(true);
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const [sleepEnd, setSleepEnd] = useState(false);
  const [restored, setRestored] = useState(false);
  const [source, setSource] = useState('');

  // Latest values for callbacks that must stay referentially stable.
  const qRef = useRef(q);
  const repeatRef = useRef(repeat);
  const autoplayRef = useRef(autoplay);
  const qualityRef = useRef(lib.quality);
  const sleepEndRef = useRef(sleepEnd);
  const toastRef = useRef(ui.toast);
  const historyRef = useRef(lib.addHistory);
  qRef.current = q;
  repeatRef.current = repeat;
  autoplayRef.current = autoplay;
  qualityRef.current = lib.quality;
  sleepEndRef.current = sleepEnd;
  toastRef.current = ui.toast;
  historyRef.current = lib.addHistory;

  const wantPlayRef = useRef(false);
  const pendingSeekRef = useRef(0);
  const errorCountRef = useRef(0);
  const refreshedRef = useRef<Set<string>>(new Set());
  const restoredRef = useRef(false);
  const lastProgressSave = useRef(0);
  const lastPositionState = useRef(0);
  // refs the memoised actions write into, so <audio> handlers and session restore can call them
  const audioHandlers = useRef<{ onError: () => void; onEnded: () => void }>({ onError: () => {}, onEnded: () => {} });
  const restoreFn = useRef<(saved: Saved) => void>(() => {});

  const actions = useMemo<PlayerActions>(() => {
    const audio = () => audioRef.current;

    const loadSong = (song: Song | null, play: boolean) => {
      const el = audio();
      if (!el) return;
      setProgress(0);
      setDuration(song?.duration ?? 0);
      wantPlayRef.current = play;
      if (!song) {
        el.pause();
        el.removeAttribute('src');
        el.load();
        setPlaying(false);
        setBuffering(false);
        return;
      }
      const url = pickAudio(song, qualityRef.current);
      if (!url) {
        toastRef.current(`“${song.name}” has no playable audio`);
        if (play) api.goNext(true);
        return;
      }
      el.src = url;
      if (play) {
        setBuffering(true);
        el.play().catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setPlaying(false);
          setBuffering(false);
        });
      }
    };

    const commit = (next: Q, play: boolean) => {
      qRef.current = next;
      setQ(next);
      const song = currentOf(next);
      loadSong(song, play);
      if (song && play) historyRef.current(song);
    };

    const stopAtEnd = (auto: boolean) => {
      if (auto) { setPlaying(false); setBuffering(false); } else toastRef.current('That was the last track');
    };

    const api = {
      goNext(auto: boolean) {
        const cur = qRef.current;
        const nxt = advance(cur, repeatRef.current === 'all');
        if (nxt) { commit(nxt, true); return; }
        const song = currentOf(cur);
        if (song && autoplayRef.current) {
          getSuggestions(song.id, 20)
            .then((list) => {
              if (currentOf(qRef.current)?.id !== song.id) return; // user moved on meanwhile
              const have = new Set(qRef.current.songs.map((s) => s.id));
              const fresh = list.filter((s) => !have.has(s.id) && pickAudio(s, 'high'));
              const grown = appendMany(qRef.current, fresh);
              const after = fresh.length ? advance(grown, false) : null;
              if (after) commit(after, true); else stopAtEnd(auto);
            })
            .catch(() => stopAtEnd(auto));
          return;
        }
        stopAtEnd(auto);
      },
    };

    const skipBroken = (song: Song) => {
      errorCountRef.current += 1;
      toastRef.current(`Couldn’t play “${song.name}”`);
      if (errorCountRef.current >= 4) {
        errorCountRef.current = 0;
        setPlaying(false);
        setBuffering(false);
        return;
      }
      api.goNext(true);
    };

    // exposed to the <audio> element handlers below
    audioHandlers.current = {
      onError() {
        const song = currentOf(qRef.current);
        const el = audio();
        if (!song || !el || !el.getAttribute('src')) return;
        if (!refreshedRef.current.has(song.id)) {
          // The saved URL may have expired: fetch fresh details once and retry.
          refreshedRef.current.add(song.id);
          getSong(song.id)
            .then((fresh) => {
              if (!fresh || currentOf(qRef.current)?.id !== song.id) throw new Error('stale');
              const merged = { ...song, ...fresh };
              const updated = replaceSong(qRef.current, merged);
              qRef.current = updated;
              setQ(updated);
              loadSong(merged, wantPlayRef.current);
            })
            .catch(() => skipBroken(song));
          return;
        }
        skipBroken(song);
      },
      onEnded() {
        const el = audio();
        if (!el) return;
        if (repeatRef.current === 'one') {
          el.currentTime = 0;
          el.play().catch(() => setPlaying(false));
          return;
        }
        if (sleepEndRef.current) {
          setSleepEnd(false);
          setPlaying(false);
          toastRef.current('Sleep timer: stopped after this track');
          return;
        }
        api.goNext(true);
      },
    };

    restoreFn.current = (saved: Saved) => {
      const songs = (saved.songs ?? []).filter((s) => s && s.id);
      if (songs.length && Array.isArray(saved.order) && saved.order.every((i) => Number.isInteger(i) && i >= 0 && i < songs.length)) {
        if (typeof saved.source === 'string') setSource(saved.source);
        const restoredQ: Q = { songs, order: saved.order, pos: Math.min(Math.max(saved.pos ?? 0, 0), saved.order.length - 1), shuffle: !!saved.shuffle };
        qRef.current = restoredQ;
        setQ(restoredQ);
        pendingSeekRef.current = loadJson<number>(KEYS.progress, 0) || 0;
        loadSong(currentOf(restoredQ), false);
      }
    };

    return {
      playList(songs, startIndex = 0, opts) {
        const target = songs[startIndex];
        const list = songs.filter((s) => s.downloadUrl && s.downloadUrl.length);
        if (!list.length) { toastRef.current('Nothing playable here yet'); return; }
        const shuffle = opts?.shuffle ?? qRef.current.shuffle;
        const idx = opts?.shuffle ? Math.floor(Math.random() * list.length) : Math.max(0, list.indexOf(target));
        setSource(opts?.source ?? '');
        commit(makeQueue(list, idx, shuffle), true);
      },
      moveInQueue(from, to) {
        const next = moveUpcoming(qRef.current, from, to);
        if (next === qRef.current) return;
        qRef.current = next;
        setQ(next);
      },
      playNext(song) {
        if (!currentOf(qRef.current)) { commit(makeQueue([song], 0, qRef.current.shuffle), true); return; }
        const next = enqueueNext(qRef.current, song);
        qRef.current = next;
        setQ(next);
        toastRef.current('Playing next');
      },
      addToQueue(song) {
        if (!currentOf(qRef.current)) { commit(makeQueue([song], 0, qRef.current.shuffle), true); return; }
        const next = enqueue(qRef.current, song);
        qRef.current = next;
        setQ(next);
        toastRef.current('Added to queue');
      },
      removeFromQueue(orderPos) {
        const before = qRef.current;
        const next = removeAt(before, orderPos);
        if (next === before) return;
        if (orderPos === before.pos) commit(next, !(audio()?.paused ?? true));
        else { qRef.current = next; setQ(next); }
      },
      jumpToQueue(orderPos) {
        commit(jumpTo(qRef.current, orderPos), true);
      },
      clearUpcoming() {
        let next = qRef.current;
        for (let p = next.order.length - 1; p > next.pos; p--) next = removeAt(next, p);
        qRef.current = next;
        setQ(next);
      },
      async startRadio(song) {
        toastRef.current('Starting radio…');
        try {
          const list = await getSuggestions(song.id, 30);
          const fresh = list.filter((s) => s.id !== song.id && pickAudio(s, 'high'));
          if (!fresh.length) { toastRef.current('No similar songs found'); return; }
          commit(makeQueue([song, ...fresh], 0, false), true);
        } catch {
          toastRef.current('Could not start radio right now');
        }
      },
      toggle() {
        const el = audio();
        const song = currentOf(qRef.current);
        if (!el || !song) return;
        if (el.paused) {
          wantPlayRef.current = true;
          if (!el.getAttribute('src')) loadSong(song, true);
          else el.play().catch(() => setPlaying(false));
        } else {
          wantPlayRef.current = false;
          el.pause();
        }
      },
      next() { api.goNext(false); },
      prev() {
        const el = audio();
        if (el && el.currentTime > 3) { el.currentTime = 0; return; }
        const prv = retreat(qRef.current, repeatRef.current === 'all');
        if (prv) commit(prv, true);
        else if (el) el.currentTime = 0;
      },
      seek(seconds) {
        const el = audio();
        if (!el || !Number.isFinite(seconds)) return;
        el.currentTime = Math.max(0, seconds);
        setProgress(el.currentTime);
      },
      seekBy(delta) {
        const el = audio();
        if (!el) return;
        const max = Number.isFinite(el.duration) ? el.duration : Infinity;
        el.currentTime = Math.min(max, Math.max(0, el.currentTime + delta));
        setProgress(el.currentTime);
      },
      setVolume(v) { setVolumeState(Math.min(1, Math.max(0, v))); setMuted(false); },
      toggleMute() { setMuted((m) => !m); },
      toggleShuffle() {
        const next = setShuffle(qRef.current, !qRef.current.shuffle);
        qRef.current = next;
        setQ(next);
      },
      cycleRepeat() { setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')); },
      toggleAutoplay() { setAutoplay((a) => !a); },
      setSleep(v) {
        if (v === null) { setSleepAt(null); setSleepEnd(false); }
        else if (v === 'end') { setSleepAt(null); setSleepEnd(true); }
        else { setSleepAt(Date.now() + v * 60000); setSleepEnd(false); }
      },
    };
  }, []);

  // Restore the last session (paused) once the library (and so audio quality) has loaded.
  useEffect(() => {
    if (!lib.ready || restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadJson<Saved | null>(KEYS.player, null);
    if (saved) {
      if (typeof saved.volume === 'number') setVolumeState(Math.min(1, Math.max(0, saved.volume)));
      setMuted(!!saved.muted);
      if (saved.repeat === 'off' || saved.repeat === 'all' || saved.repeat === 'one') setRepeat(saved.repeat);
      if (typeof saved.autoplay === 'boolean') setAutoplay(saved.autoplay);
      restoreFn.current(saved);
    }
    setRestored(true);
  }, [lib.ready]);

  // Persist the queue and player settings.
  useEffect(() => {
    if (!restored) return;
    const t = window.setTimeout(() => {
      const trimmed = trimForStorage(q);
      const payload: Saved = {
        songs: trimmed.songs.map(slimSong),
        order: trimmed.order,
        pos: trimmed.pos,
        shuffle: trimmed.shuffle,
        repeat, volume, muted, autoplay, source,
      };
      saveJson(KEYS.player, payload);
    }, 400);
    return () => window.clearTimeout(t);
  }, [q, repeat, volume, muted, autoplay, restored, source]);

  // Volume / mute.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  // Sleep timer.
  useEffect(() => {
    if (!sleepAt) return;
    const t = window.setTimeout(() => {
      audioRef.current?.pause();
      setSleepAt(null);
      toastRef.current('Sleep timer ended. Music paused.');
    }, Math.max(0, sleepAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [sleepAt]);

  const song = currentOf(q);
  const songId = song?.id;

  // Lock-screen / notification controls.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!song) { navigator.mediaSession.metadata = null; return; }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: decode(song.name),
        artist: artistNames(song),
        album: decode(song.album?.name),
        artwork: artworkFor(song),
      });
    } catch { /* unsupported artwork format */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const set = (name: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(name, fn); } catch { /* not supported */ }
    };
    set('play', () => { const el = audioRef.current; if (el?.paused) actions.toggle(); });
    set('pause', () => { const el = audioRef.current; if (el && !el.paused) actions.toggle(); });
    set('previoustrack', () => actions.prev());
    set('nexttrack', () => actions.next());
    set('seekbackward', (d) => actions.seekBy(-(d.seekOffset ?? 10)));
    set('seekforward', (d) => actions.seekBy(d.seekOffset ?? 10));
    set('seekto', (d) => { if (typeof d.seekTime === 'number') actions.seek(d.seekTime); });
    return () => {
      (['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]).forEach((n) => set(n, null));
    };
  }, [actions]);

  // Keyboard shortcuts (ignored while typing or when a control has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName))) return;
      switch (e.key) {
        case ' ': if (currentOf(qRef.current)) { e.preventDefault(); actions.toggle(); } break;
        case 'ArrowRight': actions.seekBy(5); break;
        case 'ArrowLeft': actions.seekBy(-5); break;
        case 'n': case 'N': actions.next(); break;
        case 'p': case 'P': actions.prev(); break;
        case 'm': case 'M': actions.toggleMute(); break;
        case 's': case 'S': actions.toggleShuffle(); break;
        case 'r': case 'R': actions.cycleRepeat(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const state = useMemo<PlayerState>(
    () => ({ ready: restored, current: song, queue: q, playing, buffering, volume, muted, repeat, shuffle: q.shuffle, autoplay, sleepAt, sleepEnd, source }),
    [restored, song, q, playing, buffering, volume, muted, repeat, autoplay, sleepAt, sleepEnd, source],
  );
  const value = useMemo<Player>(() => ({ ...state, ...actions }), [state, actions]);
  const time = useMemo<Time>(() => ({ progress, duration }), [progress, duration]);

  return (
    <PlayerCtx.Provider value={value}>
      <TimeCtx.Provider value={time}>
        {children}
        <audio
          ref={audioRef}
          preload="auto"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => { setBuffering(false); errorCountRef.current = 0; }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            if (Number.isFinite(el.duration)) setDuration(el.duration);
            if (pendingSeekRef.current > 0 && pendingSeekRef.current < (el.duration || Infinity) - 2) el.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = 0;
          }}
          onDurationChange={(e) => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration); }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setProgress(el.currentTime);
            const now = Date.now();
            if (now - lastProgressSave.current > 5000) { lastProgressSave.current = now; saveJson(KEYS.progress, el.currentTime); }
            if (now - lastPositionState.current > 1000 && Number.isFinite(el.duration) && el.duration > 0 && 'mediaSession' in navigator) {
              lastPositionState.current = now;
              try { navigator.mediaSession.setPositionState({ duration: el.duration, position: Math.min(el.currentTime, el.duration), playbackRate: el.playbackRate }); } catch { /* ignore */ }
            }
          }}
          onError={() => audioHandlers.current.onError()}
          onEnded={() => audioHandlers.current.onEnded()}
        />
      </TimeCtx.Provider>
    </PlayerCtx.Provider>
  );
}
