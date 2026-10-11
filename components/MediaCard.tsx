'use client';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { Cover } from './Cover';

type Props = {
  title: string;
  subtitle?: string;
  image?: string;
  /** Navigate on click. Without it the card renders as a button that calls `onOpen`. */
  href?: string;
  onOpen?: () => void;
  onPlay?: () => void;
  round?: boolean;
};

export function MediaCard({ title, subtitle, image, href, onOpen, onPlay, round = false }: Props) {
  const body = (
    <>
      <Cover src={image} alt="" className={`aspect-square w-full ${round ? 'rounded-full' : 'rounded-xl'}`} />
      <p className={`truncate-1 mt-3 text-[14px] font-semibold ${round ? 'text-center' : ''}`} title={title}>{title}</p>
      {subtitle && <p className={`truncate-1 mt-0.5 text-[12.5px] text-white/50 ${round ? 'text-center' : ''}`}>{subtitle}</p>}
    </>
  );
  return (
    <div className="card">
      {href ? (
        <Link href={href} className="block">{body}</Link>
      ) : (
        <button type="button" onClick={onOpen} className="block w-full text-left">{body}</button>
      )}
      {onPlay && (
        <button type="button" className="play-fab sm fab" aria-label={`Play ${title}`} onClick={onPlay}>
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </button>
      )}
    </div>
  );
}
