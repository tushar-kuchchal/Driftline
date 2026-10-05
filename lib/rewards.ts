// Rewards are gentle on purpose: stardust only ever grows, unlocks are reached
// (never bought), and the daily goal counts calm days without a streak to lose.

export type PaletteId = 'aurora' | 'sunset' | 'ocean' | 'meadow' | 'sakura' | 'ember' | 'moonlight';
export type BallId = 'moon' | 'firefly' | 'amber' | 'frost' | 'rose' | 'prism';
export type MomentId =
  | 'first-ride' | 'stepping-stones' | 'long-journey' | 'ring-runner' | 'in-the-flow'
  | 'night-owl' | 'deep-breath' | 'daily-calm' | 'three-days' | 'seven-days' | 'hour';

export type Palette = { id: PaletteId; name: string; colors: [string, string, string]; cost: number };
export type BallStyle = { id: BallId; name: string; color: string; cost: number };
export type Moment = { id: MomentId; name: string; desc: string; bonus: number };

export const PALETTES: Palette[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#3DDCC8', '#9B7BFF', '#FF8A80'], cost: 0 },
  { id: 'sunset', name: 'Sunset', colors: ['#FFB36B', '#FF6F91', '#C77DFF'], cost: 80 },
  { id: 'ocean', name: 'Ocean', colors: ['#4FC3F7', '#3DDCC8', '#7C9CFF'], cost: 250 },
  { id: 'meadow', name: 'Meadow', colors: ['#9BE15D', '#3DDCC8', '#F9F871'], cost: 500 },
  { id: 'sakura', name: 'Sakura', colors: ['#FFB7D5', '#FFE3EC', '#B9A3FF'], cost: 900 },
  { id: 'ember', name: 'Ember', colors: ['#FF8A50', '#FFD166', '#FF5E78'], cost: 1500 },
  { id: 'moonlight', name: 'Moonlight', colors: ['#E8E6FF', '#B9C6FF', '#9BE7FF'], cost: 2400 },
];

export const BALLS: BallStyle[] = [
  { id: 'moon', name: 'Moon', color: '#FFF6E0', cost: 0 },
  { id: 'firefly', name: 'Firefly', color: '#E6FF8A', cost: 150 },
  { id: 'amber', name: 'Amber', color: '#FFC27A', cost: 400 },
  { id: 'frost', name: 'Frost', color: '#A8E8FF', cost: 700 },
  { id: 'rose', name: 'Rose', color: '#FFB7D5', cost: 1200 },
  { id: 'prism', name: 'Prism', color: '#FFFFFF', cost: 1900 }, // cycles through hues
];

export const MOMENTS: Moment[] = [
  { id: 'first-ride', name: 'First ride', desc: 'A ball rode one of your lines.', bonus: 10 },
  { id: 'stepping-stones', name: 'Stepping stones', desc: 'One ball rode 4 lines in a single trip.', bonus: 20 },
  { id: 'long-journey', name: 'Long journey', desc: 'One ball rode 10 lines in a single trip.', bonus: 50 },
  { id: 'ring-runner', name: 'Ring runner', desc: 'Guide balls through 15 gates in one session.', bonus: 30 },
  { id: 'in-the-flow', name: 'In the flow', desc: 'Keep balls riding until the music blooms.', bonus: 30 },
  { id: 'night-owl', name: 'Night owl', desc: 'Spend 5 quiet minutes in Night Mode.', bonus: 30 },
  { id: 'deep-breath', name: 'Deep breath', desc: 'Finish the three breaths after a session.', bonus: 20 },
  { id: 'daily-calm', name: 'Daily calm', desc: 'Reach 5 calm minutes in one day.', bonus: 20 },
  { id: 'three-days', name: 'Gentle habit', desc: 'Reach your daily calm on 3 different days.', bonus: 60 },
  { id: 'seven-days', name: 'Steady light', desc: 'Reach your daily calm on 7 different days.', bonus: 120 },
  { id: 'hour', name: 'An hour of calm', desc: 'Play for 60 minutes in total.', bonus: 100 },
];

export const MOMENT_BY_ID = Object.fromEntries(MOMENTS.map((m) => [m.id, m])) as Record<MomentId, Moment>;

/** Stardust for each kind of moment in play. */
// Landing on a line earns nothing by itself; stardust comes from gates, long rides and time spent.
export const EARN = { gate: 10, minute: 10, flow: 15, breath: 20, daily: 30 };
/** One ball riding this many lines in a row earns a bonus. */
export const CHAIN_STEPS = [4, 7, 10, 15];
export const chainBonus = (hops: number) => hops * 2;

export const DAILY_GOAL = 5 * 60; // seconds

export type EarnKind = 'land' | 'gate' | 'chain' | 'flow';

// ---------- days ----------

export function dateKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Monday to Sunday of the current week. */
export function weekKeys(now = new Date()) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dateKey(d);
  });
}

export const calmDays = (daily: Record<string, number>) => Object.values(daily).filter((s) => s >= DAILY_GOAL).length;

// ---------- unlocks ----------

type Unlock = { name: string; kind: 'palette' | 'ball'; cost: number };

const UNLOCKS: Unlock[] = [
  ...PALETTES.map((p) => ({ name: `${p.name} colors`, kind: 'palette' as const, cost: p.cost })),
  ...BALLS.map((b) => ({ name: `${b.name} glow`, kind: 'ball' as const, cost: b.cost })),
]
  .filter((u) => u.cost > 0)
  .sort((a, b) => a.cost - b.cost);

export function nextUnlock(dust: number): (Unlock & { from: number }) | null {
  const i = UNLOCKS.findIndex((u) => u.cost > dust);
  if (i < 0) return null;
  return { ...UNLOCKS[i], from: i ? UNLOCKS[i - 1].cost : 0 };
}

export const unlockedBetween = (prev: number, now: number) => UNLOCKS.filter((u) => u.cost > prev && u.cost <= now);

/** Night Mode uses dimmer versions of the same colors. */
export function dim(hex: string, k = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
