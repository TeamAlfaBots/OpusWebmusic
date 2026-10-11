/** Small SSR-safe wrapper around localStorage. Never throws. */
export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded or storage blocked
  }
}

export const KEYS = {
  library: 'cherry:library:v1',
  player: 'cherry:player:v1',
  progress: 'cherry:progress:v1',
  lang: 'cherry:lang:v1',
  sync: 'cherry:sync:v1',
} as const;
