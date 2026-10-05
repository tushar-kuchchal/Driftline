// All sound is built live with the Web Audio API. Every note comes from
// D major pentatonic, so nothing the player does can sound wrong.

const BASE = [146.83, 164.81, 185.0, 220.0, 246.94]; // D3 E3 F#3 A3 B3
const note = (i: number) => BASE[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5));

export class FlowAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private tone!: BiquadFilterNode;
  private padGain!: GainNode;
  private flowGain!: GainNode;
  private rollGain!: GainNode;
  private rollOsc!: OscillatorNode;
  private rollOsc2!: OscillatorNode;
  private hissGain!: GainNode;
  private volume = 0.6;
  private muted = false;
  private night = false;

  /** Must be called from a user gesture: browsers block audio before one. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private build() {
    const c = this.ctx!;
    const t = c.currentTime;

    this.master = c.createGain();
    this.master.gain.value = this.masterLevel();
    this.tone = c.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = this.night ? 1400 : 3200;
    this.tone.connect(this.master);
    this.master.connect(c.destination);

    // Warm ambient pad with a slow swell.
    this.padGain = c.createGain();
    this.padGain.gain.setValueAtTime(0, t);
    this.padGain.gain.linearRampToValueAtTime(0.055, t + 4);
    this.padGain.connect(this.tone);
    [73.42, 110, 146.83, 185].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = c.createGain();
      g.gain.value = i === 0 ? 0.9 : 0.5;
      o.connect(g).connect(this.padGain);
      o.start();
    });
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 0.015;
    lfo.connect(lfoDepth).connect(this.padGain.gain);
    lfo.start();

    // Extra layer that fades in during long unbroken rides.
    this.flowGain = c.createGain();
    this.flowGain.gain.value = 0;
    this.flowGain.connect(this.tone);
    [293.66, 369.99, 440].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i === 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.connect(this.flowGain);
      o.start();
    });

    // Continuous rolling tone: pitch rises with speed, like wind on a bike.
    this.rollGain = c.createGain();
    this.rollGain.gain.value = 0;
    this.rollGain.connect(this.tone);
    this.rollOsc = c.createOscillator();
    this.rollOsc.type = 'sine';
    this.rollOsc.frequency.value = 196;
    this.rollOsc2 = c.createOscillator();
    this.rollOsc2.type = 'triangle';
    this.rollOsc2.frequency.value = 294;
    const r2 = c.createGain();
    r2.gain.value = 0.35;
    this.rollOsc.connect(this.rollGain);
    this.rollOsc2.connect(r2).connect(this.rollGain);
    this.rollOsc.start();
    this.rollOsc2.start();

    // Faint brush hiss while drawing.
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 0.7;
    this.hissGain = c.createGain();
    this.hissGain.gain.value = 0;
    noise.connect(band).connect(this.hissGain).connect(this.master);
    noise.start();
  }

  private masterLevel() {
    return this.muted ? 0 : this.volume * (this.night ? 0.6 : 1);
  }

  private applyMaster() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.masterLevel(), this.ctx.currentTime, 0.1);
  }

  setVolume(v: number) { this.volume = v; this.applyMaster(); }
  setMuted(m: boolean) { this.muted = m; this.applyMaster(); }

  setNight(n: boolean) {
    this.night = n;
    if (!this.ctx) return;
    this.tone.frequency.setTargetAtTime(n ? 1400 : 3200, this.ctx.currentTime, 0.5);
    this.applyMaster();
  }

  setFlow(f: number) {
    if (!this.ctx) return;
    this.flowGain.gain.setTargetAtTime(f * 0.03, this.ctx.currentTime, 1.2);
  }

  setRolling(speed: number, touching: boolean) {
    if (!this.ctx) return;
    const s = Math.min(speed / 1100, 1);
    const t = this.ctx.currentTime;
    this.rollGain.gain.setTargetAtTime(touching ? 0.025 + 0.06 * s : 0, t, 0.12);
    this.rollOsc.frequency.setTargetAtTime(196 + s * 330, t, 0.1);
    this.rollOsc2.frequency.setTargetAtTime(294 + s * 495, t, 0.1);
  }

  setHiss(amount: number) {
    if (!this.ctx) return;
    this.hissGain.gain.setTargetAtTime(Math.min(amount, 1) * 0.02, this.ctx.currentTime, 0.05);
  }

  private blip(freq: number, when: number, peak: number, decay: number, type: OscillatorType = 'triangle') {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    o.connect(g).connect(this.tone);
    o.start(when);
    o.stop(when + decay + 0.05);
  }

  /** Soft pluck when the ball lands on a new line; higher on screen = higher note. */
  pluck(heightFromTop01: number) {
    if (!this.ctx) return;
    const idx = 5 + Math.round((1 - heightFromTop01) * 9);
    const t = this.ctx.currentTime;
    this.blip(note(idx), t, 0.12, 1.4);
    this.blip(note(idx) * 2, t, 0.03, 0.7, 'sine');
  }

  /** Falling chime when a ball leaves the screen: never a buzzer. */
  fall() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.blip(note(12), t, 0.04, 0.9, 'sine');
    this.blip(note(9), t + 0.14, 0.035, 1.1, 'sine');
  }

  /** Bright little arpeggio when a ball passes a gate in Gentle Paths. */
  gate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [10, 12, 14, 17].forEach((n, i) => this.blip(note(n), t + i * 0.07, 0.07, 1.2));
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume(); }

  destroy() {
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
