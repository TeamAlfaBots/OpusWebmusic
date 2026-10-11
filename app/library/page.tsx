'use client';
import { useRef, useState } from 'react';
import { Cloud } from 'lucide-react';
import Link from 'next/link';
import { Download, Heart, History, ListMusic, Plus, Trash2, Upload } from 'lucide-react';
import { MediaCard } from '@/components/MediaCard';
import { SongList } from '@/components/SongRow';
import { EmptyBox } from '@/components/States';
import { useInstallPrompt } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { smallImage } from '@/lib/music';
import { useSync } from '@/lib/sync';
import { usePlayMedia } from '@/lib/playMedia';
import type { AudioQuality, MediaItem } from '@/lib/types';
import { useUI } from '@/lib/ui';

type Tab = 'playlists' | 'albums' | 'artists' | 'history' | 'settings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'playlists', label: 'Playlists' }, { key: 'albums', label: 'Albums' }, { key: 'artists', label: 'Artists' },
  { key: 'history', label: 'History' }, { key: 'settings', label: 'Settings' },
];

const QUALITIES: { key: AudioQuality; label: string; hint: string }[] = [
  { key: 'low', label: 'Data saver', hint: '96 kbps' },
  { key: 'normal', label: 'Normal', hint: '160 kbps' },
  { key: 'high', label: 'High', hint: '320 kbps' },
];

function SavedGrid({ items, round = false, empty }: { items: MediaItem[]; round?: boolean; empty: { title: string; hint: string } }) {
  const playMedia = usePlayMedia();
  if (!items.length) return <EmptyBox title={empty.title} hint={empty.hint} />;
  return (
    <div className="grid-cards">
      {items.map((m) => (
        <MediaCard key={`${m.kind}-${m.id}`} round={round} title={m.title} subtitle={m.subtitle} image={m.image} href={`/${m.kind}/${encodeURIComponent(m.id)}`} onPlay={() => void playMedia(m.kind, m.id)} />
      ))}
    </div>
  );
}

function CloudSync() {
  const sync = useSync();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sync.configured === null) return null;
  if (sync.configured === false) {
    return (
      <section>
        <h2 className="text-xl font-bold">Cloud sync</h2>
        <p className="mt-1 text-sm text-white/50">Not set up on this server. Add <code className="rounded bg-white/10 px-1">TURSO_DATABASE_URL</code>, <code className="rounded bg-white/10 px-1">TURSO_AUTH_TOKEN</code> and <code className="rounded bg-white/10 px-1">SYNC_SECRET</code> to your environment, then redeploy.</p>
      </section>
    );
  }

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const e = await sync.signIn(mode, username, password);
    setBusy(false);
    if (e) setErr(e); else setPassword('');
  };

  const label = sync.status === 'syncing' ? 'Syncing…' : sync.status === 'error' ? 'Sync failed' : sync.lastSyncedAt ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet';

  return (
    <section>
      <h2 className="text-xl font-bold">Cloud sync</h2>
      <p className="mt-1 text-sm text-white/50">Keep liked songs, playlists, saved albums and followed artists on all your devices. History stays on each device.</p>
      {sync.username ? (
        <div className="glass mt-3 rounded-2xl p-4">
          <p className="flex items-center gap-2 font-semibold"><Cloud size={18} className="text-cherry-400" />Signed in as {sync.username}</p>
          <p className={`mt-1 text-sm ${sync.status === 'error' ? 'text-red-300' : 'text-white/50'}`}>{sync.status === 'error' && sync.error ? sync.error : label}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn !h-9" disabled={sync.status === 'syncing'} onClick={() => void sync.syncNow()}>Sync now</button>
            <button className="btn !h-9" onClick={sync.signOut}>Sign out</button>
          </div>
        </div>
      ) : (
        <form className="glass mt-3 space-y-3 rounded-2xl p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="flex gap-2" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={`chip ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={`chip ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Create account</button>
          </div>
          <input className="text-input" placeholder="Username" aria-label="Username" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="text-input" type="password" placeholder="Password (8+ characters)" aria-label="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          {(err || sync.error) && <p className="text-sm text-red-300" role="alert">{err || sync.error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy || !username.trim() || password.length < 8}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in and sync' : 'Create account and sync'}</button>
        </form>
      )}
    </section>
  );
}

