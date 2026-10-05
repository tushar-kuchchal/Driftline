import type { Mode } from '../lib/types';
import { BackIcon, HeavyIcon, RacingIcon, TiredIcon } from './Icons';

type Props = { onPick: (m: Mode) => void; onSkip: () => void; onBack: () => void };

const CHOICES: { mode: Mode; name: string; sub: string; icon: React.ReactNode; tint: string; color: string }[] = [
  { mode: 'free', name: 'Racing', sub: 'Free Flow: pour it out into lines', icon: <RacingIcon />, tint: 'rgba(61,220,200,0.14)', color: '#3DDCC8' },
  { mode: 'gentle', name: 'Heavy', sub: 'Gentle Paths: a soft goal to follow', icon: <HeavyIcon />, tint: 'rgba(155,123,255,0.16)', color: '#B9A3FF' },
  { mode: 'night', name: 'Tired', sub: 'Night Mode: slow, dim and quiet', icon: <TiredIcon />, tint: 'rgba(255,138,128,0.14)', color: '#FF8A80' },
];

export function MoodCheck({ onPick, onSkip, onBack }: Props) {
  return (
    <section className="screen mood" aria-labelledby="mood-title">
      <div className="topbar start">
        <button className="icon-btn" aria-label="Back" onClick={onBack}><BackIcon /></button>
      </div>
      <div className="mood-head">
        <h1 id="mood-title" className="heading">How's your mind right now?</h1>
        <p className="lede">Pick one. We'll set the mode for you.</p>
      </div>
      <div className="mood-list">
        {CHOICES.map((c) => (
          <button key={c.mode} className="mood-card" onClick={() => onPick(c.mode)}>
            <span className="mood-icon" style={{ background: c.tint, color: c.color }}>{c.icon}</span>
            <span className="mood-text">
              <span className="mood-name">{c.name}</span>
              <span className="mood-sub">{c.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mood-foot">
        <button className="textlink" onClick={onSkip}>Skip for now</button>
      </div>
    </section>
  );
}
