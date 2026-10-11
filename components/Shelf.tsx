'use client';
import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** A titled, horizontally scrolling row (arrows appear on large screens). */
export function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * Math.max(320, (ref.current?.clientWidth ?? 600) * 0.8), behavior: 'smooth' });
  return (
    <section className="mt-9 first:mt-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate-1 text-[22px] font-bold sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-white/45">{subtitle}</p>}
        </div>
        <div className="hidden gap-1 lg:flex">
          <button className="icon-btn" aria-label="Scroll left" onClick={() => scroll(-1)}><ChevronLeft size={20} /></button>
          <button className="icon-btn" aria-label="Scroll right" onClick={() => scroll(1)}><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="shelf" ref={ref}>{children}</div>
    </section>
  );
}
