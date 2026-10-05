# Flow Lines

A calm little web game: draw glowing lines and watch a ball of light ride them. No score, no lives, no game over. Built to quiet a busy mind for a few minutes, the way a bike ride does.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production build (service worker + offline play on)
npm run build:standalone     # one self-contained file: dist/flow-lines.html
```

Deploy to Vercel as-is (`vercel` or import the repo). Once served over HTTPS, phones can "Add to Home Screen" and it opens full-screen, offline-ready.

## How to play

| Input | Action |
| --- | --- |
| Drag (mouse or finger) | Draw a line |
| Right-click | Erase the nearest line |
| Two-finger tap | Pause |
| Space | Drop an extra ball |
| C | Clear all lines |
| M | Mute |
| Esc or P | Pause / resume |

Modes: **Free Flow** (endless canvas), **Gentle Paths** (soft gates to steer balls through), **Night Mode** (slower, dimmer, quieter). After 10 minutes a breathing screen offers a gentle stop.

## Project map

```
app/            Next.js App Router: layout, page, PWA manifest, global styles
components/     React screens: Home, MoodCheck, GameCanvas, Sheet (pause/settings), EndScreen
lib/engine.ts   Game loop, drawing, ball physics, gates, rendering (Canvas 2D)
lib/audio.ts    All sound, generated live with the Web Audio API (D major pentatonic)
lib/store.ts    Zustand store: mode, settings, total minutes (saved to localStorage)
public/sw.js    Offline service worker (production only)
standalone/     Entry for the single-file build
```

## Notes on the stack

The design doc proposed PixiJS, Matter.js and Tone.js. This build does the same jobs with no game libraries:

- **Rendering:** Canvas 2D with additive blending for glow. Plenty fast for ≤12 lines, 3 balls and a few hundred sparks, and it keeps the bundle small.
- **Physics:** a small custom solver (ball vs. line segments, fixed 120 Hz step). It gives direct control over the "no fail, gentle bounce" feel that a general engine fights.
- **Audio:** raw Web Audio. Every note is locked to one pentatonic scale, so nothing sounds wrong.

Swap any of these in later if a feature needs them (e.g. PixiJS filters for heavier effects).

## Tuning

Starting values live at the top of `lib/engine.ts` (`MODE_PHYSICS`, `MAX_LINES`, `GATE_R`) and in `lib/audio.ts`. Playtest and adjust.

## Not built yet (v3 in the design doc)

Unlockable palettes and ball styles by minutes played (total minutes are already tracked in the store), and saving a ride as a shareable clip. Wrap with Capacitor if you want App Store / Play Store versions.
