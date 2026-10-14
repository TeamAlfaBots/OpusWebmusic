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

export const MOODS = ['For You', 'Trending', 'Romantic', 'Lo-Fi', 'Party'] as const;
export type Mood = (typeof MOODS)[number];

/** Shelves for the mood chips on Home (the "For You" mood uses the personal shelves plus `homeShelves`). */
export function moodShelves(mood: Mood, lang: string): ShelfDef[] {
  switch (mood) {
    case 'Trending':
      return [
        { title: `Trending ${lang} songs`, kind: 'songs', query: `trending ${lang}` },
        { title: 'Top charts', kind: 'playlists', query: `${lang} top 50` },
        { title: 'Chart-topping albums', kind: 'albums', query: `${lang} ${new Date().getFullYear()}` },
        { title: 'Artists everyone is playing', kind: 'artists', query: `top ${lang} singers` },
      ];
    case 'Romantic':
      return [
        { title: 'Romantic hits', kind: 'songs', query: `${lang} romantic` },
        { title: 'Love playlists', kind: 'playlists', query: `${lang} love songs` },
        { title: 'Heart-touching albums', kind: 'albums', query: `${lang} romantic albums` },
        { title: 'Sad and slow', kind: 'songs', query: `${lang} sad songs` },
      ];
    case 'Lo-Fi':
      return [
        { title: 'Lo-fi beats', kind: 'songs', query: `${lang} lofi` },
        { title: 'Chill playlists', kind: 'playlists', query: 'lofi chill' },
        { title: 'Slowed and reverb', kind: 'songs', query: `${lang} slowed reverb` },
        { title: 'Late night calm', kind: 'albums', query: 'chill' },
      ];
    case 'Party':
      return [
        { title: 'Party anthems', kind: 'songs', query: `${lang} party` },
        { title: 'Dance floor playlists', kind: 'playlists', query: `${lang} dance` },
        { title: 'Club and remix', kind: 'songs', query: `${lang} remix` },
        { title: 'Workout energy', kind: 'playlists', query: `${lang} workout` },
      ];
    default:
      return homeShelves(lang);
  }
}
