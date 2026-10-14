'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Play, Search } from 'lucide-react';
import { MediaCard } from '@/components/MediaCard';
import { QueryShelf } from '@/components/QueryShelf';
import { Shelf } from '@/components/Shelf';
import { CardSkeletons } from '@/components/States';
import { getSuggestions, searchSongs } from '@/lib/api';
import { homeShelves, moodShelves, MOODS, type Mood } from '@/lib/home';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { artistNames, bestImage, decode, smallImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import type { Song } from '@/lib/types';
import { useVoiceSearch } from '@/lib/voice';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 22) return 'Good Evening';
  return 'Late Night';
}

function MoreLike({ seed }: { seed: Song }) {
  const { playList } = usePlayer();
  const { data, loading } = useAsync(() => getSuggestions(seed.id, 18), [seed.id]);
  if (loading) return <CardSkeletons />;
  if (!data?.length) return null;
  return (
    <Shelf title={`More like ${decode(seed.name)}`} subtitle="Based on what you played last">
      {data.map((s, i) => (
        <MediaCard key={s.id} title={s.name} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(data, i, { source: 'More like this' })} onPlay={() => playList(data, i, { source: 'More like this' })} />
      ))}
    </Shelf>
  );
}

/** The big "Feel the music" banner plus the Trending Now shelf, which share one request. */
function Trending({ lang }: { lang: string }) {
  const router = useRouter();
  const { playList } = usePlayer();
  const { data, loading, error, reload } = useAsync((signal) => searchSongs(`trending ${lang}`, 0, 16, signal), [lang]);
  const songs = data?.results ?? [];
  const art = songs[0] ? bestImage(songs[0].image) : '';

  return (
    <>
      <div className="hero-banner mt-6">
        <div className="bg" style={art ? { backgroundImage: `url(${art})` } : { background: 'linear-gradient(135deg, #7c3aed, #ff3d8b)' }} />
        <div className="shade" />
        <div className="relative z-10 max-w-[70%]">
          <h2 className="font-display text-[28px] font-extrabold leading-[1.1]">Feel The Music</h2>
          <p className="mt-1 text-lg font-semibold text-white/80">In a Better Way</p>
          <button className="btn btn-primary mt-4 !h-11" disabled={!songs.length} onClick={() => playList(songs, 0, { source: `Trending ${lang}` })}>
            <Play size={17} fill="currentColor" />Play Now
          </button>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[22px] font-bold sm:text-2xl">Trending Now</h2>
          <button className="text-sm font-semibold text-white/65 hover:text-white" onClick={() => router.push(`/search?q=${encodeURIComponent(`trending ${lang}`)}`)}>See All &rsaquo;</button>
        </div>
        {loading ? <CardSkeletons /> : error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/60">
            <span>Couldn’t load trending songs.</span>
            <button className="btn !h-9" onClick={reload}>Retry</button>
          </div>
        ) : (
          <div className="shelf">
            {songs.map((s, i) => (
              <MediaCard key={s.id} title={s.name} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(songs, i, { source: `Trending ${lang}` })} onPlay={() => playList(songs, i, { source: `Trending ${lang}` })} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  const lib = useLibrary();
  const router = useRouter();
  const { playList } = usePlayer();
  const lang = lib.prefs.language;
  const [mood, setMood] = useState<Mood>('For You');
  const [hello, setHello] = useState('Welcome');
  const [seed, setSeed] = useState<Song | null>(null);
  const [text, setText] = useState('');
  const voice = useVoiceSearch(lang);

  useEffect(() => setHello(greeting()), []);

  // Pick the "more like this" seed once, so it doesn't reshuffle every time a new song starts.
  useEffect(() => {
    if (lib.ready && !seed && lib.history[0]) setSeed(lib.history[0]);
  }, [lib.ready, lib.history, seed]);

  const go = (q: string) => { const t = q.trim(); if (t) router.push(`/search?q=${encodeURIComponent(t)}`); };
  const name = lib.profile.name.trim();
  const initial = (name || 'C').charAt(0).toUpperCase();
  const forYou = mood === 'For You';

  return (
    <div className="page">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[17px] text-white/80">{hello}</p>
          <h1 className="truncate-1 font-display text-[34px] font-extrabold leading-tight sm:text-4xl">{name ? `${name} 👋` : 'Music lover 👋'}</h1>
        </div>
        <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-cherry-400 to-violet-500 font-display text-lg font-bold" aria-label="Open profile" onClick={() => router.push('/premium')}>
          {initial}
        </button>
      </header>

      <form className="search-big mt-5" role="search" onSubmit={(e) => { e.preventDefault(); go(text); }}>
        <Search size={20} className="text-white/55" />
        <input value={text} onChange={(e) => setText(e.target.value)} type="search" enterKeyHint="search" autoComplete="off" aria-label="Search songs, artists, albums" placeholder="Search songs, artists, albums..." />
        {voice.supported && (
          <button type="button" className={`icon-btn !h-9 !w-9 ${voice.listening ? 'on animate-pulse' : ''}`} aria-label="Search by voice" onClick={() => voice.listen((t) => { setText(t); go(t); })}>
            <Mic size={19} />
          </button>
        )}
      </form>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto" role="group" aria-label="Mood">
        {MOODS.map((m) => (
          <button key={m} className={`chip ${m === mood ? 'active' : ''}`} aria-pressed={m === mood} onClick={() => setMood(m)}>{m}</button>
        ))}
      </div>

      {forYou && <Trending lang={lang} />}

      <div className="mt-8">
        {forYou && lib.history.length > 0 && (
          <Shelf title="Jump back in">
            {lib.history.slice(0, 16).map((s, i) => (
              <MediaCard key={s.id} title={decode(s.name)} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(lib.history, i, { source: 'Recently played' })} onPlay={() => playList(lib.history, i, { source: 'Recently played' })} />
            ))}
          </Shelf>
        )}
        {forYou && seed && <div className="mt-9 first:mt-0"><MoreLike seed={seed} /></div>}
        {(forYou ? homeShelves(lang).slice(1) : moodShelves(mood, lang)).map((def) => (
          <QueryShelf key={`${mood}-${lang}-${def.title}`} title={def.title} subtitle={def.subtitle} kind={def.kind} query={def.query} />
        ))}
      </div>
      {!lib.ready && <span className="sr-only" aria-live="polite">Loading</span>}
    </div>
  );
}
