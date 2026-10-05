import type { Mode, Settings } from './types';
import type { FlowAudio } from './audio';
import { CHAIN_STEPS, EARN, chainBonus, dim, type BallId, type EarnKind } from './rewards';

type Vec = { x: number; y: number };

type Line = {
  id: number;
  pts: Vec[];
  born: number; // sim time the line was finished (its life starts here)
  drawing: boolean;
  killAt: number | null; // set when erased: fades out quickly from here
  palette: number;
  minX: number; minY: number; maxX: number; maxY: number;
};

type Ball = {
  x: number; y: number; vx: number; vy: number;
  trail: Vec[];
  lastLine: number;
  touching: boolean;
  airTime: number;
  hops: number; // lines ridden this trip
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Gate = { x: number; y: number; phase: number; alive: boolean; respawnAt: number; pop: number };
type Floater = { x: number; y: number; text: string; life: number };
type Star = { x: number; y: number; r: number; a: number; phase: number };

const R = 9;               // ball radius
const STEP = 1 / 120;      // fixed physics step: same feel on 60 Hz and 120 Hz screens
const MAX_LINES = 12;      // oldest lines fade first beyond this, to keep phones smooth
const MAX_BALLS = 3;
const MIN_SPACING = 4;     // keep a point only every 4 px
const GATE_R = 26;
const FADE_TAIL = 2;       // seconds a line takes to dim before it dissolves

const FLOAT_LIFE = 1.4;

const MODE_PHYSICS: Record<Mode, { gravity: number; spawnEvery: number }> = {
  free: { gravity: 900, spawnEvery: 2.2 },
  gentle: { gravity: 820, spawnEvery: 2.6 },
  night: { gravity: 520, spawnEvery: 3.4 },
};

export type EngineCallbacks = {
  onFirstStroke?: () => void;
  onTwoFingerTap?: () => void;
  onEarn?: (kind: EarnKind, n?: number) => void;
};

export class FlowEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: FlowAudio;
  private cb: EngineCallbacks;
  private mode: Mode;
  private settings: Settings;

  private w = 0;
  private h = 0;
  private dpr = 1;
  private bg: CanvasGradient | null = null;
  private stars: Star[] = [];

  private lines: Line[] = [];
  private balls: Ball[] = [];
  private particles: Particle[] = [];
  private gates: Gate[] = [];
  private floaters: Floater[] = [];
  private dayColors = ['#3DDCC8', '#9B7BFF', '#FF8A80'];
  private nightColors = this.dayColors.map((c) => dim(c));
  private ballStyle: BallId = 'moon';
  private ballRGB: [number, number, number] = [255, 246, 224];
  private flowReached = false;
  private nextId = 1;
  private paletteTurn = 0;

  private time = 0;
  private acc = 0;
  private lastTs = 0;
  private raf = 0;
  private running = false;
  private spawnTimer = 0.4;
  private rideStreak = 0;
  private sinceTouch = 99;
  private flow = 0;

  private activePointers = new Map<number, Vec>();
  private drawPointer: number | null = null;
  private drawLine: Line | null = null;
  private lastMove = { x: 0, y: 0, t: 0 };
  private hiss = 0;
  private resizeObs: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, audio: FlowAudio, mode: Mode, settings: Settings, cb: EngineCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    this.ctx = ctx;
    this.audio = audio;
    this.mode = mode;
    this.settings = settings;
    this.cb = cb;

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('contextmenu', this.onContext);
  }

  // ---------- public API ----------

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.audio.setRolling(0, false);
    this.audio.setHiss(0);
    this.endStroke();
    this.activePointers.clear();
    this.render(); // leave a still frame behind the overlay
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.makeBackground();
    this.gates = [];
    if (mode === 'gentle') this.ensureGates();
  }

  setSettings(settings: Settings) {
    this.settings = settings;
    if (settings.reducedMotion) this.balls.forEach((b) => (b.trail.length = 0));
  }

  /** Unlocked looks: line colors and ball glow. */
  setLook(colors: string[], ball: BallId, ballColor: string) {
    this.dayColors = colors;
    this.nightColors = colors.map((c) => dim(c));
    this.ballStyle = ball;
    const n = parseInt(ballColor.slice(1), 16);
    this.ballRGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    if (!this.running) this.render();
  }

  dropBall() {
    if (this.balls.length < MAX_BALLS + 2) this.spawnBall();
  }

  clearLines() {
    this.lines.forEach((l) => { if (!l.drawing) l.killAt = this.time; });
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('contextmenu', this.onContext);
    this.audio.setRolling(0, false);
    this.audio.setHiss(0);
  }

  // ---------- setup ----------

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.makeBackground();
    const count = Math.round((this.w * this.h) / 9000);
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: 0.6 + Math.random() * 0.9,
      a: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    }));
    this.gates.forEach((g) => {
      g.x = Math.min(g.x, this.w - 40);
      g.y = Math.min(g.y, this.h - 40);
    });
    if (this.mode === 'gentle') this.ensureGates();
    if (!this.running) this.render();
  }

  private makeBackground() {
    const g = this.ctx.createLinearGradient(0, 0, 0, this.h || 1);
    if (this.mode === 'night') {
      g.addColorStop(0, '#070A1A');
      g.addColorStop(1, '#121433');
    } else {
      g.addColorStop(0, '#0B1026');
      g.addColorStop(1, '#1B1F4B');
    }
    this.bg = g;
  }

  private get source(): Vec {
    return { x: Math.max(48, this.w * 0.14), y: Math.max(120, this.h * 0.15) };
  }

  private get palette() {
    return this.mode === 'night' ? this.nightColors : this.dayColors;
  }

  // ---------- input ----------

  private toLocal(e: PointerEvent): Vec {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onDown = (e: PointerEvent) => {
    this.audio.unlock();
    const p = this.toLocal(e);
    this.activePointers.set(e.pointerId, p);

    if (this.activePointers.size >= 2) {
      // Two-finger tap pauses; drop whatever stroke had just begun.
      if (this.drawLine && this.drawLine.pts.length < 6) {
        this.lines = this.lines.filter((l) => l !== this.drawLine);
      }
      this.endStroke();
      this.cb.onTwoFingerTap?.();
      return;
    }

    if (e.button === 2) {
      this.eraseNear(p);
      return;
    }

    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const line: Line = {
      id: this.nextId++,
      pts: [p],
      born: this.time,
      drawing: true,
      killAt: null,
      palette: this.paletteTurn++ % 3,
      minX: p.x, minY: p.y, maxX: p.x, maxY: p.y,
    };
    this.lines.push(line);
    this.drawLine = line;
    this.drawPointer = e.pointerId;
    this.lastMove = { x: p.x, y: p.y, t: performance.now() };

    // Over the cap: the oldest finished line starts fading now.
    const finished = this.lines.filter((l) => !l.drawing && l.killAt === null);
    if (finished.length >= MAX_LINES) finished[0].killAt = this.time;
  };

  private onMove = (e: PointerEvent) => {
    if (this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, this.toLocal(e));
    if (e.pointerId !== this.drawPointer || !this.drawLine) return;
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    const rect = this.canvas.getBoundingClientRect();
    const line = this.drawLine;
    for (const ev of events.length ? events : [e]) {
      const raw = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const last = line.pts[line.pts.length - 1];
      // Light low-pass smoothing removes finger jitter without feeling laggy.
      const sx = last.x + (raw.x - last.x) * 0.6;
      const sy = last.y + (raw.y - last.y) * 0.6;
      if (Math.hypot(sx - last.x, sy - last.y) >= MIN_SPACING) {
        line.pts.push({ x: sx, y: sy });
        line.minX = Math.min(line.minX, sx); line.maxX = Math.max(line.maxX, sx);
        line.minY = Math.min(line.minY, sy); line.maxY = Math.max(line.maxY, sy);
      }
    }
    const now = performance.now();
    const p = this.toLocal(e);
    const dt = Math.max(now - this.lastMove.t, 1) / 1000;
    const speed = Math.hypot(p.x - this.lastMove.x, p.y - this.lastMove.y) / dt;
    this.hiss = Math.min(speed / 1500, 1);
    this.lastMove = { x: p.x, y: p.y, t: now };
  };

  private onUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    if (e.pointerId === this.drawPointer) this.endStroke();
  };

  private onContext = (e: Event) => e.preventDefault();

  private endStroke() {
    const line = this.drawLine;
    this.drawLine = null;
    this.drawPointer = null;
    this.hiss = 0;
    this.audio.setHiss(0);
    if (!line) return;
    line.drawing = false;
    line.born = this.time;
    if (line.pts.length < 2) {
      this.lines = this.lines.filter((l) => l !== line);
      return;
    }
    const length = line.pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - line.pts[i - 1].x, p.y - line.pts[i - 1].y) : 0), 0);
    if (length > 40) this.cb.onFirstStroke?.();
  }

  private eraseNear(p: Vec) {
    let best: Line | null = null;
    let bestD = 40;
    for (const l of this.lines) {
      if (l.drawing || l.killAt !== null) continue;
      for (const q of l.pts) {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) { bestD = d; best = l; }
      }
    }
    if (best) best.killAt = this.time;
  }

  // ---------- simulation ----------

  private lineAlpha(l: Line) {
    if (l.drawing) return 1;
    let a = 1;
    const age = this.time - l.born;
    const life = this.settings.lineLife;
    if (age > life - FADE_TAIL) a = Math.max(0, (life - age) / FADE_TAIL);
    if (l.killAt !== null) a = Math.min(a, Math.max(0, 1 - (this.time - l.killAt) / 0.6));
    return a;
  }

  private spawnBall() {
    const s = this.source;
    this.balls.push({
      x: s.x + 6, y: s.y + 14,
      vx: 30 + Math.random() * 50, vy: 0,
      trail: [], lastLine: -1, touching: false, airTime: 0, hops: 0,
    });
  }

  private ensureGates() {
    if (this.w === 0) return;
    while (this.gates.length < 3) this.gates.push(this.newGate());
  }

  private newGate(): Gate {
    const g: Gate = { x: 0, y: 0, phase: Math.random() * Math.PI * 2, alive: true, respawnAt: 0, pop: 0 };
    this.placeGate(g);
    return g;
  }

  private placeGate(g: Gate) {
    for (let tries = 0; tries < 30; tries++) {
      g.x = this.w * (0.22 + Math.random() * 0.62);
      g.y = this.h * (0.36 + Math.random() * 0.48);
      const clash = this.gates.some((o) => o !== g && o.alive && Math.hypot(o.x - g.x, o.y - g.y) < 120);
      if (!clash) break;
    }
  }

  private burst(x: number, y: number, n: number, colors: string[], speed = 90) {
    const count = this.settings.reducedMotion ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const max = 0.6 + Math.random() * 0.6;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
        life: max, max, color: colors[i % colors.length], size: 1 + Math.random() * 1.6,
      });
    }
  }

  private float(x: number, y: number, text: string) {
    const pad = 70;
    this.floaters.push({ x: Math.min(Math.max(x, pad), this.w - pad), y: Math.max(y, 90), text, life: FLOAT_LIFE });
  }

  private ballTint(): [number, number, number] {
    if (this.ballStyle !== 'prism') return this.ballRGB;
    // Soft pastel hue cycle: hsl(h, 90%, 82%)
    const h = (this.time * 40) % 360;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (0.82 - 0.162 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  }

  private step(dt: number) {
    this.time += dt;
    const phys = MODE_PHYSICS[this.mode];
    const gravity = phys.gravity * (this.settings.reducedMotion ? 0.8 : 1);

    // Source drops a new ball while fewer than three are in play.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.balls.length < MAX_BALLS) this.spawnBall();
      this.spawnTimer = phys.spawnEvery;
    }

    // Lines that have fully faded dissolve into a few particles.
    for (const l of this.lines) {
      if (!l.drawing && this.lineAlpha(l) <= 0) {
        const pal = this.palette;
        for (let i = 0; i < l.pts.length; i += 10) this.burst(l.pts[i].x, l.pts[i].y, 1, [pal[l.palette]], 25);
      }
    }
    this.lines = this.lines.filter((l) => l.drawing || this.lineAlpha(l) > 0);

    let anyTouch = false;
    for (const b of this.balls) {
      b.vy += gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.touching = false;

      for (const l of this.lines) {
        if (this.lineAlpha(l) < 0.15 || l.pts.length < 2) continue;
        if (b.x < l.minX - R || b.x > l.maxX + R || b.y < l.minY - R || b.y > l.maxY + R) continue;
        for (let i = 1; i < l.pts.length; i++) {
          const a = l.pts[i - 1];
          const c = l.pts[i];
          const ex = c.x - a.x;
          const ey = c.y - a.y;
          const len2 = ex * ex + ey * ey || 1;
          let t = ((b.x - a.x) * ex + (b.y - a.y) * ey) / len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = a.x + ex * t;
          const qy = a.y + ey * t;
          const dx = b.x - qx;
          const dy = b.y - qy;
          const d = Math.hypot(dx, dy);
          if (d >= R || d < 1e-4) continue;
          const nx = dx / d;
          const ny = dy / d;
          b.x += nx * (R - d);
          b.y += ny * (R - d);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            const bounce = vn < -380 ? 0.3 : 0; // steep hits bounce gently instead of stopping dead
            b.vx -= (1 + bounce) * vn * nx;
            b.vy -= (1 + bounce) * vn * ny;
          }
          if (!b.touching && l.id !== b.lastLine) {
            this.audio.pluck(qy / this.h);
            this.burst(qx, qy, 8, [this.palette[l.palette], '#FFF6E0']);
            if (this.settings.haptics && 'vibrate' in navigator) {
              try { navigator.vibrate(8); } catch { /* ignore */ }
            }
            b.lastLine = l.id;
            b.hops++;
            this.cb.onEarn?.('land');
            if (CHAIN_STEPS.includes(b.hops)) {
              this.cb.onEarn?.('chain', b.hops);
              this.float(b.x, b.y - 24, `${b.hops} in a row  ✦ +${chainBonus(b.hops)}`);
            }
          } else if (!b.touching && b.airTime > 0.3) {
            this.burst(qx, qy, 4, [this.palette[l.palette]]);
          }
          b.touching = true;
        }
      }

      if (b.touching) {
        b.airTime = 0;
        const damp = 1 - 0.1 * dt;
        b.vx *= damp;
        b.vy *= damp;
        const sp = Math.hypot(b.vx, b.vy);
        if (Math.random() < (sp / 2800) * (this.settings.reducedMotion ? 0.3 : 1)) {
          this.burst(b.x, b.y + R * 0.6, 1, this.palette, 40);
        }
        anyTouch = true;
      } else {
        b.airTime += dt;
      }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 1500) { b.vx *= 1500 / sp; b.vy *= 1500 / sp; }
    }

    // A ball that leaves the screen just goes away; the source sends another.
    const before = this.balls.length;
    this.balls = this.balls.filter((b) => b.x > -60 && b.x < this.w + 60 && b.y < this.h + 60);
    if (this.balls.length < before) this.audio.fall();

    // Flow builds over about a minute of unbroken riding and settles back slowly.
    if (anyTouch) { this.rideStreak += dt; this.sinceTouch = 0; }
    else {
      this.sinceTouch += dt;
      if (this.sinceTouch > 1.5) this.rideStreak = Math.max(0, this.rideStreak - dt * 3);
    }
    const target = Math.min(Math.max((this.rideStreak - 10) / 50, 0), 1);
    this.flow += (target - this.flow) * Math.min(dt * 0.5, 1);
    if (!this.flowReached && this.flow > 0.9) {
      this.flowReached = true;
      this.cb.onEarn?.('flow');
      this.float(this.w / 2, this.h * 0.3, `In the flow  ✦ +${EARN.flow}`);
    } else if (this.flowReached && this.flow < 0.3) this.flowReached = false;

    // Gentle Paths: soft gates that burst when a ball passes through, then re-form.
    if (this.mode === 'gentle') {
      this.ensureGates();
      for (const g of this.gates) {
        g.pop = Math.max(0, g.pop - dt * 2);
        if (!g.alive) {
          if (this.time >= g.respawnAt) { this.placeGate(g); g.alive = true; }
          continue;
        }
        const gy = g.y + Math.sin(this.time * 0.6 + g.phase) * 6;
        for (const b of this.balls) {
          if (Math.hypot(b.x - g.x, b.y - gy) < GATE_R) {
            g.alive = false;
            g.respawnAt = this.time + 1.6;
            g.pop = 1;
            this.burst(g.x, gy, 26, [...this.palette, '#FFF6E0'], 140);
            this.audio.gate();
            this.cb.onEarn?.('gate');
            this.float(g.x, gy - GATE_R - 8, `✦ +${EARN.gate}`);
            break;
          }
        }
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.5 * dt;
      p.vy = p.vy * (1 - 1.5 * dt) - 20 * dt; // sparks drift upward
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      if (!this.settings.reducedMotion) f.y -= 22 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  private frame = (ts: number) => {
    if (!this.running) return;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
    this.lastTs = ts;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }

    const trailLen = this.settings.reducedMotion ? 0 : 18;
    let maxSpeed = 0;
    let touching = false;
    for (const b of this.balls) {
      if (trailLen) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > trailLen) b.trail.shift();
      }
      if (b.touching) { touching = true; maxSpeed = Math.max(maxSpeed, Math.hypot(b.vx, b.vy)); }
    }
    this.audio.setRolling(maxSpeed, touching);
    this.audio.setFlow(this.flow);
    this.audio.setHiss(this.drawLine ? this.hiss : 0);
    this.hiss *= 0.85;

    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  // ---------- drawing ----------

  private tracePath(pts: Vec[]) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  private render() {
    const ctx = this.ctx;
    const { w, h } = this;
    if (!w || !h) return;
    const calm = this.settings.reducedMotion;
    const pal = this.palette;
    const night = this.mode === 'night';

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.bg ?? '#0B1026';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFFFFF';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a * (night ? 0.7 : 1) * (calm ? 1 : 0.75 + 0.25 * Math.sin(this.time * 0.5 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Additive blending: overlapping glows brighten instead of turning muddy.
    ctx.globalCompositeOperation = 'lighter';

    // Source orb
    const src = this.source;
    const pulse = calm ? 0 : Math.sin(this.time * 2) * 1.5;
    const halo = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 40);
    halo.addColorStop(0, 'rgba(255,246,224,0.45)');
    halo.addColorStop(1, 'rgba(255,246,224,0)');
    ctx.globalAlpha = night ? 0.7 : 1;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(src.x, src.y, 40, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,224,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(src.x, src.y, 18 + pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFF6E0';
    ctx.beginPath(); ctx.arc(src.x, src.y, 10 + pulse * 0.4, 0, Math.PI * 2); ctx.fill();

    // Gates
    if (this.mode === 'gentle') {
      for (const g of this.gates) {
        const gy = g.y + (calm ? 0 : Math.sin(this.time * 0.6 + g.phase) * 6);
        if (g.alive) {
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = '#C6B5FF';
          ctx.beginPath(); ctx.arc(g.x, gy, GATE_R, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = '#E3DAFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(g.x, gy, GATE_R, 0, Math.PI * 2); ctx.stroke();
        }
        if (g.pop > 0) {
          ctx.globalAlpha = g.pop * 0.6;
          ctx.strokeStyle = '#FFF6E0';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(g.x, gy, GATE_R + (1 - g.pop) * 40, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }

    // Lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const glowBoost = 1 + this.flow * 0.8;
    for (const l of this.lines) {
      if (l.pts.length < 2) continue;
      const a = this.lineAlpha(l);
      const first = l.pts[0];
      const last = l.pts[l.pts.length - 1];
      const grad = ctx.createLinearGradient(first.x, first.y, last.x + 0.01, last.y + 0.01);
      grad.addColorStop(0, pal[l.palette % 3]);
      grad.addColorStop(0.5, pal[(l.palette + 1) % 3]);
      grad.addColorStop(1, pal[(l.palette + 2) % 3]);
      ctx.strokeStyle = grad;
      this.tracePath(l.pts);
      ctx.globalAlpha = 0.06 * a * glowBoost;
      ctx.lineWidth = 24;
      ctx.stroke();
      ctx.globalAlpha = 0.14 * a * glowBoost;
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.globalAlpha = 0.95 * a;
      ctx.lineWidth = 4 * (0.6 + 0.4 * a); // dims and thins as it fades
      ctx.stroke();
    }

    // Balls
    const [br, bg, bb] = this.ballTint();
    const ballCore = `rgb(${br},${bg},${bb})`;
    for (const b of this.balls) {
      const n = b.trail.length;
      ctx.fillStyle = ballCore;
      for (let i = 0; i < n; i++) {
        const k = (i + 1) / n;
        ctx.globalAlpha = 0.4 * k * k;
        ctx.beginPath();
        ctx.arc(b.trail[i].x, b.trail[i].y, 2 + 5 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      const bh = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 28);
      bh.addColorStop(0, `rgba(${br},${bg},${bb},0.5)`);
      bh.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = bh;
      ctx.beginPath(); ctx.arc(b.x, b.y, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ballCore;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
    }

    // Sparks
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft ring under the drawing finger
    if (this.drawLine && this.drawLine.pts.length) {
      const p = this.drawLine.pts[this.drawLine.pts.length - 1];
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Floating stardust notes
    if (this.floaters.length) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '500 15px Outfit, "Avenir Next", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of this.floaters) {
        const k = f.life / FLOAT_LIFE;
        ctx.globalAlpha = Math.min(1, k * 2.5) * (night ? 0.75 : 0.95);
        ctx.fillStyle = '#FFF6E0';
        ctx.fillText(f.text, f.x, f.y);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
