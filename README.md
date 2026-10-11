# Cherry Music 2.0

A full web music player (Spotify / JioSaavn style) built with Next.js 14, Tailwind and your JioSaavn-compatible API.

## What you get

- **Persistent player**: music keeps playing while you browse. Queue, shuffle, repeat (off / all / one), volume, seek, sleep timer, keyboard shortcuts (Space, ←/→, N, P, M, S, R).
- **Full-screen Now Playing** with **time-synced lyrics** (click a line to seek), queue editor and "keep playing similar songs" autoplay.
- **Pages**: Home (language chips, shelves, recently played, "more like…"), Search (songs / albums / artists / playlists, recent searches), Album, Playlist, Artist (popular, albums, singles, similar artists, bio), Library, Liked songs, your own playlists.
- **Your library** saved in the browser: liked songs, custom playlists (create, rename, delete, add from any song's menu), saved albums/playlists, followed artists, history. Export / import backup from Library > Settings.
- **Cloud sync with Turso** (optional): create an account in Library > Settings and your liked songs, playlists, saved albums, followed artists and quality setting follow you across devices. Changes from two devices are merged, nothing is lost.
- **Audio quality** setting (96 / 160 / 320 kbps).
- **PWA**: installable, lock-screen / notification controls through the Media Session API, resume where you left off after reload.
- If a saved stream URL expires, the player fetches fresh details and retries once before skipping.

## Run it

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

Node 20+ recommended. Deploy: push to GitHub and use the included `render.yaml` (Blueprint) or `Dockerfile`.

## Environment

| Variable | Default |
| --- | --- |
| `SAAVN_API_BASE_URL` | `https://opus-saavn-api.vercel.app` |
| `TURSO_DATABASE_URL` | your `libsql://…turso.io` URL (cloud sync) |
| `TURSO_AUTH_TOKEN` | token from `turso db tokens create` (cloud sync) |
| `SYNC_SECRET` | any random 16+ character string, signs login sessions (cloud sync) |

Cloud sync turns on by itself once all three Turso/sync variables are set. Without them the app works exactly as before and Settings shows a short note. See `.env.example` for the 3 commands to get the values.

## Your API

All music requests go through `app/api/saavn/[...path]/route.ts` (a safe proxy) and are parsed in **`lib/api.ts`**. The code expects the common JioSaavn layout:

`search/songs|albums|artists|playlists?query=`, `songs/{id}`, `songs/{id}/suggestions`, `albums?id=`, `artists?id=`, `artists/{id}/songs|albums`, `playlists?id=`, and `songs/{id}/lyrics` (via `app/api/lyrics/[id]`).

Where it makes sense, the client tries both `?id=` and `/{id}` styles. If your API's paths or response shape differ, change them **only in `lib/api.ts`**.

Synced lyrics come from the free [LRCLIB](https://lrclib.net) database (`app/api/lrc/route.ts`); if nothing is found it falls back to your API's lyrics.

## Customising

- Home shelves: edit `lib/home.ts` (each shelf is a search query).
- Colors and glass look: `app/globals.css` and `tailwind.config.ts`.
- Player logic: `lib/player.tsx` (audio + queue + Media Session), pure queue rules in `lib/queue.ts`.

## Good to know

- Without cloud sync, library data lives only in the browser (localStorage). Use Export backup to move it.
- Cloud sync stores your library as one JSON row per account in Turso (`cherry_libraries`). Passwords are hashed with scrypt; sessions are signed tokens that last 30 days. History and recent searches are not synced. Login attempt limiting is per server instance (best effort), so keep passwords strong.
- Make sure you have the rights to stream the content your API serves.
