import type { Song } from './types';

/**
 * Pure queue model. `songs` is the list in its original order; `order` is the
 * playback order (indexes into `songs`); `pos` points into `order`.
 */
export type Q = { songs: Song[]; order: number[]; pos: number; shuffle: boolean };

export type Rng = () => number;

export const emptyQ: Q = { songs: [], order: [], pos: -1, shuffle: false };

export function current(q: Q): Song | null {
  if (q.pos < 0 || q.pos >= q.order.length) return null;
  return q.songs[q.order[q.pos]] ?? null;
}

function shuffleIdx(indexes: number[], rng: Rng): number[] {
  const a = [...indexes];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeQueue(songs: Song[], start = 0, shuffle = false, rng: Rng = Math.random): Q {
  if (!songs.length) return { ...emptyQ, shuffle };
  const s = Math.min(Math.max(start, 0), songs.length - 1);
  const all = songs.map((_, i) => i);
  if (!shuffle) return { songs, order: all, pos: s, shuffle };
  const rest = shuffleIdx(all.filter((i) => i !== s), rng);
  return { songs, order: [s, ...rest], pos: 0, shuffle };
}

export function setShuffle(q: Q, on: boolean, rng: Rng = Math.random): Q {
  if (q.shuffle === on) return q;
  if (!q.songs.length) return { ...q, shuffle: on };
  const cur = q.order[q.pos];
  if (on) {
    const rest = shuffleIdx(q.order.filter((_, i) => i !== q.pos), rng);
    // keep what already played before the current track; shuffle only what's upcoming
    const played = q.order.slice(0, q.pos);
    const upcomingSet = new Set(q.order.slice(q.pos + 1));
    const upcoming = rest.filter((i) => upcomingSet.has(i));
    return { ...q, shuffle: true, order: [...played, cur, ...upcoming], pos: played.length };
  }
  const order = q.songs.map((_, i) => i);
  return { ...q, shuffle: false, order, pos: Math.max(0, order.indexOf(cur)) };
}

export function enqueue(q: Q, song: Song): Q {
  if (!q.songs.length) return makeQueue([song], 0, q.shuffle);
  const songs = [...q.songs, song];
  return { ...q, songs, order: [...q.order, songs.length - 1] };
}

export function appendMany(q: Q, add: Song[]): Q {
  return add.reduce((acc, s) => enqueue(acc, s), q);
}

export function enqueueNext(q: Q, song: Song): Q {
  if (!q.songs.length) return makeQueue([song], 0, q.shuffle);
  const songs = [...q.songs, song];
  const order = [...q.order];
  order.splice(q.pos + 1, 0, songs.length - 1);
  return { ...q, songs, order };
}

export function removeAt(q: Q, orderPos: number): Q {
  if (orderPos < 0 || orderPos >= q.order.length) return q;
  const qi = q.order[orderPos];
  const songs = q.songs.filter((_, i) => i !== qi);
  const order = q.order.filter((_, i) => i !== orderPos).map((i) => (i > qi ? i - 1 : i));
  if (!order.length) return { ...emptyQ, shuffle: q.shuffle };
  let pos = q.pos;
  if (orderPos < q.pos) pos -= 1;
  if (pos >= order.length) pos = order.length - 1;
  return { ...q, songs, order, pos };
}

export function jumpTo(q: Q, orderPos: number): Q {
  if (orderPos < 0 || orderPos >= q.order.length) return q;
  return { ...q, pos: orderPos };
}

/** Next track, or null when the queue is finished (and not repeating). */
export function advance(q: Q, repeatAll: boolean, rng: Rng = Math.random): Q | null {
  if (q.pos + 1 < q.order.length) return { ...q, pos: q.pos + 1 };
  if (repeatAll && q.songs.length) {
    const all = q.songs.map((_, i) => i);
    return q.shuffle ? { ...q, order: shuffleIdx(all, rng), pos: 0 } : { ...q, order: all, pos: 0 };
  }
  return null;
}

export function retreat(q: Q, repeatAll: boolean): Q | null {
  if (q.pos > 0) return { ...q, pos: q.pos - 1 };
  if (repeatAll && q.order.length) return { ...q, pos: q.order.length - 1 };
  return null;
}

export function upcoming(q: Q): { song: Song; orderPos: number }[] {
  const out: { song: Song; orderPos: number }[] = [];
  for (let p = q.pos + 1; p < q.order.length; p++) out.push({ song: q.songs[q.order[p]], orderPos: p });
  return out;
}

export function replaceSong(q: Q, fresh: Song): Q {
  if (!q.songs.some((s) => s.id === fresh.id)) return q;
  return { ...q, songs: q.songs.map((s) => (s.id === fresh.id ? fresh : s)) };
}

/** Move an upcoming track (by position in playback order) to another upcoming position. The current track never moves. */
export function moveUpcoming(q: Q, from: number, to: number): Q {
  const last = q.order.length - 1;
  if (from <= q.pos || to <= q.pos || from > last || to > last || from === to) return q;
  const order = [...q.order];
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item);
  return { ...q, order };
}
