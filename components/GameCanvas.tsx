'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FlowEngine } from '../lib/engine';
import type { FlowAudio } from '../lib/audio';
import type { Mode, Settings } from '../lib/types';
import type { BallId, EarnKind } from '../lib/rewards';

export type GameHandle = { dropBall: () => void; clearLines: () => void };

type Props = {
  audio: FlowAudio;
  mode: Mode;
  settings: Settings;
  active: boolean;
  onFirstStroke: () => void;
  onTwoFingerTap: () => void;
  onEarn: (kind: EarnKind, n?: number) => void;
  look: { colors: string[]; ball: BallId; ballColor: string };
};

export const GameCanvas = forwardRef<GameHandle, Props>(function GameCanvas(
  { audio, mode, settings, active, onFirstStroke, onTwoFingerTap, onEarn, look },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowEngine | null>(null);
  const cbRef = useRef({ onFirstStroke, onTwoFingerTap, onEarn });
  cbRef.current = { onFirstStroke, onTwoFingerTap, onEarn };

  useEffect(() => {
    const engine = new FlowEngine(canvasRef.current!, audio, mode, settings, {
      onFirstStroke: () => cbRef.current.onFirstStroke(),
      onTwoFingerTap: () => cbRef.current.onTwoFingerTap(),
      onEarn: (kind, n) => cbRef.current.onEarn(kind, n),
    });
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
    // The engine is created once per mount; later changes flow in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio]);

  useEffect(() => { engineRef.current?.setMode(mode); }, [mode]);
  useEffect(() => { engineRef.current?.setSettings(settings); }, [settings]);
  useEffect(() => { engineRef.current?.setLook(look.colors, look.ball, look.ballColor); }, [look.colors, look.ball, look.ballColor]);
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (active) { e.start(); audio.resume(); } else { e.stop(); audio.suspend(); }
  }, [active, audio]);

  useImperativeHandle(ref, () => ({
    dropBall: () => engineRef.current?.dropBall(),
    clearLines: () => engineRef.current?.clearLines(),
  }), []);

  return <canvas ref={canvasRef} className="game" aria-label="Drawing canvas. Drag to draw lines for the ball to ride." />;
});
