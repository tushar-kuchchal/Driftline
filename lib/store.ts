import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Mode, Settings } from './types';
import { dateKey, type BallId, type MomentId, type PaletteId } from './rewards';

// Storage can be blocked (private mode, sandboxed frames), so every call is guarded.
const safeStorage: StateStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const KEEP_DAYS = 60;

type FlowState = {
  mode: Mode;
  settings: Settings;
  totalSeconds: number;
  hasDrawn: boolean;
  dust: number; // stardust gathered, all time (never spent)
  daily: Record<string, number>; // local date -> seconds played
  moments: MomentId[];
  palette: PaletteId;
  ball: BallId;
  setMode: (mode: Mode) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addSeconds: (s: number) => void;
  markDrawn: () => void;
  addDust: (n: number) => void;
  /** Returns true only the first time a moment is earned. */
  earnMoment: (id: MomentId) => boolean;
  setPalette: (p: PaletteId) => void;
  setBall: (b: BallId) => void;
};

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      mode: 'free',
      settings: {
        volume: 0.6,
        muted: false,
        reducedMotion: typeof window !== 'undefined' ? prefersReducedMotion() : false,
        haptics: true,
        lineLife: 8,
      },
      totalSeconds: 0,
      hasDrawn: false,
      dust: 0,
      daily: {},
      moments: [],
      palette: 'aurora',
      ball: 'moon',
      setMode: (mode) => set({ mode }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addSeconds: (n) => set((s) => {
        const today = dateKey();
        let daily = { ...s.daily, [today]: (s.daily[today] ?? 0) + n };
        const keys = Object.keys(daily).sort();
        if (keys.length > KEEP_DAYS) daily = Object.fromEntries(keys.slice(-KEEP_DAYS).map((k) => [k, daily[k]]));
        return { totalSeconds: s.totalSeconds + n, daily };
      }),
      markDrawn: () => set({ hasDrawn: true }),
      addDust: (n) => set((s) => ({ dust: s.dust + n })),
      earnMoment: (id) => {
        if (get().moments.includes(id)) return false;
        set((s) => ({ moments: [...s.moments, id] }));
        return true;
      },
      setPalette: (palette) => set({ palette }),
      setBall: (ball) => set({ ball }),
    }),
    {
      name: 'flow-lines',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        mode: s.mode, settings: s.settings, totalSeconds: s.totalSeconds, hasDrawn: s.hasDrawn,
        dust: s.dust, daily: s.daily, moments: s.moments, palette: s.palette, ball: s.ball,
      }),
    },
  ),
);
