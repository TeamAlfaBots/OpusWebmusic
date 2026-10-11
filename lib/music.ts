import type { AudioQuality, Img, MediaItem, Song } from './types';

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };

/** The API sometimes returns HTML entities inside names. */
export function decode(text?: string | null): string {
  if (!text) return '';
  return text.replace(/&(amp|quot|lt|gt|nbsp|#039|#39);/g, (m) => ENTITIES[m] ?? m);
}

export function bestImage(images?: Img[]): string {
  return [...(images ?? [])].reverse().find((x) => x?.url)?.url ?? '';
}

export function smallImage(images?: Img[]): string {
  const list = (images ?? []).filter((x) => x?.url);
  return (list[1] ?? list[0])?.url ?? '';
}

const QUALITY_KBPS: Record<AudioQuality, number> = { low: 96, normal: 160, high: 320 };

function kbps(img: Img): number {
  const n = parseInt(img.quality ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

/** Pick the download URL closest to (but not above) the wanted quality; fall back to the best available. */
export function pickAudio(song: Song, quality: AudioQuality = 'high'): string {
  const list = (song.downloadUrl ?? []).filter((x) => x?.url);
  if (!list.length) return '';
  const want = QUALITY_KBPS[quality];
  const sorted = [...list].sort((a, b) => kbps(a) - kbps(b));
  const atOrBelow = sorted.filter((x) => kbps(x) <= want);
  return (atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : sorted[0]).url;
}

export function bestAudio(song: Song): string {
  return pickAudio(song, 'high');
}

export function artistNames(song: Pick<Song, 'artists'>): string {
  const list = song.artists?.primary?.length ? song.artists.primary : song.artists?.all ?? [];
  return list.map((a) => decode(a.name)).filter(Boolean).join(', ') || 'Unknown artist';
}

export function durationLabel(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function totalLabel(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${Math.max(1, m)} min`;
}

export function compactNumber(value?: number | string | null): string {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!n || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Trim a song down to what we need so localStorage stays small. */
export function slimSong(song: Song): Song {
  const images = (song.image ?? []).filter((x) => x?.url);
  return {
    id: song.id,
    name: song.name,
    duration: song.duration ?? null,
    year: song.year ?? null,
    language: song.language,
    explicitContent: song.explicitContent,
    hasLyrics: song.hasLyrics,
    image: images.length > 2 ? [images[1], images[images.length - 1]] : images,
    downloadUrl: song.downloadUrl,
    artists: { primary: (song.artists?.primary ?? song.artists?.all ?? []).map((a) => ({ id: a.id, name: a.name })) },
    album: song.album ? { id: song.album.id ?? null, name: song.album.name ?? null } : undefined,
  };
}

export function songToMedia(song: Song): MediaItem {
  return { id: song.id, kind: 'album', title: song.name, image: smallImage(song.image) };
}

/** "Tum Hi Ho (From "Aashiqui 2")" -> "Tum Hi Ho" (better matches on lyric databases). */
export function cleanTitle(name: string): string {
  return decode(name)
    .replace(/\s*[\(\[].*?[\)\]]/g, '')
    .replace(/\s+-\s+(from|feat|official|remix|lofi|slowed).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night listening';
}
