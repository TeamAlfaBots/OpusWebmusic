'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, Crown, Globe, Headphones, Info, Palette, Sparkles, Volume2 } from 'lucide-react';
import { BackupPanel, CloudSync } from '@/components/SettingsPanels';
import { CherryLogo } from '@/components/icons';
import { LANGUAGES } from '@/lib/home';
import { useLibrary } from '@/lib/library';
import type { AudioQuality } from '@/lib/types';
import { useUI } from '@/lib/ui';

type Option<T extends string> = { value: T; label: string; hint?: string };

function PickSheet<T extends string>({ title, options, value, onPick, onClose }: { title: string; options: Option<T>[]; value: T; onPick: (v: T) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet glass-strong" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 className="px-4 pb-2 pt-4 text-lg font-bold">{title}</h3>
        {options.map((o) => (
          <button key={o.value} className="sheet-item" onClick={() => { onPick(o.value); onClose(); }}>
            <span className="flex-1">{o.label}{o.hint && <span className="ml-2 text-sm text-white/45">{o.hint}</span>}</span>
            {o.value === value && <span className="text-cherry-400">●</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet glass-strong p-5" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-3 text-sm leading-relaxed text-white/70">{children}</div>
        <div className="mt-5 flex justify-end"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, onClick, children }: { icon: ReactNode; label: string; value?: string; onClick?: () => void; children?: ReactNode }) {
  return (
    <button type="button" className="set-row glass" onClick={onClick}>
      <span className="ico">{icon}</span>
      <span>{label}</span>
      {children ?? <span className="val">{value}<ChevronRight size={18} /></span>}
    </button>
  );
}

const QUALITY: Option<AudioQuality>[] = [
  { value: 'low', label: 'Data saver', hint: '96 kbps' },
  { value: 'normal', label: 'Normal', hint: '160 kbps' },
  { value: 'high', label: 'High', hint: '320 kbps' },
];
const QUALITY_LABEL: Record<AudioQuality, string> = { low: 'Data saver', normal: 'Normal', high: 'High' };

export default function PremiumPage() {
  const lib = useLibrary();
  const ui = useUI();
  const [sheet, setSheet] = useState<null | 'quality' | 'appearance' | 'language' | 'upgrade' | 'about' | 'profile'>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const close = () => setSheet(null);
  const premiumUrl = process.env.NEXT_PUBLIC_PREMIUM_URL;

  useEffect(() => { if (sheet === 'profile') { setName(lib.profile.name); setHandle(lib.profile.handle); } }, [sheet, lib.profile]);

  const profileName = lib.profile.name.trim() || 'Your name';
  const profileHandle = lib.profile.handle ? `@${lib.profile.handle}` : 'Tap to set your profile';

  return (
    <div className="page">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CherryLogo size={40} />
          <h1 className="font-display text-[28px] font-extrabold">Cherry<span className="text-cherry-400">Music</span></h1>
        </div>
        <span className="rounded-full bg-gradient-to-r from-cherry-400 to-cherry-600 px-4 py-1.5 text-sm font-bold">Premium</span>
      </header>

      <div className="mx-auto mt-6 max-w-2xl space-y-3">
        <button type="button" className="set-row glass !min-h-[78px] !rounded-[24px]" onClick={() => setSheet('profile')} aria-label="Edit profile">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-cherry-400 to-violet-500 font-display text-lg font-bold">{profileName.charAt(0).toUpperCase()}</span>
          <span className="min-w-0">
            <span className="truncate-1 block text-[17px] font-bold">{profileName}</span>
            <span className="truncate-1 block text-sm font-medium text-white/55">{profileHandle}</span>
          </span>
          <ChevronRight size={20} className="ml-auto text-white/60" />
        </button>

        <Row icon={<Crown size={18} />} label="Upgrade to Premium" onClick={() => setSheet('upgrade')} value="" />
        <Row icon={<Headphones size={18} />} label="Audio Quality" value={QUALITY_LABEL[lib.quality]} onClick={() => setSheet('quality')} />
        <Row icon={<Palette size={18} />} label="Appearance" value={lib.prefs.dynamic ? 'Dynamic' : 'Static'} onClick={() => setSheet('appearance')} />
        <Row icon={<Globe size={18} />} label="Music language" value={lib.prefs.language} onClick={() => setSheet('language')} />
        <button type="button" className="set-row glass" role="switch" aria-checked={lib.prefs.island} onClick={() => lib.setPrefs({ island: !lib.prefs.island })}>
          <span className="ico"><Sparkles size={18} /></span>
          <span>Dynamic Island</span>
          <span className={`switch ${lib.prefs.island ? 'on' : ''}`} aria-hidden="true" />
        </button>
        <Row icon={<Volume2 size={18} />} label="Keyboard and sound tips" onClick={() => ui.toast('Space = play/pause, N/P = next/previous, M = mute')} value="" />
        <Row icon={<Info size={18} />} label="About CherryMusic" onClick={() => setSheet('about')} value="" />

        <div className="space-y-8 pt-6">
          <CloudSync />
          <BackupPanel />
        </div>
      </div>

      {sheet === 'quality' && <PickSheet title="Streaming quality" options={QUALITY} value={lib.quality} onPick={lib.setQuality} onClose={close} />}
      {sheet === 'appearance' && (
        <PickSheet
          title="Appearance"
          options={[{ value: 'dynamic', label: 'Dynamic', hint: 'Colors follow the album art' }, { value: 'static', label: 'Static', hint: 'Always the cherry night theme' }]}
          value={lib.prefs.dynamic ? 'dynamic' : 'static'}
          onPick={(v) => lib.setPrefs({ dynamic: v === 'dynamic' })}
          onClose={close}
        />
      )}
      {sheet === 'language' && <PickSheet title="Music language" options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={lib.prefs.language} onPick={(v) => lib.setPrefs({ language: v })} onClose={close} />}
      {sheet === 'upgrade' && (
        <InfoSheet title="CherryMusic Premium" onClose={close}>
          <p>Premium is coming soon: downloads for offline listening, no interruptions and more.</p>
          {premiumUrl && <a className="btn btn-primary mt-4" href={premiumUrl} target="_blank" rel="noreferrer">Learn more</a>}
        </InfoSheet>
      )}
      {sheet === 'about' && (
        <InfoSheet title="About CherryMusic" onClose={close}>
          <p>CherryMusic 2.0, a liquid-glass music player with synced lyrics, queue, playlists and cloud sync.</p>
          <p className="mt-2">Powered by AlfaBots.</p>
        </InfoSheet>
      )}
      {sheet === 'profile' && (
        <div className="scrim" onClick={close}>
          <div className="sheet glass-strong p-5" role="dialog" aria-modal="true" aria-label="Edit profile" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold">Your profile</h3>
            <input className="text-input mt-4" placeholder="Name" aria-label="Name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <input className="text-input mt-3" placeholder="Username (no spaces)" aria-label="Username" autoCapitalize="none" maxLength={30} value={handle} onChange={(e) => setHandle(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { lib.setProfile({ name, handle }); close(); ui.toast('Profile saved'); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
