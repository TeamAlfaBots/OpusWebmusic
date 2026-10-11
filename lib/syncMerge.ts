import type { SyncPayload, UserPlaylist } from './types';

/**
 * Union of two libraries: nothing is lost when two devices both changed things. Local items come first.
 * On a device's very first sync the cloud's quality setting wins, so a fresh install doesn't overwrite it with its default.
 */
export function mergePayload(local: SyncPayload, remote: SyncPayload, preferRemoteQuality = false): SyncPayload {
  const favIds = new Set(local.favorites.map((s) => s.id));
  const savedKeys = new Set(local.saved.map((s) => `${s.kind}:${s.id}`));
  const remoteById = new Map(remote.playlists.map((p) => [p.id, p]));
  const localIds = new Set(local.playlists.map((p) => p.id));

  const playlists: UserPlaylist[] = local.playlists.map((p) => {
    const r = remoteById.get(p.id);
    if (!r) return p;
    const have = new Set(p.songs.map((s) => s.id));
    return {
      ...p,
      name: r.updatedAt > p.updatedAt ? r.name : p.name,
      updatedAt: Math.max(p.updatedAt, r.updatedAt),
      songs: [...p.songs, ...r.songs.filter((s) => !have.has(s.id))],
    };
  });
  for (const r of remote.playlists) if (!localIds.has(r.id)) playlists.push(r);

  return {
    favorites: [...local.favorites, ...remote.favorites.filter((s) => !favIds.has(s.id))],
    saved: [...local.saved, ...remote.saved.filter((s) => !savedKeys.has(`${s.kind}:${s.id}`))],
    playlists,
    quality: preferRemoteQuality ? remote.quality : local.quality,
  };
}

const ids = (p: SyncPayload) => JSON.stringify([p.favorites.map((s) => s.id), p.saved.map((s) => `${s.kind}:${s.id}`), p.playlists.map((x) => [x.id, x.name, x.songs.map((s) => s.id)]), p.quality]);

/** Cheap "is there anything different" check (compares ids/names, not full song objects). */
export function samePayload(a: SyncPayload, b: SyncPayload): boolean {
  return ids(a) === ids(b);
}
