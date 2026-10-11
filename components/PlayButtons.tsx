'use client';
import { Play, Shuffle } from 'lucide-react';
import { usePlayer } from '@/lib/player';
import type { Song } from '@/lib/types';

export function PlayButtons({ songs }: { songs: Song[] }) {
  const { playList } = usePlayer();
  const none = songs.length === 0;
  return (
    <>
      <button className="btn btn-primary !h-12 !px-6" disabled={none} onClick={() => playList(songs, 0)}>
        <Play size={18} fill="currentColor" />Play
      </button>
      <button className="btn !h-12" disabled={none} onClick={() => playList(songs, 0, { shuffle: true })}>
        <Shuffle size={18} />Shuffle
      </button>
    </>
  );
}
