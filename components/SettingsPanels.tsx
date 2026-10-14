'use client';
import { useRef, useState } from 'react';
import { Cloud, Download, Upload } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks';
import { useLibrary } from '@/lib/library';
import { useSync } from '@/lib/sync';
import { useUI } from '@/lib/ui';

export function CloudSync() {
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

export function BackupPanel() {
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
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold">Backup and restore</h2>
        <p className="mt-1 text-sm text-white/55">Your library lives in this browser. Export it to move to another device or keep a copy.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={doExport}><Download size={17} />Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={17} />Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void doImport(e.target.files?.[0])} />
        </div>
      </section>

      {canInstall && (
        <section>
          <h2 className="text-xl font-bold">Install</h2>
          <p className="mt-1 text-sm text-white/55">Add Cherry Music to your home screen for a full-screen app with lock-screen controls.</p>
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
