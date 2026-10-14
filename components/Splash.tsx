'use client';
import { useEffect, useState } from 'react';
import { CherryBubble } from './icons';

const PETALS = Array.from({ length: 12 }, (_, i) => ({ left: `${(i * 83) % 100}%`, delay: `${-(i * 0.9) % 7}s`, dur: `${6 + (i % 4)}s`, scale: 0.7 + (i % 3) * 0.3 }));

/** Shown once per browser session, fades away on its own. */
export function Splash() {
  const [phase, setPhase] = useState<'show' | 'hide' | 'gone'>('show');
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('cherry:splash') === '1'; sessionStorage.setItem('cherry:splash', '1'); } catch { /* storage blocked */ }
    const t1 = window.setTimeout(() => setPhase('hide'), seen ? 0 : 1700);
    const t2 = window.setTimeout(() => setPhase('gone'), seen ? 50 : 2400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  if (phase === 'gone') return null;
  return (
    <div className={`splash ${phase === 'hide' ? 'hide' : ''}`} aria-hidden="true">
      {PETALS.map((p, i) => (
        <span key={i} className="petal" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, transform: `scale(${p.scale})` }} />
      ))}
      <CherryBubble size={200} />
      <h1 className="mt-6 font-display text-5xl font-extrabold">Cherry<span className="text-cherry-400">Music</span></h1>
      <p className="mt-3 text-lg leading-snug text-white/75">Feel Every Beat<br />In Your World</p>
      <p className="absolute bottom-8 text-sm text-white/55" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>Powered by AlfaBots</p>
    </div>
  );
}
