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
    <div className="page-flush">
      <DetailHeader
        label="Playlist"
        title="Liked Songs"
        artNode={<div className="flex h-full w-full items-start justify-end bg-gradient-to-br from-violet-600 via-cherry-500 to-cherry-300 p-10"><Heart size={96} fill="white" className="text-white/80" /></div>}
        actions={<PlayButtons songs={lib.favorites} source="Liked songs" />}
      >
        <p className="mt-2 text-sm text-white/65">{lib.ready ? `By you • ${lib.favorites.length} ${lib.favorites.length === 1 ? 'song' : 'songs'}` : ''}</p>
      </DetailHeader>
      <div className="pad-x mt-4">
        {!lib.ready ? (
          <RowSkeletons count={5} />
        ) : lib.favorites.length === 0 ? (
          <EmptyBox icon={<Heart size={28} />} title="Songs you like will live here" hint="Tap the heart on any song to save it. Liked songs stay on this device (or sync to your account)." />
        ) : (
          <SongList songs={lib.favorites} showAlbum source="Liked songs" />
        )}
      </div>
    </div>
  );
}
