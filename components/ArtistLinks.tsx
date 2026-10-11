import Link from 'next/link';
import type { ArtistRef, Credits } from '@/lib/types';
import { decode } from '@/lib/music';

export function pickCredits(credits?: Credits): ArtistRef[] {
  return (credits?.primary?.length ? credits.primary : credits?.all) ?? [];
}

/** Artist names as links to their pages (clicks don't bubble to a clickable row). */
export function ArtistLinks({ credits, className = '' }: { credits?: Credits; className?: string }) {
  const list = pickCredits(credits);
  if (!list.length) return <span className={className}>Unknown artist</span>;
  return (
    <span className={className}>
      {list.map((a, i) => (
        <span key={`${a.id}-${i}`}>
          {i > 0 && ', '}
          {a.id ? (
            <Link href={`/artist/${encodeURIComponent(a.id)}`} className="link-u" onClick={(e) => e.stopPropagation()}>
              {decode(a.name)}
            </Link>
          ) : (
            decode(a.name)
          )}
        </span>
      ))}
    </span>
  );
}
