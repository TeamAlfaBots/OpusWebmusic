'use client';
import { useState } from 'react';
import { BadgeCheck, Heart, Play, Radio } from 'lucide-react';
import { DetailHeader } from '@/components/DetailHeader';
import { MediaCard } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { SongList } from '@/components/SongRow';
import { ErrorBox, RowSkeletons } from '@/components/States';
import { getArtist, getArtistAlbums, getArtistSongs } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { compactNumber, decode, smallImage, bestImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { usePlayMedia } from '@/lib/playMedia';
import type { AlbumLite } from '@/lib/types';
import { useUI } from '@/lib/ui';

/** The API returns the bio either as a string or as a list of {text} sections. */
function bioText(bio: unknown): string {
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").trim();
  if (typeof bio === 'string') return strip(bio);
  if (Array.isArray(bio)) {
    return bio
      .map((b) => (typeof b === 'string' ? b : b && typeof b === 'object' && 'text' in b ? String((b as { text?: unknown }).text ?? '') : ''))
      .map(strip)
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function albumSubtitle(a: AlbumLite): string {
  return [a.year, a.type === 'single' ? 'Single' : 'Album'].filter(Boolean).join(' • ');
}

export default function ArtistPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const { playList, startRadio } = usePlayer();
  const playMedia = usePlayMedia();
  const [showAll, setShowAll] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  const { data, loading, error, reload } = useAsync(() => getArtist(id), [id]);
  const needSongs = !!data && !(data.topSongs && data.topSongs.length);
  const extraSongs = useAsync(() => getArtistSongs(id), [id], needSongs);
  const needAlbums = !!data && !(data.topAlbums && data.topAlbums.length);
  const extraAlbums = useAsync(() => getArtistAlbums(id), [id], needAlbums);

  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) {
    return (
      <div className="page">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="skeleton h-52 w-52 rounded-full sm:h-60 sm:w-60" />
          <div className="w-full max-w-md"><div className="skeleton h-12 w-3/4" /><div className="skeleton mt-4 h-4 w-1/3" /></div>
        </div>
        <div className="mt-10"><RowSkeletons /></div>
      </div>
    );
  }

  const songs = data.topSongs?.length ? data.topSongs : extraSongs.data ?? [];
  const albums = data.topAlbums?.length ? data.topAlbums : extraAlbums.data ?? [];
  const singles = data.singles ?? [];
  const similar = data.similarArtists ?? [];
  const followers = compactNumber(data.followerCount ?? data.fanCount);
  const following = lib.isSaved('artist', data.id);
  const bio = bioText(data.bio);

  return (
    <div className="page">
      <DetailHeader
        label={data.isVerified ? 'Verified artist' : 'Artist'}
        title={decode(data.name)}
        image={bestImage(data.image)}
        round
        actions={
          <>
            <button className="btn btn-primary !h-12 !px-6" disabled={!songs.length} onClick={() => playList(songs, 0)}><Play size={18} fill="currentColor" />Play</button>
            <button className="btn !h-12" disabled={!songs.length} onClick={() => void startRadio(songs[0])}><Radio size={18} />Artist radio</button>
            <button
              className={`btn !h-12 ${following ? '!border-cherry-400 !text-cherry-300' : ''}`}
              aria-pressed={following}
              onClick={() => {
                const added = lib.toggleSaved({ id: data.id, kind: 'artist', title: decode(data.name), subtitle: 'Artist', image: smallImage(data.image) });
                ui.toast(added ? `Following ${decode(data.name)}` : `Unfollowed ${decode(data.name)}`);
              }}
            >
              <Heart size={18} fill={following ? 'currentColor' : 'none'} />{following ? 'Following' : 'Follow'}
            </button>
          </>
        }
      >
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-white/55 sm:justify-start">
          {data.isVerified && <BadgeCheck size={17} className="text-cherry-400" aria-label="Verified" />}
          {followers ? `${followers} followers` : data.dominantLanguage ? `${decode(data.dominantLanguage)} music` : ''}
        </p>
      </DetailHeader>

      <section className="mt-10">
        <h2 className="mb-2 text-2xl font-bold">Popular</h2>
        {extraSongs.loading && needSongs ? <RowSkeletons count={5} /> : songs.length ? (
          <>
            <SongList songs={showAll ? songs : songs.slice(0, 5)} showIndex />
            {songs.length > 5 && (
              <button className="mt-2 px-3 py-2 text-sm font-semibold text-white/60 hover:text-white" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show less' : `Show all ${songs.length} songs`}
              </button>
            )}
          </>
        ) : <p className="py-4 text-white/50">No songs found for this artist yet.</p>}
      </section>

      {albums.length > 0 && (
        <div className="mt-10">
          <Shelf title="Albums">
            {albums.map((a) => <MediaCard key={a.id} title={decode(a.name)} subtitle={albumSubtitle(a)} image={smallImage(a.image)} href={`/album/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('album', a.id)} />)}
          </Shelf>
        </div>
      )}
      {singles.length > 0 && (
        <div className="mt-10">
          <Shelf title="Singles and EPs">
            {singles.map((a) => <MediaCard key={a.id} title={decode(a.name)} subtitle={albumSubtitle(a)} image={smallImage(a.image)} href={`/album/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('album', a.id)} />)}
          </Shelf>
        </div>
      )}
      {similar.length > 0 && (
        <div className="mt-10">
          <Shelf title="Fans also like">
            {similar.map((a) => <MediaCard key={a.id} round title={decode(a.name)} subtitle="Artist" image={smallImage(a.image)} href={`/artist/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('artist', a.id)} />)}
          </Shelf>
        </div>
      )}

      {bio && (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-3 text-2xl font-bold">About</h2>
          <p className={`whitespace-pre-line leading-relaxed text-white/70 ${bioOpen ? '' : 'line-clamp-5'}`}>{bio}</p>
          {bio.length > 300 && (
            <button className="mt-2 text-sm font-semibold text-cherry-300 hover:underline" onClick={() => setBioOpen((o) => !o)}>{bioOpen ? 'Show less' : 'Read more'}</button>
          )}
        </section>
      )}
    </div>
  );
}
