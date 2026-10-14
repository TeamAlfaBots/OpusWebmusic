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

/** Small pink cherries, used inside the Dynamic Island pill. */
export function CherryMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11 21c0-7 3-12 8-15M22 22c0-6-1-11-3-16" fill="none" stroke="#7dd3a8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6c3-2 6-2 8 0-3 2-6 2-8 0z" fill="#7dd3a8" />
      <circle cx="10" cy="23" r="5.5" fill="#ff3d8b" />
      <circle cx="22" cy="24" r="5.5" fill="#ff5fa2" />
      <circle cx="8.3" cy="21.2" r="1.3" fill="#fff" opacity=".6" />
      <circle cx="20.3" cy="22.2" r="1.3" fill="#fff" opacity=".6" />
    </svg>
  );
}

/** Big glass bubble with cherries, used on the splash screen. */
export function CherryBubble({ size = 190 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" className="bubble">
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset=".45" stopColor="#ff9ccb" stopOpacity=".28" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity=".35" />
        </radialGradient>
        <radialGradient id={`c${id}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffb3d4" />
          <stop offset=".5" stopColor="#ff4d94" />
          <stop offset="1" stopColor="#c81e6c" />
        </radialGradient>
        <filter id={`g${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <circle cx="100" cy="100" r="92" fill="#ff5fa2" opacity=".35" filter={`url(#g${id})`} />
      <circle cx="100" cy="100" r="90" fill={`url(#b${id})`} stroke="#ffffff" strokeOpacity=".5" strokeWidth="2" />
      <path d="M40 66c10-22 34-36 60-36" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 120c0-24 8-46 28-62M122 126c0-26-4-48-10-66" fill="none" stroke="#9ae6b4" strokeWidth="5" strokeLinecap="round" />
      <path d="M120 58c10-9 26-10 34-2-10 8-26 9-34 2z" fill="#9ae6b4" />
      <circle cx="84" cy="132" r="26" fill={`url(#c${id})`} />
      <circle cx="128" cy="140" r="26" fill={`url(#c${id})`} />
      <circle cx="74" cy="122" r="6" fill="#fff" opacity=".7" />
      <circle cx="118" cy="130" r="6" fill="#fff" opacity=".7" />
    </svg>
  );
}
