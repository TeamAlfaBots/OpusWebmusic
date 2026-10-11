import { NextRequest, NextResponse } from 'next/server';
import { bearer, verifyToken } from '@/lib/server/auth';
import { ensureSchema, exec, tursoConfigured } from '@/lib/server/turso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 3_500_000;
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });

function user(req: NextRequest): string | null {
  return verifyToken(bearer(req));
}

type Clean = { favorites: unknown[]; saved: unknown[]; playlists: unknown[]; quality: string };

/** Keep only the known fields and cap their sizes. */
function clean(raw: unknown): Clean | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);
  const playlists = arr(r.playlists, 300).map((p) => (p && typeof p === 'object' ? { ...(p as object), songs: arr((p as { songs?: unknown }).songs, 3000) } : p));
  return {
    favorites: arr(r.favorites, 5000),
    saved: arr(r.saved, 2000),
    playlists,
    quality: r.quality === 'low' || r.quality === 'normal' || r.quality === 'high' ? r.quality : 'high',
  };
}

async function load(username: string) {
  const row = (await exec('SELECT data, updated_at FROM cherry_libraries WHERE username = ?', [username])).rows[0];
  return row ? { data: String(row.data), updatedAt: Number(row.updated_at) } : null;
}

export async function GET(req: NextRequest) {
  const username = user(req);
  if (!username) return fail('Please sign in again.', 401);
  if (!tursoConfigured()) return fail('Cloud sync is not set up on this server yet.', 503);
  try {
    await ensureSchema();
    const row = await load(username);
    const since = Number(req.nextUrl.searchParams.get('since') || 0);
    if (row && since && since === row.updatedAt) return new NextResponse(null, { status: 204, headers: NO_STORE });
    return NextResponse.json({ data: row ? JSON.parse(row.data) : null, updatedAt: row ? row.updatedAt : 0 }, { headers: NO_STORE });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync server error.', 502);
  }
}

export async function PUT(req: NextRequest) {
  const username = user(req);
  if (!username) return fail('Please sign in again.', 401);
  if (!tursoConfigured()) return fail('Cloud sync is not set up on this server yet.', 503);

  let payload: Clean | null;
  let base: number;
  try {
    const text = await req.text();
    if (text.length > MAX_BYTES) return fail('Your library is too large to sync.', 413);
    const body = JSON.parse(text) as { data?: unknown; baseUpdatedAt?: unknown };
    payload = clean(body.data);
    base = Number(body.baseUpdatedAt || 0);
  } catch { return fail('Invalid request.', 400); }
  if (!payload) return fail('Invalid library data.', 400);

  try {
    await ensureSchema();
    const current = await load(username);
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_BYTES) return fail('Your library is too large to sync.', 413);

    if (!current) {
      if (base !== 0) return fail('Out of date.', 409, { updatedAt: 0 });
      const updatedAt = Date.now();
      const ins = await exec('INSERT OR IGNORE INTO cherry_libraries (username, data, updated_at) VALUES (?, ?, ?)', [username, serialized, updatedAt]);
      if (!ins.affected) return fail('Out of date.', 409, { updatedAt: 0 });
      return NextResponse.json({ updatedAt }, { headers: NO_STORE });
    }

    if (current.updatedAt !== base) return fail('Out of date.', 409, { updatedAt: current.updatedAt });
    const updatedAt = Math.max(Date.now(), current.updatedAt + 1);
    const upd = await exec('UPDATE cherry_libraries SET data = ?, updated_at = ? WHERE username = ? AND updated_at = ?', [serialized, updatedAt, username, base]);
    if (!upd.affected) return fail('Out of date.', 409, { updatedAt: current.updatedAt });
    return NextResponse.json({ updatedAt }, { headers: NO_STORE });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync server error.', 502);
  }
}
