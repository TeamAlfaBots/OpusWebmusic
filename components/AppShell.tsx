'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Heart, Library, ListMusic, Plus, Search } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { useUI } from '@/lib/ui';
import { CherryLogo, HomeIcon } from './icons';
import { NowPlaying } from './NowPlaying';
import { NameDialog, SongMenu, ToastHost } from './Overlays';
import { isActivePath, PlayerBar } from './PlayerBar';

const LINKS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Your library', icon: Library },
] as const;

function Sidebar() {
  const pathname = usePathname();
  const lib = useLibrary();
  const ui = useUI();
  const { canInstall, install } = useInstallPrompt();

  const newPlaylist = async () => {
    const name = await ui.askName('New playlist', '', 'Create');
    if (!name) return;
    lib.createPlaylist(name);
    ui.toast(`Created ${name}`);
  };

  return (
    <aside className="sidebar hidden lg:block" aria-label="Sidebar">
      <div className="glass flex h-full flex-col rounded-3xl p-3">
        <Link href="/" className="flex items-center gap-3 px-3 pb-4 pt-2">
          <CherryLogo size={36} />
          <span className="font-display text-xl font-bold tracking-tight">Cherry<span className="text-cherry-400">Music</span></span>
        </Link>

        <nav className="flex flex-col gap-0.5" aria-label="Primary">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const on = isActivePath(pathname, href);
            return (
              <Link key={href} href={href} className={`nav-link ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined}>
                <Icon size={20} />{label}
              </Link>
            );
          })}
          <Link href="/liked" className={`nav-link ${pathname === '/liked' ? 'active' : ''}`}>
            <Heart size={20} />Liked songs
            {lib.favorites.length > 0 && <span className="ml-auto text-xs text-white/40">{lib.favorites.length}</span>}
          </Link>
        </nav>

        <div className="mx-3 my-3 h-px bg-white/10" />
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-sm font-semibold text-white/55">Playlists</span>
          <button className="icon-btn !h-8 !w-8" aria-label="Create playlist" onClick={() => void newPlaylist()}><Plus size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {lib.playlists.length === 0 ? (
            <p className="px-3 py-3 text-sm text-white/40">Make a playlist and it will show up here.</p>
          ) : (
            lib.playlists.map((p) => {
              const href = `/my/${p.id}`;
              return (
                <Link key={p.id} href={href} className={`nav-link !py-2 ${pathname === href ? 'active' : ''}`}>
                  <ListMusic size={18} /><span className="truncate-1">{p.name}</span>
                </Link>
              );
            })
          )}
        </div>

        {canInstall && (
          <button className="btn mt-2 w-full" onClick={() => void install()}><Download size={17} />Install app</button>
        )}
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-4 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(52px + env(safe-area-inset-top, 0px))' }}>
      <Link href="/" className="flex items-center gap-2.5">
        <CherryLogo size={30} />
        <span className="font-display text-lg font-bold tracking-tight">Cherry<span className="text-cherry-400">Music</span></span>
      </Link>
      <Link href="/liked" className="icon-btn" aria-label="Liked songs"><Heart size={21} /></Link>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <MobileHeader />
      <div className="main-pad">{children}</div>
      <PlayerBar />
      <NowPlaying />
      <SongMenu />
      <NameDialog />
      <ToastHost />
    </>
  );
}
