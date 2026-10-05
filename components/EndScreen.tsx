import { useEffect, useRef, useState } from 'react';
import { rodeFor } from './Sheet';
import { MOMENT_BY_ID, type MomentId } from '../lib/rewards';
import { UnlockProgress } from './Rewards';
import { StarIcon } from './Icons';

type Props = {
  sessionSeconds: number;
  reducedMotion: boolean;
  sessionDust: number;
  sessionMoments: MomentId[];
  dust: number;
  onRewards: () => void;
  onBreathsDone?: () => void;
  onKeepGoing: () => void;
  onClose: () => void;
};

const BREATHS = 3;
const HALF = 4000; // 4 s in, 4 s out

export function EndScreen({
  sessionSeconds, reducedMotion, sessionDust, sessionMoments, dust, onRewards, onBreathsDone, onKeepGoing, onClose,
}: Props) {
  const [phase, setPhase] = useState(0); // even = breathe in, odd = breathe out
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { keepRef.current?.focus(); }, []);
  useEffect(() => {
    if (phase >= BREATHS * 2) return;
    const t = setTimeout(() => setPhase((p) => p + 1), HALF);
    return () => clearTimeout(t);
  }, [phase]);

  const done = phase >= BREATHS * 2;
  const doneRef = useRef(onBreathsDone);
  doneRef.current = onBreathsDone;
  useEffect(() => { if (done) doneRef.current?.(); }, [done]);
  const inhale = phase % 2 === 0 && !done;

  return (
    <section className="end" aria-labelledby="end-title">
      <div className="breath" aria-live="polite">
        <span className="ring ring-outer" aria-hidden="true" />
        <span className="ring ring-mid" aria-hidden="true" />
        <span className={`orb ${inhale && !reducedMotion ? 'in' : ''}`} aria-hidden="true" />
        <span className="breath-word">{done ? 'Nicely done' : inhale ? 'Breathe in' : 'Breathe out'}</span>
        {!done && <span className="breath-count">{Math.floor(phase / 2) + 1} of {BREATHS}</span>}
      </div>
      <div className="end-copy">
        <h1 id="end-title" className="heading">Feeling lighter?</h1>
        <p className="lede">{rodeFor(sessionSeconds)}. Three slow breaths before you go.</p>
      </div>
      <div className="card summary" aria-label="This session's rewards">
        <div className="summary-head">
          <span className="summary-dust"><StarIcon size={18} /> +{sessionDust}</span>
          <span className="summary-label">stardust this session</span>
        </div>
        {sessionMoments.length > 0 && (
          <ul className="summary-moments">
            {sessionMoments.map((id) => (
              <li key={id}><span>{MOMENT_BY_ID[id].name}</span><span className="moment-bonus">+{MOMENT_BY_ID[id].bonus}</span></li>
            ))}
          </ul>
        )}
        <UnlockProgress dust={dust} />
        <button className="textlink center" onClick={onRewards}>See all rewards</button>
      </div>
      <div className="end-actions">
        <button ref={keepRef} className="primary" onClick={onKeepGoing}>Keep going</button>
        <button className="secondary" onClick={onClose}>Close</button>
      </div>
    </section>
  );
}
