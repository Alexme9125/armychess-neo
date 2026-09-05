// Procedural Web Audio Synthesizer for natural liquid, glass, and game sound effects

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Piece placement / slide click
  public playPieceClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Liquid Fusion: Single Soft Water Droplet (吃子 - 单滴水珠融入水面)
  // Subtle, pleasant, pure acoustic droplet plop
  public playLiquidFusion() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle upward water droplet scoop then settle
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  // Liquid Splash: Twin Water Droplets Colliding (对掉 - 两颗微水珠空中轻触碰撞)
  // Two gentle micro-droplets in quick succession, delicate and distinct from fusion
  public playLiquidSplash() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First micro-droplet
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1020, now);
    osc1.frequency.exponentialRampToValueAtTime(1380, now + 0.03);
    osc1.frequency.exponentialRampToValueAtTime(950, now + 0.09);

    gain1.gain.setValueAtTime(0.09, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Second micro-droplet (offset by 35ms)
    const t2 = now + 0.035;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(780, t2);
    osc2.frequency.exponentialRampToValueAtTime(1120, t2 + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(700, t2 + 0.09);

    gain2.gain.setValueAtTime(0.08, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.09);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.09);
  }

  // Easter Egg Chime
  public playEasterEgg() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  // Victory Fanfare - Silenced per user requirement
  public playVictory() {
    // Intentionally no sound: user specified no audio on game over
  }
}

export const sound = new SoundEngine();
