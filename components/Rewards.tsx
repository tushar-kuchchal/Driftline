import { useEffect, useRef } from 'react';
import { useFlowStore } from '../lib/store';
import {
  BALLS, DAILY_GOAL, MOMENTS, PALETTES, calmDays, dateKey, nextUnlock, weekKeys,
} from '../lib/rewards';
import { BackIcon, CheckIcon, LockIcon, StarIcon } from './Icons';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function UnlockProgress({ dust }: { dust: number }) {
  const next = nextUnlock(dust);
  if (!next) return <p className="progress-label">Everything is unlocked. Enjoy the ride.</p>;
  const pct = Math.min(100, ((dust - next.from) / (next.cost - next.from)) * 100);
  return (
    <div className="progress">
      <div className="progress-label">
        <span>Next: {next.name}</span>
        <span className="progress-num">{dust} / {next.cost}</span>
      </div>
      <div className="bar" role="progressbar" aria-valuemin={next.from} aria-valuemax={next.cost} aria-valuenow={dust} aria-label={`Progress to ${next.name}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type Props = { onBack: () => void };

export function Rewards({ onBack }: Props) {
  const { dust, daily, moments, palette, ball, totalSeconds, setPalette, setBall } = useFlowStore();
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus(); }, []);

  const today = dateKey();
  const week = weekKeys();
  const minutes = Math.floor(totalSeconds / 60);

  return (
    <section className="screen rewards" aria-labelledby="rewards-title">
      <div className="topbar start">
        <button ref={backRef} className="icon-btn" aria-label="Back" onClick={onBack}><BackIcon /></button>
      </div>

      <h1 id="rewards-title" className="heading rewards-title">Your rewards</h1>

      <div className="card hero">
        <div className="hero-dust">
          <StarIcon size={26} />
          <span className="hero-num">{dust.toLocaleString()}</span>
        </div>
        <p className="lede small">stardust gathered · {minutes} calm minute{minutes === 1 ? '' : 's'} in total</p>
        <UnlockProgress dust={dust} />
      </div>

      <h2 className="section-title">This week</h2>
      <div className="card">
        <div className="week">
          {week.map((k, i) => {
            const s = daily[k] ?? 0;
            const pct = Math.min(1, s / DAILY_GOAL);
            return (
              <div key={k} className={`day ${k === today ? 'today' : ''}`}>
                <span
                  className={`day-dot ${pct >= 1 ? 'full' : ''}`}
                  style={{ ['--p' as string]: `${pct * 360}deg` }}
                  aria-label={`${k}: ${Math.floor(s / 60)} of ${DAILY_GOAL / 60} minutes`}
                >
                  {pct >= 1 && <CheckIcon size={14} />}
                </span>
                <span className="day-letter">{DAY_LETTERS[i]}</span>
              </div>
            );
          })}
        </div>
        <p className="lede small center-text">
          {calmDays(daily)} calm day{calmDays(daily) === 1 ? '' : 's'} so far · {DAILY_GOAL / 60} minutes makes a calm day
        </p>
      </div>

      <h2 className="section-title">Line colors</h2>
      <div className="grid">
        {PALETTES.map((p) => {
          const open = dust >= p.cost;
          const on = palette === p.id;
          return (
            <button
              key={p.id}
              className="tile"
              aria-pressed={on}
              disabled={!open}
              onClick={() => setPalette(p.id)}
              aria-label={open ? `${p.name} colors${on ? ', in use' : ''}` : `${p.name} colors, unlocks at ${p.cost} stardust`}
            >
              <span className="swatch" style={{ background: `linear-gradient(90deg, ${p.colors.join(', ')})` }} />
              <span className="tile-name">{p.name}</span>
              <span className="tile-meta">
                {on ? <><CheckIcon size={13} /> In use</> : open ? 'Tap to use' : <><LockIcon size={12} /> {p.cost}</>}
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Ball glow</h2>
      <div className="grid">
        {BALLS.map((b) => {
          const open = dust >= b.cost;
          const on = ball === b.id;
          return (
            <button
              key={b.id}
              className="tile"
              aria-pressed={on}
              disabled={!open}
              onClick={() => setBall(b.id)}
              aria-label={open ? `${b.name} glow${on ? ', in use' : ''}` : `${b.name} glow, unlocks at ${b.cost} stardust`}
            >
              <span className={`orb-swatch ${b.id === 'prism' ? 'prism' : ''}`} style={{ ['--c' as string]: b.color }} />
              <span className="tile-name">{b.name}</span>
              <span className="tile-meta">
                {on ? <><CheckIcon size={13} /> In use</> : open ? 'Tap to use' : <><LockIcon size={12} /> {b.cost}</>}
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Moments <span className="count">{moments.length} / {MOMENTS.length}</span></h2>
      <ul className="moments">
        {MOMENTS.map((m) => {
          const got = moments.includes(m.id);
          return (
            <li key={m.id} className={`moment ${got ? 'got' : ''}`}>
              <span className="moment-icon">{got ? <CheckIcon size={16} /> : <StarIcon size={14} />}</span>
              <span className="moment-text">
                <span className="moment-name">{m.name}</span>
                <span className="moment-desc">{m.desc}</span>
              </span>
              <span className="moment-bonus">+{m.bonus}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
