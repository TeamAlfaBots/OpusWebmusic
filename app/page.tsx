'use client';
import { useEffect, useState } from 'react';
import { MediaCard } from '@/components/MediaCard';
import { QueryShelf } from '@/components/QueryShelf';
import { Shelf } from '@/components/Shelf';
import { CardSkeletons } from '@/components/States';
import { getSuggestions } from '@/lib/api';
import { homeShelves, LANGUAGES } from '@/lib/home';
import { useAsync } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { artistNames, decode, smallImage, timeGreeting } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { KEYS, loadJson, saveJson } from '@/lib/storage';
import type { Song } from '@/lib/types';

function MoreLike({ seed }: { seed: Song }) {
  const { playList } = usePlayer();
  const { data, loading } = useAsync(() => getSuggestions(seed.id, 18), [seed.id]);
  if (loading) return <CardSkeletons />;
  if (!data?.length) return null;
  return (
    <Shelf title={`More like ${decode(seed.name)}`} subtitle="Based on what you played last">
      {data.map((s, i) => (
        <MediaCard key={s.id} title={s.name} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(data, i)} onPlay={() => playList(data, i)} />
      ))}
    </Shelf>
  );
}

export default function HomePage() {
  const lib = useLibrary();
  const { playList } = usePlayer();
  const [lang, setLang] = useState('Hindi');
  const [greeting, setGreeting] = useState('Welcome back');
  const [seed, setSeed] = useState<Song | null>(null);

  useEffect(() => {
    setGreeting(timeGreeting());
    const saved = loadJson<string>(KEYS.lang, 'Hindi');
    if (LANGUAGES.includes(saved)) setLang(saved);
  }, []);

  // Pick the "more like this" seed once, so it doesn't reshuffle every time a new song starts.
  useEffect(() => {
    if (lib.ready && !seed && lib.history[0]) setSeed(lib.history[0]);
  }, [lib.ready, lib.history, seed]);

  const choose = (l: string) => { setLang(l); saveJson(KEYS.lang, l); };

  return (
    <div className="page">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{greeting}</h1>
      <p className="mt-2 text-white/55">What are you in the mood for?</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Music language">
        {LANGUAGES.map((l) => (
          <button key={l} className={`chip ${l === lang ? 'active' : ''}`} aria-pressed={l === lang} onClick={() => choose(l)}>{l}</button>
        ))}
      </div>

      <div className="mt-9">
        {lib.history.length > 0 && (
          <Shelf title="Jump back in">
            {lib.history.slice(0, 16).map((s, i) => (
              <MediaCard key={s.id} title={decode(s.name)} subtitle={artistNames(s)} image={smallImage(s.image)} onOpen={() => playList(lib.history, i)} onPlay={() => playList(lib.history, i)} />
            ))}
          </Shelf>
        )}
        {seed && <div className="mt-9 first:mt-0"><MoreLike seed={seed} /></div>}
        {homeShelves(lang).map((def) => (
          <QueryShelf key={`${lang}-${def.title}`} title={def.title} subtitle={def.subtitle} kind={def.kind} query={def.query} />
        ))}
      </div>
    </div>
  );
}
