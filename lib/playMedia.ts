'use client';
import { useCallback } from 'react';
import type { MediaKind, Song } from './types';
import { getAlbum, getArtist, getArtistSongs, getPlaylist } from './api';
import { usePlayer } from './player';
import { useUI } from './ui';

/** Returns a function that loads an album / playlist / artist and starts playing it. */
export function usePlayMedia() {
  const { playList } = usePlayer();
  const { toast } = useUI();
  return useCallback(
    async (kind: MediaKind, id: string, shuffle = false) => {
      try {
        let songs: Song[] = [];
        if (kind === 'album') songs = (await getAlbum(id)).songs ?? [];
        else if (kind === 'playlist') songs = (await getPlaylist(id)).songs ?? [];
        else {
          const artist = await getArtist(id);
          songs = artist.topSongs?.length ? artist.topSongs : await getArtistSongs(id);
        }
        playList(songs, 0, { shuffle });
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not load that right now');
      }
    },
    [playList, toast],
  );
}
