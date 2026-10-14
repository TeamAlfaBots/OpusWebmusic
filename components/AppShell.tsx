'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Crown, Download, Heart, Library, ListMusic, Plus, Search } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { bestImage } from '@/lib/music';
import { usePlayer } from '@/lib/player';
import { useUI } from '@/lib/ui';
import { DynamicIsland } from './DynamicIsland';
import { CherryLogo, HomeIcon } from './icons';
import { Splash } from './Splash';
import { NowPlaying } from './NowPlaying';
import { NameDialog, SongMenu, ToastHost } from './Overlays';
import { isActivePath, PlayerBar } from './PlayerBar';

const LINKS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Your library', icon: Library },
  { href: '/premium', label: 'Premium', icon: Crown },
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

/** Soft, blurred artwork behind the whole app (Premium > Appearance: Dynamic). */
function Ambient() {
  const { current } = usePlayer();
  const { prefs } = useLibrary();
  const art = current ? bestImage(current.image) : '';
  if (!prefs.dynamic || !art) return null;
  return <div className="ambient" style={{ backgroundImage: `url(${art})` }} aria-hidden="true" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  // Phones with a notch / Dynamic Island report a safe-area inset; the island pill sits a bit lower there.
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top, 0px)';
    document.body.appendChild(probe);
    const inset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    if (inset >= 24) document.documentElement.setAttribute('data-notch', '');
  }, []);

  return (
    <>
      <Ambient />
      <Sidebar />
      <div className="main-pad">{children}</div>
      <DynamicIsland />
      <PlayerBar />
      <NowPlaying />
      <SongMenu />
      <NameDialog />
      <ToastHost />
      <Splash />
    </>
  );
}
