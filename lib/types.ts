export type Mode = 'free' | 'gentle' | 'night';

export type Settings = {
  volume: number; // 0..1
  muted: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  lineLife: number; // seconds a line lives before it fades away
};

export const MODE_NAMES: Record<Mode, string> = {
  free: 'Free Flow',
  gentle: 'Gentle Paths',
  night: 'Night Mode',
};
