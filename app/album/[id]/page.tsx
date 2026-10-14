'use client';
import { Heart, Share2 } from 'lucide-react';
import { ArtistLinks } from '@/components/ArtistLinks';
import { DetailHeader } from '@/components/DetailHeader';
import { PlayButtons } from '@/components/PlayButtons';
import { SongList } from '@/components/SongRow';
import { ErrorBox, RowSkeletons } from '@/components/States';
import { getAlbum } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { artistNames, bestImage, decode, smallImage, totalLabel } from '@/lib/music';
import { shareOrCopy } from '@/lib/share';
import { useUI } from '@/lib/ui';

export default function AlbumPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const { data, loading, error, reload } = useAsync(() => getAlbum(id), [id]);

  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) {
    return (
      <div className="page-flush">
        <div className="hero"><div className="hero-content mt-40"><div className="skeleton h-12 w-3/4" /><div className="skeleton mt-4 h-4 w-1/2" /></div></div>
        <div className="pad-x mt-6"><RowSkeletons /></div>
      </div>
    );
  }

  const songs = data.songs ?? [];
  const total = songs.reduce((n, s) => n + (s.duration ?? 0), 0);
  const saved = lib.isSaved('album', data.id);
  const meta = [data.year, `${songs.length || data.songCount || 0} songs`, totalLabel(total)].filter(Boolean).join(' • ');
  const source = `Album “${decode(data.name)}”`;

  return (
    <div className="page-flush">
      <DetailHeader
        label={data.type === 'single' ? 'Single' : 'Album'}
        title={decode(data.name)}
        image={bestImage(data.image)}
        topRight={
          <button className="icon-btn round" aria-label="Share album" onClick={async () => { const m = await shareOrCopy({ title: decode(data.name), text: `${decode(data.name)} on CherryMusic` }); if (m) ui.toast(m); }}>
            <Share2 size={19} />
          </button>
        }
        actions={
          <>
            <PlayButtons songs={songs} source={source} />
            <button
              className={`icon-btn round !h-[52px] !w-[52px] ${saved ? 'on' : ''}`}
              aria-label={saved ? 'Remove album from library' : 'Save album to library'}
              aria-pressed={saved}
              onClick={() => {
                const added = lib.toggleSaved({ id: data.id, kind: 'album', title: decode(data.name), subtitle: artistNames({ artists: data.artists }), image: smallImage(data.image) });
                ui.toast(added ? 'Saved to your library' : 'Removed from your library');
              }}
            >
              <Heart size={21} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </>
        }
      >
        <p className="mt-2 text-white/80"><ArtistLinks credits={data.artists} /></p>
        <p className="mt-1 text-sm text-white/55">{meta}</p>
      </DetailHeader>

      <div className="pad-x mt-4">
        {songs.length ? <SongList songs={songs} showIndex source={source} /> : <p className="py-10 text-center text-white/50">This album has no playable songs right now.</p>}
      </div>
    </div>
  );
}
