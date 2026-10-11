'use client';
import { Heart } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { EmptyBox, RowSkeletons } from '@/components/States';
import { useLibrary } from '@/lib/library';

export default function LikedPage() {
  const lib = useLibrary();
  return (
    <div className="page">
      <DetailHeader
        label="Playlist"
        title="Liked songs"
        artNode={<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cherry-300 via-cherry-500 to-violet-700"><Heart size={84} fill="white" className="text-white" /></div>}
        actions={<PlayButtons songs={lib.favorites} />}
      >
        <p className="mt-3 text-sm text-white/50">{lib.ready ? `${lib.favorites.length} ${lib.favorites.length === 1 ? 'song' : 'songs'}` : ''}</p>
      </DetailHeader>
      <div className="mt-8">
        {!lib.ready ? (
          <RowSkeletons count={5} />
        ) : lib.favorites.length === 0 ? (
          <EmptyBox icon={<Heart size={28} />} title="Songs you like will live here" hint="Tap the heart on any song to save it. Liked songs stay on this device." />
        ) : (
          <SongList songs={lib.favorites} showIndex showAlbum />
        )}
      </div>
    </div>
  );
}