function Settings() {
  const lib = useLibrary();
  const ui = useUI();
  const { canInstall, install } = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([lib.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cherry-music-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { ui.toast('That file is too large to be a backup'); return; }
    const res = lib.importData(await file.text());
    ui.toast(res.ok ? 'Backup imported' : res.error ?? 'Import failed');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-2xl space-y-8">
      <CloudSync />
      <section>
        <h2 className="text-xl font-bold">Streaming quality</h2>
        <p className="mt-1 text-sm text-white/50">Applies to the next song you play.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {QUALITIES.map((q) => (
            <button key={q.key} className={`glass rounded-2xl px-3 py-3 text-left transition ${lib.quality === q.key ? '!border-cherry-400' : ''}`} aria-pressed={lib.quality === q.key} onClick={() => lib.setQuality(q.key)}>
              <span className="block text-sm font-semibold">{q.label}</span>
              <span className="block text-xs text-white/50">{q.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Backup and restore</h2>
        <p className="mt-1 text-sm text-white/50">Your library lives in this browser. Export it to move to another device or keep a copy.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={doExport}><Download size={17} />Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={17} />Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void doImport(e.target.files?.[0])} />
        </div>
      </section>

      {canInstall && (
        <section>
          <h2 className="text-xl font-bold">Install</h2>
          <p className="mt-1 text-sm text-white/50">Add Cherry Music to your home screen for a full-screen app with lock-screen controls.</p>
          <button className="btn btn-primary mt-3" onClick={() => void install()}><Download size={17} />Install app</button>
        </section>
      )}

      <section className="hidden lg:block">
        <h2 className="text-xl font-bold">Keyboard shortcuts</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {[['Space', 'Play or pause'], ['← / →', 'Seek 5 seconds'], ['N / P', 'Next / previous track'], ['S', 'Shuffle'], ['R', 'Repeat'], ['M', 'Mute']].map(([k, v]) => (
            <div key={k} className="contents">
              <dt><kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs">{k}</kbd></dt>
              <dd className="text-white/60">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default function LibraryPage() {
  const lib = useLibrary();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('playlists');
  const saved = (kind: MediaItem['kind']) => lib.saved.filter((m) => m.kind === kind);

  const newPlaylist = async () => {
    const name = await ui.askName('New playlist', '', 'Create');
    if (!name) return;
    lib.createPlaylist(name);
    ui.toast(`Created ${name}`);
  };

  return (
    <div className="page">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Your library</h1>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Library sections">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="mt-7">
        {tab === 'playlists' && (
          <div className="grid-cards">
            <Link href="/liked" className="card">
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br from-cherry-300 via-cherry-500 to-violet-700"><Heart size={56} fill="white" className="text-white" /></div>
              <p className="truncate-1 mt-3 text-[14px] font-semibold">Liked songs</p>
              <p className="truncate-1 mt-0.5 text-[12.5px] text-white/50">{lib.favorites.length} songs</p>
            </Link>
            <button className="card" onClick={() => void newPlaylist()}>
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-white/20 text-white/60"><Plus size={44} /></div>
              <p className="truncate-1 mt-3 text-[14px] font-semibold">New playlist</p>
              <p className="truncate-1 mt-0.5 text-[12.5px] text-white/50">Start from scratch</p>
            </button>
            {lib.playlists.map((p) => (
              <Link key={p.id} href={`/my/${p.id}`} className="card">
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cherry-900 to-violet-900">
                  {p.songs[0]?.image?.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={smallImage(p.songs[0].image)} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : <ListMusic size={44} className="text-white/40" />}
                </div>
                <p className="truncate-1 mt-3 text-[14px] font-semibold">{p.name}</p>
                <p className="truncate-1 mt-0.5 text-[12.5px] text-white/50">{p.songs.length} songs</p>
              </Link>
            ))}
            {saved('playlist').map((m) => (
              <MediaCard key={`pl-${m.id}`} title={m.title} subtitle={m.subtitle} image={m.image} href={`/playlist/${encodeURIComponent(m.id)}`} />
            ))}
          </div>
        )}
        {tab === 'albums' && <SavedGrid items={saved('album')} empty={{ title: 'No saved albums yet', hint: 'Tap the heart on an album to keep it here.' }} />}
        {tab === 'artists' && <SavedGrid round items={saved('artist')} empty={{ title: 'Not following anyone yet', hint: 'Follow artists to find them quickly.' }} />}
        {tab === 'history' && (
          lib.history.length === 0 ? (
            <EmptyBox icon={<History size={28} />} title="Nothing played yet" hint="Songs you listen to will show up here." />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button className="btn !h-9" onClick={() => { lib.clearHistory(); ui.toast('History cleared'); }}><Trash2 size={16} />Clear history</button>
              </div>
              <SongList songs={lib.history} showAlbum />
            </>
          )
        )}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}
