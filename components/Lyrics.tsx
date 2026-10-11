'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Mic } from 'lucide-react';
import { getLyrics, type LyricsResult } from '@/lib/api';
import { activeLine, parseLrc } from '@/lib/lrc';
import { usePlayer, usePlayerTime } from '@/lib/player';
import type { Song } from '@/lib/types';

const cache = new Map<string, LyricsResult>();

type State = { id: string; status: 'loading' | 'done'; data: LyricsResult | null };

export function Lyrics({ song, visible }: { song: Song; visible: boolean }) {
  const [state, setState] = useState<State>({ id: '', status: 'loading', data: null });

  useEffect(() => {
    if (!visible) return;
    const hit = cache.get(song.id);
    if (hit) { setState({ id: song.id, status: 'done', data: hit }); return; }
    const ctl = new AbortController();
    setState({ id: song.id, status: 'loading', data: null });
    getLyrics(song, ctl.signal)
      .then((data) => {
        if (ctl.signal.aborted) return;
        cache.set(song.id, data);
        setState({ id: song.id, status: 'done', data });
      })
      .catch(() => { if (!ctl.signal.aborted) setState({ id: song.id, status: 'done', data: null }); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, visible]);

  const fresh = state.id === song.id;
  const data = fresh ? state.data : null;
  const lines = useMemo(() => (data?.synced ? parseLrc(data.synced) : []), [data]);
  const synced = lines.length >= 2;

  if (!fresh || state.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-white/55">
        <LoaderCircle size={18} className="animate-spin" /> Finding lyrics…
      </div>
    );
  }
  if (!data || (!synced && !data.plain)) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <Mic size={28} className="mb-3 text-cherry-400" />
        <p className="font-semibold">No lyrics for this song</p>
        <p className="mt-1 max-w-xs text-sm text-white/50">It may be an instrumental, or the lyrics aren’t in our sources yet.</p>
      </div>
    );
  }
  return synced ? <SyncedLyrics lines={lines} source={data.source} /> : <PlainLyrics text={data.plain ?? ''} source={data.source} />;
}

function Credit({ source }: { source: LyricsResult['source'] }) {
  if (!source) return null;
  return <p className="mt-8 text-xs text-white/30">Lyrics from {source === 'lrclib' ? 'LRCLIB' : 'JioSaavn'}</p>;
}

function PlainLyrics({ text, source }: { text: string; source: LyricsResult['source'] }) {
  return (
    <div className="lyrics plain h-full">
      <p className="lyrics-plain">{text}</p>
      <Credit source={source} />
    </div>
  );
}

function SyncedLyrics({ lines, source }: { lines: { time: number; text: string }[]; source: LyricsResult['source'] }) {
  const { progress } = usePlayerTime();
  const { seek } = usePlayer();
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = activeLine(lines, progress + 0.25);

  useEffect(() => {
    const el = refs.current[idx];
    const c = box.current;
    if (!el || !c) return;
    c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [idx]);

  return (
    <div className="lyrics h-full" ref={box}>
      {lines.map((l, i) => (
        <button
          key={`${l.time}-${i}`}
          ref={(el) => { refs.current[i] = el; }}
          className={`lyric-line synced ${i === idx ? 'now' : i < idx ? 'past' : ''}`}
          onClick={() => seek(l.time)}
        >
          {l.text || '♪'}
        </button>
      ))}
      <Credit source={source} />
    </div>
  );
}
