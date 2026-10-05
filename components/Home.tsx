import type { Mode } from '../lib/types';
import { MODE_NAMES } from '../lib/types';
import { GearIcon, PlayIcon, StarIcon } from './Icons';

const RIDE = 'M -10 470 C 80 420, 150 540, 230 490 S 340 410, 400 440';

type Props = {
  mode: Mode;
  reducedMotion: boolean;
  dust: number;
  onMode: (m: Mode) => void;
  onStart: () => void;
  onSettings: () => void;
  onRewards: () => void;
};

export function Home({ mode, reducedMotion, dust, onMode, onStart, onSettings, onRewards }: Props) {
  return (
    <section className="screen home" aria-labelledby="home-title">
      <svg className="home-art" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="home-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3DDCC8" />
            <stop offset="0.5" stopColor="#9B7BFF" />
            <stop offset="1" stopColor="#FF8A80" />
          </linearGradient>
          <filter id="home-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <path d={RIDE} fill="none" stroke="url(#home-line)" strokeWidth="16" opacity="0.45" filter="url(#home-glow)" />
        <path d={RIDE} fill="none" stroke="url(#home-line)" strokeWidth="4" strokeLinecap="round" />
        <g>
          {!reducedMotion && <animateMotion dur="6s" repeatCount="indefinite" path={RIDE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1" />}
          <g transform={reducedMotion ? 'translate(218 482)' : 'translate(0 -10)'}>
            <circle r="24" fill="#FFF6E0" opacity="0.3" filter="url(#home-glow)" />
            <circle r="9" fill="#FFF6E0" />
          </g>
        </g>
      </svg>

      <div className="topbar between">
        <button className="dust-pill as-button" aria-label={`Rewards: ${dust} stardust`} onClick={onRewards}>
          <StarIcon size={15} />
          <span className="dust-num">{dust.toLocaleString()}</span>
          <span className="dust-cta">Rewards</span>
        </button>
        <button className="icon-btn" aria-label="Settings" onClick={onSettings}><GearIcon /></button>
      </div>

      <div className="home-head">
        <p className="kicker">A calm little game</p>
        <h1 id="home-title" className="title">Driffy</h1>
        <p className="lede">Draw a line. Watch it ride.</p>
      </div>

      <div className="home-foot">
        <div className="field">
          <span className="label" id="mode-label">Mode</span>
          <div className="segments" role="group" aria-labelledby="mode-label">
            {(['free', 'gentle', 'night'] as Mode[]).map((m) => (
              <button key={m} className="seg" aria-pressed={mode === m} onClick={() => onMode(m)}>
                {m === 'night' ? 'Night' : MODE_NAMES[m]}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" onClick={onStart}><PlayIcon /> <span>Start</span></button>
      </div>
    </section>
  );
}
