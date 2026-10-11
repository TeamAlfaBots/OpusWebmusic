'use client';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Song } from './types';

export type NpView = 'player' | 'lyrics' | 'queue';
export type Toast = { id: number; message: string };
export type MenuState = { song: Song; onRemove?: () => void; removeLabel?: string } | null;
export type NameDialogState = { title: string; initial: string; confirmLabel: string; resolve: (v: string | null) => void } | null;

type UIAPI = {
  toasts: Toast[];
  toast: (message: string) => void;
  dismissToast: (id: number) => void;
  npOpen: boolean;
  npView: NpView;
  openNowPlaying: (view?: NpView) => void;
  closeNowPlaying: () => void;
  setNpView: (v: NpView) => void;
  menu: MenuState;
  openSongMenu: (song: Song, opts?: { onRemove?: () => void; removeLabel?: string }) => void;
  closeSongMenu: () => void;
  nameDialog: NameDialogState;
  askName: (title: string, initial?: string, confirmLabel?: string) => Promise<string | null>;
  closeNameDialog: (value: string | null) => void;
};

const UICtx = createContext<UIAPI | null>(null);

export function useUI(): UIAPI {
  const ctx = useContext(UICtx);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [npOpen, setNpOpen] = useState(false);
  const [npView, setNpView] = useState<NpView>('player');
  const [menu, setMenu] = useState<MenuState>(null);
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const openNowPlaying = useCallback((view: NpView = 'player') => { setNpView(view); setNpOpen(true); }, []);
  const closeNowPlaying = useCallback(() => setNpOpen(false), []);

  const openSongMenu = useCallback((song: Song, opts?: { onRemove?: () => void; removeLabel?: string }) => setMenu({ song, ...opts }), []);
  const closeSongMenu = useCallback(() => setMenu(null), []);

  const askName = useCallback(
    (title: string, initial = '', confirmLabel = 'Save') =>
      new Promise<string | null>((resolve) => setNameDialog({ title, initial, confirmLabel, resolve })),
    [],
  );
  const closeNameDialog = useCallback((value: string | null) => {
    setNameDialog((d) => { d?.resolve(value); return null; });
  }, []);

  const value = useMemo<UIAPI>(
    () => ({ toasts, toast, dismissToast, npOpen, npView, openNowPlaying, closeNowPlaying, setNpView, menu, openSongMenu, closeSongMenu, nameDialog, askName, closeNameDialog }),
    [toasts, toast, dismissToast, npOpen, npView, openNowPlaying, closeNowPlaying, menu, openSongMenu, closeSongMenu, nameDialog, askName, closeNameDialog],
  );
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}
