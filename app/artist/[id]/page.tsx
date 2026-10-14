'use client';
import { useState } from 'react';
import { BadgeCheck, Play, Radio, Share2 } from 'lucide-react';
import { ArtistLinks } from '@/components/ArtistLinks';
import { Cover } from '@/components/Cover';
import { DetailHeader } from '@/components/DetailHeader';
import { EllipsisIcon } from '@/components/icons';
import { MediaCard } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { Equalizer } from '@/components/SongRow';
import { ErrorBox, RowSkeletons } from '@/components/States';
import { getArtist, getArtistAlbums, getArtistSongs } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { bestImage, compactNumber, decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { usePlayMedia } from '@/lib/playMedia';
import { shareOrCopy } from '@/lib/share';
import type { AlbumLite, Song } from '@/lib/types';
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

const albumSubtitle = (a: AlbumLite): string => [a.year, a.type === 'single' ? 'Single' : 'Album'].filter(Boolean).join(' • ');

function RankRow({ song, index, songs, source }: { song: Song; index: number; songs: Song[]; source: string }) {
  const player = usePlayer();
  const lib = useLibrary();
  const ui = useUI();
  const active = player.current?.id === song.id;
  const plays = compactNumber(song.playCount);
  const activate = () => (active ? player.toggle() : player.playList(songs, index, { source }));
  return (
    <div className={`row has-index ${active ? 'active' : ''}`} role="button" tabIndex={0} onClick={activate} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); activate(); } }}>
      <div className="idx">{active ? <Equalizer paused={!player.playing} /> : index + 1}</div>
      <Cover src={smallImage(song.image)} className="h-[52px] w-[52px] rounded-[14px]" />
      <div className="min-w-0">
        <p className={`truncate-1 text-[15.5px] font-semibold ${active ? 'text-cherry-400' : ''}`}>{decode(song.name)}</p>
        <p className="truncate-1 mt-0.5 text-[13px] text-white/60">{plays ? `${plays} plays` : <ArtistLinks credits={song.artists} />}</p>
      </div>
      <div className="row-actions">
        <button type="button" className="icon-btn" aria-label={`More options for ${decode(song.name)}`} onClick={(e) => { e.stopPropagation(); ui.openSongMenu(song); }}>
          <EllipsisIcon size={18} />
        </button>
      </div>
      {lib.isFavorite(song.id) && <span className="sr-only">Liked</span>}
    </div>
  );
}

type Tab = 'popular' | 'albums' | 'about';

export default function ArtistPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const lib = useLibrary();
  const ui = useUI();
  const { playList, startRadio } = usePlayer();
  const playMedia = usePlayMedia();
  const [tab, setTab] = useState<Tab>('popular');
  const [showAll, setShowAll] = useState(false);

  const { data, loading, error, reload } = useAsync(() => getArtist(id), [id]);
  const needSongs = !!data && !(data.topSongs && data.topSongs.length);
  const extraSongs = useAsync(() => getArtistSongs(id), [id], needSongs);
  const needAlbums = !!data && !(data.topAlbums && data.topAlbums.length);
  const extraAlbums = useAsync(() => getArtistAlbums(id), [id], needAlbums);

  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) {
    return (
      <div className="page-flush">
        <div className="hero"><div className="hero-content mt-40"><div className="skeleton h-12 w-3/4" /><div className="skeleton mt-4 h-4 w-1/3" /></div></div>
        <div className="pad-x mt-6"><RowSkeletons /></div>
      </div>
    );
  }

  const songs = data.topSongs?.length ? data.topSongs : extraSongs.data ?? [];
  const albums = [...(data.topAlbums?.length ? data.topAlbums : extraAlbums.data ?? []), ...(data.singles ?? [])];
  const similar = data.similarArtists ?? [];
  const followers = compactNumber(data.followerCount ?? data.fanCount);
  const following = lib.isSaved('artist', data.id);
  const bio = bioText(data.bio);
  const source = `Artist “${decode(data.name)}”`;

  return (
    <div className="page-flush">
      <DetailHeader
        label={data.isVerified ? 'Verified artist' : 'Artist'}
        title={decode(data.name)}
        image={bestImage(data.image)}
        topRight={
          <button className="icon-btn round" aria-label="Share artist" onClick={async () => { const m = await shareOrCopy({ title: decode(data.name), text: `${decode(data.name)} on CherryMusic` }); if (m) ui.toast(m); }}>
            <Share2 size={19} />
          </button>
        }
        actions={
          <>
            <button
              className={`btn !h-[52px] min-w-[130px] flex-1 !text-base sm:max-w-[200px] ${following ? '' : 'btn-primary'}`}
              aria-pressed={following}
              onClick={() => {
                const added = lib.toggleSaved({ id: data.id, kind: 'artist', title: decode(data.name), subtitle: 'Artist', image: smallImage(data.image) });
                ui.toast(added ? `Following ${decode(data.name)}` : `Unfollowed ${decode(data.name)}`);
              }}
            >
              {following ? 'Following' : 'Follow'}
            </button>
            <button className="icon-btn round !h-[52px] !w-[52px]" aria-label="Play top songs" disabled={!songs.length} onClick={() => playList(songs, 0, { source })}><Play size={20} fill="currentColor" /></button>
            <button className="icon-btn round !h-[52px] !w-[52px]" aria-label="Artist radio" disabled={!songs.length} onClick={() => void startRadio(songs[0])}><Radio size={20} /></button>
          </>
        }
      >
        <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
          {data.isVerified && <BadgeCheck size={17} className="text-cherry-400" aria-label="Verified" />}
          {followers ? `${followers} Monthly Listeners` : data.dominantLanguage ? `${decode(data.dominantLanguage)} music` : ''}
        </p>
      </DetailHeader>

      <div className="pad-x mt-5">
        <div className="seg" role="tablist" aria-label="Artist sections">
          {([['popular', 'Popular'], ['albums', 'Albums'], ['about', 'About']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'popular' && (
            extraSongs.loading && needSongs ? <RowSkeletons count={5} /> : songs.length ? (
              <>
                <div className="flex flex-col">
                  {(showAll ? songs : songs.slice(0, 8)).map((s, i) => <RankRow key={`${s.id}-${i}`} song={s} index={i} songs={songs} source={source} />)}
                </div>
                {songs.length > 8 && (
                  <button className="mt-2 px-3 py-2 text-sm font-semibold text-white/65 hover:text-white" onClick={() => setShowAll((x) => !x)}>
                    {showAll ? 'Show less' : `Show all ${songs.length} songs`}
                  </button>
                )}
              </>
            ) : <p className="py-4 text-white/55">No songs found for this artist yet.</p>
          )}

          {tab === 'albums' && (
            albums.length ? (
              <div className="grid-cards">
                {albums.map((a) => <MediaCard key={a.id} title={decode(a.name)} subtitle={albumSubtitle(a)} image={smallImage(a.image)} href={`/album/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('album', a.id)} />)}
              </div>
            ) : <p className="py-4 text-white/55">No albums found.</p>
          )}

          {tab === 'about' && (
            <div className="max-w-3xl">
              {bio ? <p className="whitespace-pre-line leading-relaxed text-white/75">{bio}</p> : <p className="text-white/55">No biography available for this artist yet.</p>}
              {similar.length > 0 && (
                <div className="mt-8">
                  <Shelf title="Fans also like">
                    {similar.map((a) => <MediaCard key={a.id} round title={decode(a.name)} subtitle="Artist" image={smallImage(a.image)} href={`/artist/${encodeURIComponent(a.id)}`} onPlay={() => void playMedia('artist', a.id)} />)}
                  </Shelf>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
