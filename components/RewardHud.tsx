import { StarIcon } from './Icons';

export type Toast = { id: number; title: string; sub: string };

/** Live stardust counter shown while playing. */
export function DustPill({ dust, session }: { dust: number; session: number }) {
  return (
    <div className="dust-pill" aria-live="off" aria-label={`${dust} stardust, ${session} this session`}>
      <StarIcon size={15} />
      {/* Re-keying on the value restarts the little bump animation. */}
      <span key={dust} className="dust-num">{dust.toLocaleString()}</span>
      {session > 0 && <span className="dust-session">+{session}</span>}
    </div>
  );
}

/** Moments and unlocks announce themselves here, then fade on their own. */
export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-icon"><StarIcon size={16} /></span>
          <span className="toast-text">
            <span className="toast-title">{t.title}</span>
            <span className="toast-sub">{t.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
