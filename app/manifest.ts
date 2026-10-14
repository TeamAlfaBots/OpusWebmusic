import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cherry Music',
    short_name: 'Cherry',
    description: 'Stream songs, albums and playlists with synced lyrics.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0716',
    theme_color: '#0a0716',
    categories: ['music', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Search', url: '/search', description: 'Find songs, albums and artists' },
      { name: 'Liked songs', url: '/liked' },
      { name: 'Queue', url: '/queue' },
    ],
  };
}
