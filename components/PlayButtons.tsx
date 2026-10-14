'use client';
import { Play, Shuffle } from 'lucide-react';
import { usePlayer } from '@/lib/player';
import type { Song } from '@/lib/types';

/** "Play All" (pink) and a round shuffle button, like the playlist screen mockup. */
export function PlayButtons({ songs, source }: { songs: Song[]; source?: string }) {
  const { playList } = usePlayer();
  const none = songs.length === 0;
  return (
    <>
      <button className="btn btn-primary !h-[52px] min-w-[150px] flex-1 !text-base sm:max-w-[240px]" disabled={none} onClick={() => playList(songs, 0, { source })}>
        <Play size={19} fill="currentColor" />Play All
      </button>
      <button className="icon-btn round !h-[52px] !w-[52px]" aria-label="Shuffle" disabled={none} onClick={() => playList(songs, 0, { shuffle: true, source })}>
        <Shuffle size={20} />
      </button>
    </>
  );
}
