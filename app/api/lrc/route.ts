import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type LrcRecord = { trackName?: string; artistName?: string; duration?: number; syncedLyrics?: string | null; plainLyrics?: string | null };

const UA = { 'User-Agent': 'CherryMusic/2.0 (self-hosted web player)', accept: 'application/json' };

async function lrclib(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://lrclib.net/api/${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: UA, next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

/** Synced lyrics from the free LRCLIB database; the client falls back to the music API's own lyrics. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const track = (p.get('track') || '').slice(0, 160);
  const artist = (p.get('artist') || '').slice(0, 160);
  const album = (p.get('album') || '').slice(0, 160);
  const duration = Number(p.get('duration'));
  if (!track) return NextResponse.json({ error: 'Missing track.' }, { status: 400 });
  const cache = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };
  try {
    const exact = (await lrclib('get', {
      track_name: track,
      artist_name: artist,
      album_name: album,
      duration: Number.isFinite(duration) && duration > 0 ? String(Math.round(duration)) : '',
    })) as LrcRecord | null;
    let hit: LrcRecord | null = exact && (exact.syncedLyrics || exact.plainLyrics) ? exact : null;
    if (!hit) {
      const found = (await lrclib('search', { track_name: track, artist_name: artist })) as LrcRecord[] | null;
      const usable = (found ?? []).filter((r) => r.syncedLyrics || r.plainLyrics);
      const close = Number.isFinite(duration) && duration > 0 ? usable.filter((r) => Math.abs((r.duration ?? 0) - duration) <= 5) : usable;
      const pool = close.length ? close : usable;
      hit = pool.find((r) => r.syncedLyrics) ?? pool[0] ?? null;
    }
    if (!hit) return NextResponse.json({ synced: null, plain: null }, { status: 404 });
    return NextResponse.json({ synced: hit.syncedLyrics ?? null, plain: hit.plainLyrics ?? null }, { headers: cache });
  } catch {
    return NextResponse.json({ synced: null, plain: null }, { status: 502 });
  }
}
