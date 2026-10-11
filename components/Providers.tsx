'use client';
import { useEffect, type ReactNode } from 'react';
import { LibraryProvider } from '@/lib/library';
import { PlayerProvider } from '@/lib/player';
import { SyncProvider } from '@/lib/sync';
import { UIProvider } from '@/lib/ui';
import { AppShell } from './AppShell';

function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LibraryProvider>
      <SyncProvider>
        <UIProvider>
          <PlayerProvider>
            <AppShell>{children}</AppShell>
            <ServiceWorker />
          </PlayerProvider>
        </UIProvider>
      </SyncProvider>
    </LibraryProvider>
  );
}
