import { useEffect, useRef } from 'react';
import type { Mode, Settings } from '../lib/types';
import { MODE_NAMES } from '../lib/types';
import { PlayIcon, StarIcon } from './Icons';

type Props = {
  variant: 'pause' | 'settings';
  mode: Mode;
  settings: Settings;
  sessionSeconds: number;
  sessionDust?: number;
  onMode: (m: Mode) => void;
  onSettings: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onEnd: () => void;
};

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function rodeFor(seconds: number) {
  const m = Math.floor(seconds / 60);
  if (m < 1) return 'You rode for under a minute';
  return `You rode for ${m} minute${m === 1 ? '' : 's'}`;
}

export function Sheet({ variant, mode, settings, sessionSeconds, sessionDust = 0, onMode, onSettings, onClose, onEnd }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id="sheet-title">{variant === 'pause' ? 'Paused' : 'Settings'}</h2>
          {variant === 'pause' && (
            <p className="lede small">
              {rodeFor(sessionSeconds)} · <span className="dust-inline"><StarIcon size={13} /> +{sessionDust}</span> stardust so far
            </p>
          )}
        </div>

        {variant === 'pause' && (
          <button ref={firstRef} className="primary medium" onClick={onClose}><PlayIcon size={16} /> <span>Resume</span></button>
        )}

        <div className="rows">
          {variant === 'pause' && (
            <div className="row">
              <label htmlFor="sheet-mode">Mode</label>
              <select id="sheet-mode" className="select" value={mode} onChange={(e) => onMode(e.target.value as Mode)}>
                {(['free', 'gentle', 'night'] as Mode[]).map((m) => <option key={m} value={m}>{MODE_NAMES[m]}</option>)}
              </select>
            </div>
          )}
          <div className="row">
            <label htmlFor="sheet-volume">Sound</label>
            <div className="range-wrap">
              <input
                id="sheet-volume" type="range" min={0} max={100} step={5}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => onSettings({ volume: Number(e.target.value) / 100, muted: false })}
              />
              <span className="range-value">{settings.muted ? 'Muted' : `${Math.round(settings.volume * 100)}%`}</span>
            </div>
          </div>
          <div className="row">
            <span>Reduced motion</span>
            <Switch label="Reduced motion" checked={settings.reducedMotion} onChange={(v) => onSettings({ reducedMotion: v })} />
          </div>
          <div className="row">
            <span>Haptics</span>
            <Switch label="Haptics" checked={settings.haptics} onChange={(v) => onSettings({ haptics: v })} />
          </div>
          <div className="row">
            <span id="fade-label">Line fade time</span>
            <div className="chips" role="group" aria-labelledby="fade-label">
              {[5, 8, 12].map((s) => (
                <button key={s} className="chip" aria-pressed={settings.lineLife === s} onClick={() => onSettings({ lineLife: s })}>{s} s</button>
              ))}
            </div>
          </div>
        </div>

        {variant === 'pause'
          ? <button className="textlink center" onClick={onEnd}>End session</button>
          : <button ref={firstRef} className="secondary" onClick={onClose}>Done</button>}
      </div>
    </div>
  );
}
