'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFlowStore } from '../lib/store';
import { FlowAudio } from '../lib/audio';
import type { Mode, Settings } from '../lib/types';
import {
  BALLS, DAILY_GOAL, EARN, MOMENT_BY_ID, PALETTES, calmDays, chainBonus, dateKey, unlockedBetween,
  type EarnKind, type MomentId,
} from '../lib/rewards';
import { Home } from './Home';
import { MoodCheck } from './MoodCheck';
import { GameCanvas, type GameHandle } from './GameCanvas';
import { Sheet } from './Sheet';
import { EndScreen } from './EndScreen';
import { Rewards } from './Rewards';
import { DustPill, Toasts, type Toast } from './RewardHud';
import { PauseIcon, SoundIcon } from './Icons';

type Screen = 'home' | 'mood' | 'play' | 'end' | 'rewards';
const OFFRAMP = 10 * 60; // gentle off-ramp after 10 minutes
const RING_RUNNER_GATES = 15;
const NIGHT_OWL_SECONDS = 5 * 60;
const HOUR = 60 * 60;
const TOAST_MS = 3600;

export default function App() {
  const {
    mode, settings, hasDrawn, palette, ball, dust,
    setMode, updateSettings, addSeconds, markDrawn, addDust, earnMoment,
  } = useFlowStore();
  const [screen, setScreen] = useState<Screen>('home');
  const [sheet, setSheet] = useState<null | 'pause' | 'settings'>(null);
  const [session, setSession] = useState(0);
  const [offrampAt, setOfframpAt] = useState(OFFRAMP);
  const [hidden, setHidden] = useState(false);
  const audioRef = useRef<FlowAudio | null>(null);
  if (!audioRef.current) audioRef.current = new FlowAudio();
  const audio = audioRef.current;
  const gameRef = useRef<GameHandle>(null);
  // Per-session counters for rewards; kept in refs so the timer and engine callbacks stay stable.
  const sessionRef = useRef(0);
  const gatesRef = useRef(0);
  const nightRef = useRef(0);
  // What this session has earned, for the live counter and the end-of-session summary.
  const [dustAtStart, setDustAtStart] = useState(0);
  const [sessionMoments, setSessionMoments] = useState<MomentId[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const sessionDust = Math.max(0, dust - dustAtStart);

  const playing = screen === 'play' && !sheet && !hidden;

  const toast = useCallback((title: string, sub: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, title, sub }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS);
  }, []);

  // Adds stardust and announces any look it unlocks along the way.
  const gain = useCallback((n: number) => {
    const before = useFlowStore.getState().dust;
    addDust(n);
    for (const u of unlockedBetween(before, before + n)) toast(`${u.name} unlocked`, 'Try it from Rewards on the home screen');
  }, [addDust, toast]);

  // A moment pays its bonus only the first time it is earned.
  const award = useCallback((id: MomentId) => {
    if (!earnMoment(id)) return;
    const m = MOMENT_BY_ID[id];
    setSessionMoments((list) => [...list, id]);
    toast(m.name, `${m.desc}  ✦ +${m.bonus}`);
    gain(m.bonus);
  }, [earnMoment, gain, toast]);

  const onEarn = useCallback((kind: EarnKind, n = 0) => {
    switch (kind) {
      case 'land':
        award('first-ride'); // a one-time moment; landings themselves pay nothing
        break;
      case 'chain':
        gain(chainBonus(n));
        if (n >= 4) award('stepping-stones');
        if (n >= 10) award('long-journey');
        break;
      case 'gate':
        gain(EARN.gate);
        if (++gatesRef.current >= RING_RUNNER_GATES) award('ring-runner');
        break;
      case 'flow':
        gain(EARN.flow);
        award('in-the-flow');
        break;
    }
  }, [gain, award]);

  // Chosen palette and ball glow. The engine dims colors itself in Night Mode.
  const look = useMemo(() => {
    const p = PALETTES.find((x) => x.id === palette) ?? PALETTES[0];
    const b = BALLS.find((x) => x.id === ball) ?? BALLS[0];
    return { colors: p.colors, ball: b.id, ballColor: b.color };
  }, [palette, ball]);

  // Keep the sound engine in step with settings and mode.
  useEffect(() => { audio.setVolume(settings.volume); audio.setMuted(settings.muted); }, [audio, settings.volume, settings.muted]);
  useEffect(() => { audio.setNight(mode === 'night'); }, [audio, mode]);
  useEffect(() => () => audio.destroy(), [audio]);

  // Pause automatically when the tab or app goes to the background.
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => { if (hidden && screen === 'play' && !sheet) setSheet('pause'); }, [hidden, screen, sheet]);

  // Session timer: only counts while actually playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const today = dateKey();
      const todayBefore = useFlowStore.getState().daily[today] ?? 0;
      setSession((s) => s + 1);
      addSeconds(1);

      sessionRef.current += 1;
      if (sessionRef.current % 60 === 0) gain(EARN.minute);

      const state = useFlowStore.getState();
      if (state.mode === 'night' && ++nightRef.current >= NIGHT_OWL_SECONDS) award('night-owl');
      if (todayBefore < DAILY_GOAL && (state.daily[today] ?? 0) >= DAILY_GOAL) {
        gain(EARN.daily);
        award('daily-calm');
        const days = calmDays(state.daily);
        if (days >= 3) award('three-days');
        if (days >= 7) award('seven-days');
      }
      if (state.totalSeconds >= HOUR) award('hour');
    }, 1000);
    return () => clearInterval(id);
  }, [playing, addSeconds, gain, award]);
  useEffect(() => { if (screen === 'play' && session >= offrampAt) setScreen('end'); }, [session, offrampAt, screen]);

  const startPlaying = useCallback((m: Mode) => {
    audio.unlock();
    setMode(m);
    setSession(0);
    sessionRef.current = 0;
    gatesRef.current = 0;
    nightRef.current = 0;
    setDustAtStart(useFlowStore.getState().dust);
    setSessionMoments([]);
    setOfframpAt(OFFRAMP);
    setSheet(null);
    setScreen('play');
  }, [audio, setMode]);

  // Keyboard: Space drops a ball, C clears, M mutes, Esc or P pauses.
  useEffect(() => {
    if (screen !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') { e.preventDefault(); setSheet((s) => (s ? null : 'pause')); return; }
      if (sheet) return;
      if (k === ' ') { e.preventDefault(); audio.unlock(); gameRef.current?.dropBall(); }
      else if (k === 'c') gameRef.current?.clearLines();
      else if (k === 'm') updateSettings({ muted: !settings.muted });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, sheet, audio, settings.muted, updateSettings]);

  const changeSettings = (patch: Partial<Settings>) => updateSettings(patch);

  return (
    <main className={`app ${mode === 'night' && (screen === 'play' || screen === 'end') ? 'night' : ''}`}>
      {screen === 'home' && (
        <Home
          mode={mode}
          reducedMotion={settings.reducedMotion}
          onMode={setMode}
          onStart={() => { audio.unlock(); setScreen('mood'); }}
          onSettings={() => setSheet('settings')}
          dust={dust}
          onRewards={() => setScreen('rewards')}
        />
      )}

      {screen === 'rewards' && <Rewards onBack={() => setScreen('home')} />}

      {screen === 'mood' && (
        <MoodCheck onPick={startPlaying} onSkip={() => startPlaying(mode)} onBack={() => setScreen('home')} />
      )}

      {(screen === 'play' || screen === 'end') && (
        <div className="play">
          <GameCanvas
            ref={gameRef}
            audio={audio}
            mode={mode}
            settings={settings}
            active={playing}
            onFirstStroke={() => { if (!useFlowStore.getState().hasDrawn) markDrawn(); }}
            onTwoFingerTap={() => setSheet('pause')}
            onEarn={onEarn}
            look={look}
          />
          {screen === 'play' && (
            <>
              <div className="hud-left"><DustPill dust={dust} session={sessionDust} /></div>
              <div className="hud">
                <button
                  className="icon-btn"
                  aria-label={settings.muted ? 'Unmute sound' : 'Mute sound'}
                  aria-pressed={settings.muted}
                  onClick={() => updateSettings({ muted: !settings.muted })}
                >
                  <SoundIcon muted={settings.muted} />
                </button>
                <button className="icon-btn" aria-label="Pause" onClick={() => setSheet('pause')}><PauseIcon /></button>
              </div>
              <div className={`hint ${hasDrawn ? 'gone' : ''}`} aria-hidden={hasDrawn}>Draw a line. Watch it ride.</div>
            </>
          )}
          {screen === 'end' && (
            <EndScreen
              sessionSeconds={session}
              sessionDust={sessionDust}
              sessionMoments={sessionMoments}
              dust={dust}
              onRewards={() => { setScreen('rewards'); setSession(0); }}
              reducedMotion={settings.reducedMotion}
              onBreathsDone={() => { gain(EARN.breath); award('deep-breath'); }}
              onKeepGoing={() => { setOfframpAt(session + OFFRAMP); setScreen('play'); }}
              onClose={() => { setScreen('home'); setSession(0); }}
            />
          )}
        </div>
      )}

      {sheet && (
        <Sheet
          variant={sheet}
          mode={mode}
          settings={settings}
          sessionSeconds={session}
          sessionDust={sessionDust}
          onMode={setMode}
          onSettings={changeSettings}
          onClose={() => setSheet(null)}
          onEnd={() => { setSheet(null); setScreen('end'); }}
        />
      )}

      {screen !== 'home' && screen !== 'rewards' && <Toasts toasts={toasts} />}
    </main>
  );
}
