export type ShelfKind = 'songs' | 'albums' | 'playlists' | 'artists';
export type ShelfDef = { title: string; subtitle?: string; kind: ShelfKind; query: string };

export const LANGUAGES = ['Hindi', 'Punjabi', 'English', 'Tamil', 'Telugu', 'Bhojpuri', 'Haryanvi', 'Marathi', 'Bengali', 'Gujarati'];

/**
 * The shelves on the home page. Each one is just a search query against your API,
 * so edit this list freely to change what Home shows.
 */
export function homeShelves(lang: string): ShelfDef[] {
  const year = new Date().getFullYear();
  return [
    { title: `Trending ${lang} songs`, kind: 'songs', query: `trending ${lang}` },
    { title: 'Playlists to start with', kind: 'playlists', query: `${lang} top hits` },
    { title: `New ${lang} albums`, kind: 'albums', query: `${lang} ${year}` },
    { title: 'Romantic', subtitle: 'For the soft moments', kind: 'playlists', query: `${lang} romantic` },
    { title: 'Artists to follow', kind: 'artists', query: `top ${lang} singers` },
    { title: 'Party and dance', kind: 'playlists', query: `${lang} party` },
    { title: 'Chill and lofi', kind: 'songs', query: `${lang} lofi` },
    { title: 'Workout', kind: 'playlists', query: `${lang} workout` },
    { title: 'Retro classics', kind: 'albums', query: `${lang} 90s` },
  ];
}

/** Tiles on the empty search screen. */
export const BROWSE: { name: string; query: string; from: string; to: string }[] = [
  { name: 'Bollywood', query: 'bollywood hits', from: '#be123c', to: '#7c2d12' },
  { name: 'Punjabi', query: 'punjabi hits', from: '#c2410c', to: '#7e22ce' },
  { name: 'Lofi', query: 'lofi chill', from: '#4338ca', to: '#0e7490' },
  { name: 'Romance', query: 'romantic songs', from: '#db2777', to: '#6b21a8' },
  { name: 'Workout', query: 'workout songs', from: '#15803d', to: '#0f766e' },
  { name: 'Retro', query: 'old hindi songs', from: '#a16207', to: '#9f1239' },
  { name: 'Hip-hop', query: 'hip hop', from: '#334155', to: '#7f1d1d' },
  { name: 'Devotional', query: 'bhajan', from: '#d97706', to: '#be185d' },
  { name: 'English pop', query: 'english pop', from: '#7c3aed', to: '#db2777' },
  { name: 'South hits', query: 'tamil telugu hits', from: '#0369a1', to: '#4d7c0f' },
];
