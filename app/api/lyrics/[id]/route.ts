import { NextRequest, NextResponse } from 'next/server';
export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id;
  if (!id || id.length > 180 || /[\/?#]/.test(id)) return NextResponse.json({ success: false, error: 'Invalid song ID.' }, { status: 400 });
  const base = (process.env.SAAVN_API_BASE_URL || 'https://opus-saavn-api.vercel.app').replace(/\/+$/, '');
  try {
    const response = await fetch(`${base}/api/songs/${encodeURIComponent(id)}/lyrics`, { headers: { accept: 'application/json' }, next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) return NextResponse.json({ success: false, error: 'Lyrics are currently unavailable.' }, { status: 502 });
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch { return NextResponse.json({ success: false, error: 'Could not reach the lyrics service.' }, { status: 502 }); }
}
