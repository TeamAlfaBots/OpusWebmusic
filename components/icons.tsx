'use client';
import { useId } from 'react';

type IconProps = { size?: number; className?: string };

export function HomeIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function EllipsisIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function CherryLogo({ size = 36 }: { size?: number }) {
  // unique gradient id per instance: the sidebar logo is display:none on mobile and would otherwise break the header one
  const gid = `cl-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb3c1" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gid})`} />
      <path d="M22 44c0-12 6-22 15-28M42 46c0-12-2-22-5-30" fill="none" stroke="#3a0a18" strokeWidth="3" strokeLinecap="round" />
      <path d="M37 16c5-4 11-4 15 0-5 3-11 3-15 0z" fill="#3a0a18" />
      <circle cx="21" cy="45" r="9" fill="#3a0a18" />
      <circle cx="42" cy="47" r="9" fill="#3a0a18" />
      <circle cx="18.5" cy="42" r="2.4" fill="#ffb3c1" opacity=".7" />
      <circle cx="39.5" cy="44" r="2.4" fill="#ffb3c1" opacity=".7" />
    </svg>
  );
}
