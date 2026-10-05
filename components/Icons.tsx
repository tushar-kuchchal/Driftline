type P = { size?: number };
const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const PlayIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
);
export const PauseIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}><path d="M8 5v14M16 5v14" /></svg>
);
export const SoundIcon = ({ size = 20, muted = false }: P & { muted?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>}
  </svg>
);
export const GearIcon = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);
export const BackIcon = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
export const RacingIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth={1.8} {...base}><path d="M3 15l4-6 4 5 4-8 6 9" /></svg>
);
export const HeavyIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth={1.8} {...base}><path d="M3 14c3-4 6 4 9 0s6 4 9 0" /></svg>
);
export const TiredIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth={1.8} {...base}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
);
export const StarIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor" /></svg>
);
export const LockIcon = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const CheckIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...base}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ChevronIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}><path d="M9 5l7 7-7 7" /></svg>
);
