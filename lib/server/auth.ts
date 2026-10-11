import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

const scrypt = (password: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, len, (err, key) => (err ? reject(err) : resolve(key))));

function secret(): string | null {
  const s = process.env.SYNC_SECRET || '';
  return s.length >= 16 ? s : null;
}
export const authConfigured = (): boolean => secret() !== null;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `s1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [tag, saltHex, hashHex] = stored.split('$');
  if (tag !== 's1' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('base64url');

/** Signed, expiring session token: base64url(payload).signature */
export function signToken(username: string, days = 30): string {
  const key = secret();
  if (!key) throw new Error('SYNC_SECRET is not set');
  const payload = b64(JSON.stringify({ u: username, exp: Date.now() + days * 86_400_000 }));
  return `${payload}.${sign(payload, key)}`;
}

export function verifyToken(token: string | null): string | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u?: string; exp?: number };
    return typeof u === 'string' && typeof exp === 'number' && exp > Date.now() ? u : null;
  } catch { return null; }
}

export function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

export const validUsername = (u: string) => /^[a-z0-9_.-]{3,32}$/.test(u);
export const validPassword = (p: string) => p.length >= 8 && p.length <= 200;

// Best-effort brute-force guard (in memory: per server instance).
const fails = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string): boolean {
  const f = fails.get(key);
  if (!f) return false;
  if (f.until < Date.now()) { fails.delete(key); return false; }
  return f.n >= 8;
}
export function recordFailure(key: string) {
  const f = fails.get(key);
  fails.set(key, { n: (f && f.until >= Date.now() ? f.n : 0) + 1, until: Date.now() + 10 * 60_000 });
  if (fails.size > 5000) fails.clear();
}
export const clearFailures = (key: string) => { fails.delete(key); };
