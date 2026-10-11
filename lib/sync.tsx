'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLibrary } from './library';
import { KEYS, loadJson, saveJson } from './storage';
import { mergePayload, samePayload } from './syncMerge';
import type { SyncPayload } from './types';

type Meta = { token: string | null; username: string | null; lastSyncedAt: number; dirty: boolean };
export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'error';

type SyncAPI = {
  configured: boolean | null;
  username: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  signIn: (mode: 'login' | 'register', username: string, password: string) => Promise<string | null>;
  signOut: () => void;
  syncNow: () => Promise<void>;
};

const SyncCtx = createContext<SyncAPI | null>(null);
export function useSync(): SyncAPI {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}

const EMPTY: Meta = { token: null, username: null, lastSyncedAt: 0, dirty: false };

class SessionExpired extends Error {}

export function SyncProvider({ children }: { children: ReactNode }) {
  const lib = useLibrary();
  const libRef = useRef(lib);
  libRef.current = lib;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [meta, setMeta] = useState<Meta>(EMPTY);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [error, setError] = useState<string | null>(null);

  const metaRef = useRef<Meta>(EMPTY);
  const seq = useRef(0);          // bumps on every local change
  const suppress = useRef(false); // true while we apply remote data, so it isn't treated as a local edit
  const running = useRef(false);
  const again = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const baseline = useRef(false);
  const lastCheck = useRef(0);

  const update = useCallback((patch: Partial<Meta>) => {
    const next = { ...metaRef.current, ...patch };
    metaRef.current = next;
    setMeta(next);
    saveJson(KEYS.sync, next);
  }, []);

  // Load the saved session and ask the server whether sync is set up.
  useEffect(() => {
    const saved = loadJson<Meta>(KEYS.sync, EMPTY);
    if (saved && typeof saved.token === 'string') {
      metaRef.current = { token: saved.token, username: saved.username ?? null, lastSyncedAt: Number(saved.lastSyncedAt) || 0, dirty: !!saved.dirty };
      setMeta(metaRef.current);
      setStatus('idle');
    }
    fetch('/api/sync/auth')
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => setConfigured(!!j.configured))
      .catch(() => setConfigured(false));
  }, []);

  const request = useCallback(async (method: 'GET' | 'PUT', url: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${metaRef.current.token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) throw new SessionExpired('Your sync session expired. Please sign in again.');
    let json: Record<string, unknown> = {};
    try { json = (await res.json()) as Record<string, unknown>; } catch { /* 204 or empty */ }
    return { status: res.status, ok: res.ok, json };
  }, []);

  const signOutInternal = useCallback((message?: string) => {
    window.clearTimeout(timer.current);
    update({ token: null, username: null, lastSyncedAt: 0, dirty: false });
    setStatus('off');
    setError(message ?? null);
  }, [update]);

  const syncNow = useCallback(async () => {
    if (!metaRef.current.token) return;
    if (running.current) { again.current = true; return; }
    running.current = true;
    lastCheck.current = Date.now();
    setStatus('syncing');
    setError(null);
    const startSeq = seq.current;
    try {
      let done = false;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        const got = await request('GET', '/api/sync/library');
        if (!got.ok) throw new Error(String(got.json.error ?? 'Could not reach the sync server.'));
        const remoteData = got.json.data as SyncPayload | null;
        const remoteAt = Number(got.json.updatedAt) || 0;
        const local = libRef.current.getSyncPayload();
        let toPush: SyncPayload;
        let base = remoteAt;

        if (!remoteData) {
          toPush = local;
          base = 0;
        } else if (metaRef.current.dirty) {
          toPush = mergePayload(local, remoteData, metaRef.current.lastSyncedAt === 0);
          if (!samePayload(local, toPush)) { suppress.current = true; libRef.current.applySyncPayload(toPush); }
          if (samePayload(toPush, remoteData)) { update({ lastSyncedAt: remoteAt, dirty: seq.current !== startSeq }); done = true; continue; }
        } else {
          if (remoteAt !== metaRef.current.lastSyncedAt) {
            if (!samePayload(local, remoteData)) { suppress.current = true; libRef.current.applySyncPayload(remoteData); }
            update({ lastSyncedAt: remoteAt });
          }
          done = true;
          continue;
        }

        const put = await request('PUT', '/api/sync/library', { data: toPush, baseUpdatedAt: base });
        if (put.status === 409) continue; // someone else saved first: fetch, merge and try again
        if (!put.ok) throw new Error(String(put.json.error ?? 'Could not save to the sync server.'));
        update({ lastSyncedAt: Number(put.json.updatedAt) || 0, dirty: seq.current !== startSeq });
        done = true;
      }
      if (!done) throw new Error('Sync is busy right now. Try again in a moment.');
      setStatus('synced');
    } catch (e) {
      if (e instanceof SessionExpired) signOutInternal(e.message);
      else { setStatus('error'); setError(e instanceof Error ? e.message : 'Sync failed.'); }
    } finally {
      running.current = false;
      if (again.current) { again.current = false; window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void syncNow(), 800); }
    }
  }, [request, update, signOutInternal]);

  // A local change to the synced data: mark dirty and push shortly after.
  useEffect(() => {
    if (!lib.ready) return;
    if (!baseline.current) { baseline.current = true; return; }
    if (suppress.current) { suppress.current = false; return; }
    if (!metaRef.current.token) return;
    seq.current += 1;
    update({ dirty: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void syncNow(), 2500);
  }, [lib.favorites, lib.saved, lib.playlists, lib.quality, lib.ready, update, syncNow]);

  // Sync once on startup, and again whenever the tab becomes visible.
  useEffect(() => {
    if (!lib.ready) return;
    if (metaRef.current.token) void syncNow();
  }, [lib.ready, syncNow]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && metaRef.current.token && Date.now() - lastCheck.current > 30_000) void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [syncNow]);

  const signIn = useCallback(async (mode: 'login' | 'register', username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/sync/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: mode, username, password }) });
      const json = (await res.json().catch(() => ({}))) as { token?: string; username?: string; error?: string };
      if (!res.ok || !json.token) return json.error || 'Could not sign in.';
      update({ token: json.token, username: json.username ?? username, lastSyncedAt: 0, dirty: true });
      setStatus('idle');
      await syncNow();
      return null;
    } catch {
      return 'Could not reach the server.';
    }
  }, [update, syncNow]);

  const signOut = useCallback(() => signOutInternal(), [signOutInternal]);

  const value = useMemo<SyncAPI>(
    () => ({ configured, username: meta.username, status: meta.token ? status : 'off', lastSyncedAt: meta.lastSyncedAt || null, error, signIn, signOut, syncNow }),
    [configured, meta, status, error, signIn, signOut, syncNow],
  );
  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}
