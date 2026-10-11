'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { Music2 } from 'lucide-react';

/** Artwork with a gradient fallback when the image is missing or fails to load. */
export function Cover({ src, alt = '', className = '', style }: { src?: string; alt?: string; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`cover ${className}`} style={style}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/25">
          <Music2 size={22} />
        </div>
      )}
    </div>
  );
}
