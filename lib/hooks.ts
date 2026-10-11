'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type AsyncState<T> = { data: T | null; error: string | null; loading: boolean };

/** Run an async loader whenever `deps` change; cancels stale results. */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[], enabled = true) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: enabled });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) return;
    const ctl = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));
    loadRef.current(ctl.signal)
      .then((data) => { if (!ctl.signal.aborted) setState({ data, error: null, loading: false }); })
      .catch((e: unknown) => {
        if (ctl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        setState({ data: null, error: e instanceof Error ? e.message : 'Something went wrong.', loading: false });
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** True once the element has come within `margin` of the viewport (stays true afterwards). */
export function useInView<T extends Element>(ref: RefObject<T>, margin = '300px'): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, seen]);
  return seen;
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/** Exposes the browser's "install app" prompt when it is available. */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const install = useCallback(async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    setEvt(null);
  }, [evt]);
  return { canInstall: !!evt, install };
}
