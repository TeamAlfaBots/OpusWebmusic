import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Only these top-level API areas can be reached through the proxy.
const ALLOWED = new Set(['search', 'songs', 'albums', 'artists', 'playlists', 'home', 'radio', 'recommendations', 'modules']);
const SEGMENT = /^[A-Za-z0-9_\-.~=]+$/;

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  const segments = context.params.path ?? [];
  if (!segments.length || !ALLOWED.has(segments[0]) || segments.some((s) => s === '.' || s === '..' || !SEGMENT.test(s))) {
    return NextResponse.json({ success: false, error: 'Unknown endpoint.' }, { status: 404 });
  }
  const base = (process.env.SAAVN_API_BASE_URL || 'https://opus-saavn-api.vercel.app').replace(/\/+$/, '');
  const url = new URL(`${base}/api/${segments.map(encodeURIComponent).join('/')}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key.length <= 40 && value.length <= 300) url.searchParams.set(key, value);
  });
  try {
    const upstream = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(15000),
    });
    const text = await upstream.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = null; }
    if (!body) {
      return NextResponse.json({ success: false, error: `Music API returned an unreadable response (${upstream.status}).` }, { status: 502 });
    }
    const status = upstream.ok ? 200 : upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502;
    return NextResponse.json(body, {
      status,
      headers: upstream.ok ? { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } : { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach the music API. Check SAAVN_API_BASE_URL and try again.' }, { status: 502 });
  }
}
