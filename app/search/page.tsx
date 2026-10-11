'use client';
import { Heart } from 'lucide-react';
import { ArtistLinks } from '@/components/ArtistLinks';
import { DetailHeader } from '@/components/DetailHeader';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { ErrorBox, RowSkeletons } from '@/components/States';
import { getAlbum } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { artistNames, bestImage, decode, smallImage, totalLabel } from '@/lib/music';
import { useUI } from '@/lib/ui';

export default function AlbumPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const { data, loading, error, reload } = useAsync(() => getAlbum(id), [id]);

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
  const saved = lib.isSaved('album', data.id);
  const meta = [data.year, `${songs.length || data.songCount || 0} songs`, totalLabel(total)].filter(Boolean).join(' • ');

  return (
    <div className="page">
      <DetailHeader
        label={data.type === 'single' ? 'Single' : 'Album'}
        title={decode(data.name)}
        image={bestImage(data.image)}
        actions={
          <>
            <PlayButtons songs={songs} />
            <button
              className={`icon-btn !h-12 !w-12 border border-white/10 ${saved ? 'on' : ''}`}
              aria-label={saved ? 'Remove album from library' : 'Save album to library'}
              aria-pressed={saved}
              onClick={() => {
                const added = lib.toggleSaved({ id: data.id, kind: 'album', title: decode(data.name), subtitle: artistNames({ artists: data.artists }), image: smallImage(data.image) });
                ui.toast(added ? 'Saved to your library' : 'Removed from your library');
              }}
            >
              <Heart size={22} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </>
        }
      >
        <p className="mt-3 text-white/70"><ArtistLinks credits={data.artists} /></p>
        <p className="mt-1 text-sm text-white/45">{meta}</p>
      </DetailHeader>

      <div className="mt-8">
        {songs.length ? <SongList songs={songs} showIndex /> : <p className="py-10 text-center text-white/50">This album has no playable songs right now.</p>}
      </div>
    </div>
  );
}
