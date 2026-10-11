import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, clearFailures, hashPassword, recordFailure, signToken, tooManyAttempts, validPassword, validUsername, verifyPassword } from '@/lib/server/auth';
import { ensureSchema, exec, tursoConfigured } from '@/lib/server/turso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const configured = () => tursoConfigured() && authConfigured();
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Lets the UI know whether cloud sync is set up on this server. */
export async function GET() {
  return NextResponse.json({ configured: configured() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!configured()) return fail('Cloud sync is not set up on this server yet.', 503);

  let body: { action?: string; username?: string; password?: string };
  try {
    const text = await req.text();
    if (text.length > 2000) return fail('Request too large.', 413);
    body = JSON.parse(text);
  } catch { return fail('Invalid request.', 400); }

  const action = body.action === 'register' ? 'register' : body.action === 'login' ? 'login' : null;
  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!action) return fail('Invalid request.', 400);
  if (!validUsername(username)) return fail('Username must be 3–32 characters: letters, numbers, dot, dash or underscore.', 400);
  if (!validPassword(password)) return fail('Password must be at least 8 characters.', 400);

  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `${ip}:${username}`;
  if (tooManyAttempts(key)) return fail('Too many attempts. Try again in a few minutes.', 429);

  try {
    await ensureSchema();
    const existing = (await exec('SELECT pass_hash FROM cherry_users WHERE username = ?', [username])).rows[0];

    if (action === 'register') {
      if (existing) return fail('That username is taken.', 409);
      const inserted = await exec('INSERT OR IGNORE INTO cherry_users (username, pass_hash, created_at) VALUES (?, ?, ?)', [username, await hashPassword(password), Date.now()]);
      if (!inserted.affected) return fail('That username is taken.', 409);
    } else {
      const ok = existing ? await verifyPassword(password, String(existing.pass_hash)) : (await hashPassword(password), false); // equalise timing
      if (!ok) { recordFailure(key); return fail('Wrong username or password.', 401); }
      clearFailures(key);
    }
    return NextResponse.json({ token: signToken(username), username }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync server error.', 502);
  }
}
