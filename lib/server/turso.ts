/**
 * Minimal Turso (libSQL) client over the HTTP "pipeline" API, so no extra npm package is needed.
 * Env: TURSO_DATABASE_URL (libsql://your-db.turso.io) and TURSO_AUTH_TOKEN.
 */
type Arg = string | number | null;
type Cell = { type: string; value?: string | number; base64?: string };
export type Row = Record<string, string | number | null>;
export type ExecResult = { rows: Row[]; affected: number };

export function tursoConfigured(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function baseUrl(): string {
  const raw = (process.env.TURSO_DATABASE_URL || '').trim().replace(/\/+$/, '');
  return raw.replace(/^(libsql|wss|ws):\/\//, 'https://');
}

function encode(v: Arg): Cell {
  if (v === null) return { type: 'null' };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  return { type: 'text', value: v };
}

function decode(c: Cell): string | number | null {
  switch (c.type) {
    case 'null': return null;
    case 'integer':
    case 'float': return Number(c.value);
    case 'text': return String(c.value ?? '');
    default: return c.base64 ?? null;
  }
}

type PipelineResponse = {
  results?: Array<{
    type: string;
    error?: { message?: string };
    response?: { result?: { cols?: { name: string }[]; rows?: Cell[][]; affected_row_count?: number } };
  }>;
};

export async function exec(sql: string, args: Arg[] = []): Promise<ExecResult> {
  const res = await fetch(`${baseUrl()}/v2/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(encode) } }, { type: 'close' }] }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Turso request failed (${res.status}). Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.`);
  const json = (await res.json()) as PipelineResponse;
  const first = json.results?.[0];
  if (!first || first.type === 'error') throw new Error(first?.error?.message || 'Turso query failed');
  const result = first.response?.result;
  const cols = (result?.cols ?? []).map((c) => c.name);
  const rows = (result?.rows ?? []).map((row) => Object.fromEntries(row.map((cell, i) => [cols[i], decode(cell)])) as Row);
  return { rows, affected: Number(result?.affected_row_count ?? 0) };
}

let schemaReady: Promise<void> | null = null;

/** Creates the tables the first time (cheap, idempotent). */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await exec('CREATE TABLE IF NOT EXISTS cherry_users (username TEXT PRIMARY KEY, pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL)');
      await exec('CREATE TABLE IF NOT EXISTS cherry_libraries (username TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)');
    })().catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}
