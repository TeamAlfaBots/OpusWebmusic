'use client';
import { Heart } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { ErrorBox, RowSkeletons } from '@/components/States';
import { getPlaylist } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { bestImage, decode, smallImage, totalLabel } from '@/lib/music';
import { useUI } from '@/lib/ui';

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const { data, loading, error, reload } = useAsync(() => getPlaylist(id), [id]);

  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) {
    return (
      <div className="page">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="skeleton h-52 w-52 rounded-2xl sm:h-60 sm:w-60" />
          <div className="w-full max-w-md"><div className="skeleton h-12 w-3/4" /><div className="skeleton mt-4 h-4 w-1/2" /></div>
        </div>
        <div className="mt-10"><RowSkeletons /></div>
      </div>
    );
  }

  const songs = data.songs ?? [];
  const total = songs.reduce((n, s) => n + (s.duration ?? 0), 0);
  const saved = lib.isSaved('playlist', data.id);
  const meta = [`${songs.length || data.songCount || 0} songs`, totalLabel(total)].filter(Boolean).join(' • ');

  return (
    <div className="page">
      <DetailHeader
        label="Playlist"
        title={decode(data.name)}
        image={bestImage(data.image)}
        actions={
          <>
            <PlayButtons songs={songs} />
            <button
              className={`icon-btn !h-12 !w-12 border border-white/10 ${saved ? 'on' : ''}`}
              aria-label={saved ? 'Remove playlist from library' : 'Save playlist to library'}
              aria-pressed={saved}
              onClick={() => {
                const added = lib.toggleSaved({ id: data.id, kind: 'playlist', title: decode(data.name), subtitle: `${songs.length} songs`, image: smallImage(data.image) });
                ui.toast(added ? 'Saved to your library' : 'Removed from your library');
              }}
            >
              <Heart size={22} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </>
        }
      >
        {data.description && <p className="mt-3 line-clamp-3 max-w-xl text-sm text-white/60">{decode(data.description)}</p>}
        <p className="mt-2 text-sm text-white/45">{meta}</p>
      </DetailHeader>

      <div className="mt-8">
        {songs.length ? <SongList songs={songs} showIndex showAlbum /> : <p className="py-10 text-center text-white/50">This playlist has no playable songs right now.</p>}
      </div>
    </div>
  );
}
