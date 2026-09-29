/**
 * Booth sounds, synthesised with the Web Audio API (no audio files, no
 * licensing). Browsers only allow audio after a user gesture, so unlock()
 * is called on the first tap / key press (see main.tsx).
 */

const MUTE_KEY = 'magical-booth-muted';

type Listener = (muted: boolean) => void;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

class BoothSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = readMuted();
  private listeners = new Set<Listener>();

  /** Create / resume the audio context. Call from a user gesture. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
        // iOS: play one silent buffer inside the gesture to fully unlock output.
        const buf = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.ctx.destination);
        src.start(0);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // Audio is a nice-to-have; never break the booth over it.
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* private mode etc. */
    }
    this.listeners.forEach((l) => l(muted));
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private ready(): { ctx: AudioContext; out: GainNode } | null {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return null;
    return { ctx: this.ctx, out: this.master };
  }

  /** A soft sine "bell" note. */
  private note(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine') {
    const r = this.ready();
    if (!r) return;
    const t = r.ctx.currentTime + at;
    const osc = r.ctx.createOscillator();
    const g = r.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(r.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Countdown beep; `last` is the higher "1" beep. */
  tick(last = false): void {
    this.note(last ? 1318.5 : 880, 0, 0.18, 0.35);
    this.note(last ? 2637 : 1760, 0, 0.12, 0.08);
  }

  /** Camera shutter: short filtered noise burst + low click. */
  shutter(): void {
    const r = this.ready();
    if (!r) return;
    const { ctx, out } = r;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.7;
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    this.note(140, 0, 0.08, 0.4, 'triangle');
  }

  /** Magical chime (rising arpeggio with shimmer) when the photos are ready. */
  chime(): void {
    const notes = [1046.5, 1318.5, 1568, 2093, 2637];
    notes.forEach((f, i) => {
      this.note(f, i * 0.09, 1.2, 0.22);
      this.note(f * 2, i * 0.09 + 0.02, 0.6, 0.05);
    });
  }
}

export const sound = new BoothSound();
