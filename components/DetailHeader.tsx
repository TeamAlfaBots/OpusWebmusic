'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

type Props = {
  label?: string;
  title: string;
  image?: string;
  /** Custom background (e.g. a gradient with an icon) used instead of the image. */
  artNode?: ReactNode;
  /** Buttons in the top-right corner. */
  topRight?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function BackButton() {
  const router = useRouter();
  return (
    <button className="icon-btn round" aria-label="Go back" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/'); }}>
      <ChevronLeft size={22} />
    </button>
  );
}

/** Full-width hero used by album, playlist, artist and liked-songs pages. */
export function DetailHeader({ label, title, image, artNode, topRight, actions, children }: Props) {
  return (
    <header className="hero">
      {artNode ? <div className="hero-bg">{artNode}</div> : <div className="hero-bg" style={image ? { backgroundImage: `url(${image})` } : undefined} />}
      <div className="hero-shade" />
      <div className="hero-content flex items-center justify-between">
        <BackButton />
        <div className="flex items-center gap-2">{topRight}</div>
      </div>
      <div className="hero-content mt-24">
        {label && <p className="text-sm font-semibold text-white/70">{label}</p>}
        <h1 className="mt-1 break-words font-display text-[40px] font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl">{title}</h1>
        {children}
        {actions && <div className="mt-5 flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
