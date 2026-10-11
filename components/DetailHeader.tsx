import type { ReactNode } from 'react';
import { Cover } from './Cover';

type Props = {
  label: string;
  title: string;
  image?: string;
  artNode?: ReactNode;
  round?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

/** Shared header for album, playlist, artist and library detail pages. */
export function DetailHeader({ label, title, image, artNode, round = false, actions, children }: Props) {
  return (
    <>
      <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <div className={`h-52 w-52 shrink-0 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.5)] sm:h-56 sm:w-56 lg:h-60 lg:w-60 ${round ? 'rounded-full' : 'rounded-2xl'}`}>
          {artNode ?? <Cover src={image} className="h-full w-full" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/60">{label}</p>
          <h1 className="mt-1 break-words font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">{title}</h1>
          {children}
        </div>
      </header>
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">{actions}</div>}
    </>
  );
}
