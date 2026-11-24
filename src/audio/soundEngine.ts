import type { Faction, Rarity } from '../engine/types';

export type BgmTension = 'normal' | 'climax';

const NORMAL_BASS = [
  73.42, 73.42, 87.31, 73.42, 98.0, 73.42, 87.31, 65.41,
  73.42, 73.42, 110.0, 98.0, 87.31, 82.41, 65.41, 65.41,
];

const NORMAL_ARP = [
  293.66, 0, 349.23, 440.0, 0, 523.25, 440.0, 349.23,
  293.66, 349.23, 0, 440.0, 587.33, 523.25, 440.0, 329.63,
];

const CLIMAX_BASS = [
  73.42, 146.83, 73.42, 146.83, 87.31, 174.61, 98.0, 196.0,
  110.0, 220.0, 98.0, 196.0, 87.31, 174.61, 65.41, 130.81,
];

const CLIMAX_LEAD = [
  587.33, 0, 698.46, 783.99, 880.0, 0, 783.99, 698.46,
  880.0, 1046.5, 880.0, 783.99, 698.46, 783.99, 659.25, 0,
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private bgmEnabled = true;
  private bgmRunning = false;
  private bgmTension: BgmTension = 'normal';
  private bgmStep = 0;
  private bgmInterval: ReturnType<typeof setInterval> | null = null;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgmLoopOnly();
    } else if (this.bgmRunning && this.bgmEnabled) {
      this.startBgmLoopOnly();
    }
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBgmLoopOnly();
    } else if (this.bgmRunning && this.enabled) {
      this.startBgmLoopOnly();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    endFreq?: number,
    lowpassFreq?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.018, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (lowpassFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowpassFreq, now);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  private playNoise(
    duration: number,
    filterFreq: number,
    volume = 0.12,
    delay = 0,
    filterType: BiquadFilterType = 'bandpass',
    endFilterFreq?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    if (endFilterFreq !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, endFilterFreq), now + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.025);
  }

  /* ==================== ADAPTIVE PROCEDURAL DUEL BGM ==================== */

  public startBgm(tension: BgmTension = 'normal'): void {
    this.bgmRunning = true;
    this.bgmTension = tension;
    if (!this.enabled || !this.bgmEnabled) return;
    this.startBgmLoopOnly();
  }

  public setBgmTension(tension: BgmTension): void {
    if (this.bgmTension === tension) return;
    this.bgmTension = tension;
    if (this.bgmRunning && this.enabled && this.bgmEnabled) {
      this.startBgmLoopOnly();
    }
  }

  public stopBgm(): void {
    this.bgmRunning = false;
    this.stopBgmLoopOnly();
  }

  private stopBgmLoopOnly(): void {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  private startBgmLoopOnly(): void {
    this.stopBgmLoopOnly();
    if (typeof window === 'undefined') return;
    const stepMs = this.bgmTension === 'climax' ? 105 : 122; // ~143 BPM climax vs ~123 BPM normal

    this.bgmInterval = setInterval(() => {
      if (!this.bgmRunning || !this.enabled || !this.bgmEnabled) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const idx = this.bgmStep % 16;
      const isClimax = this.bgmTension === 'climax';

      // Bass ostinato
      const bassFreq = isClimax ? CLIMAX_BASS[idx] : NORMAL_BASS[idx];
      if (bassFreq > 0) {
        this.playTone(
          bassFreq,
          isClimax ? 0.11 : 0.14,
          'sawtooth',
          isClimax ? 0.042 : 0.035,
          0,
          undefined,
          isClimax ? 560 : 420
        );
      }

      // Synth Arp / Climax Lead
      const melodicFreq = isClimax ? CLIMAX_LEAD[idx] : NORMAL_ARP[idx];
      if (melodicFreq > 0) {
        this.playTone(
          melodicFreq,
          isClimax ? 0.15 : 0.18,
          isClimax ? 'triangle' : 'sine',
          isClimax ? 0.036 : 0.026,
          0,
          undefined,
          2400
        );
      }

      // Subtle kick pulse on 0, 4, 8, 12 (plus syncopation on climax)
      if (idx % 4 === 0 || (isClimax && idx === 14)) {
        this.playTone(115, 0.09, 'sine', isClimax ? 0.055 : 0.042, 0, 38);
      }

      // Crisp off-beat hi-hat / snare accent
      if (idx % 2 === 1) {
        this.playNoise(0.03, 6400, isClimax ? 0.018 : 0.012, 0, 'highpass');
      }
      if (isClimax && (idx === 4 || idx === 12)) {
        this.playNoise(0.08, 1800, 0.028, 0, 'bandpass', 900);
      }

      this.bgmStep = (this.bgmStep + 1) % 16;
    }, stepMs);
  }

  /* ==================== UI & DUEL SFX ==================== */

  public uiClick(): void {
    this.playTone(620, 0.055, 'triangle', 0.06, 0, 880);
  }

  public cardDraw(): void {
    this.playNoise(0.14, 1400, 0.09, 0, 'bandpass', 3200);
    this.playTone(340, 0.09, 'sine', 0.04, 0.02, 520);
  }

  public summon(): void {
    this.summonSlam(false);
  }

  public summonSlam(isAce = false): void {
    if (isAce) {
      // Heavy Ace / Mythic Summon slam + dramatic brassy chord
      this.playTone(95, 0.45, 'sawtooth', 0.2, 0, 32, 420);
      this.playNoise(0.32, 620, 0.19, 0, 'lowpass', 110);
      [293.66, 440, 587.33, 880].forEach((f, i) => {
        this.playTone(f, 0.55, 'triangle', 0.11, 0.05 + i * 0.045);
      });
      return;
    }
    this.playTone(130, 0.24, 'sawtooth', 0.16, 0, 42);
    this.playTone(260, 0.2, 'triangle', 0.12, 0.03, 520);
    this.playNoise(0.16, 400, 0.11, 0, 'lowpass', 120);
  }

  public attack(): void {
    this.playNoise(0.18, 2600, 0.13, 0, 'bandpass', 650);
    this.playTone(320, 0.12, 'sawtooth', 0.09, 0, 120);
  }

  public elementalAttack(faction: Faction): void {
    switch (faction) {
      case 'pyroclast':
        // Flame jet roar
        this.playNoise(0.24, 900, 0.16, 0, 'bandpass', 2400);
        this.playTone(180, 0.2, 'sawtooth', 0.12, 0, 75, 900);
        break;
      case 'cryo_mecha':
        // Crystalline icicle lance
        this.playTone(1480, 0.16, 'sine', 0.1, 0, 2400);
        this.playTone(987, 0.18, 'triangle', 0.09, 0.03, 1760);
        this.playNoise(0.14, 4200, 0.1, 0, 'highpass', 1800);
        break;
      case 'umbra':
        // Dark void lightning slash
        this.playTone(460, 0.22, 'sawtooth', 0.11, 0, 82, 1200);
        this.playNoise(0.18, 2100, 0.12, 0.02, 'bandpass', 480);
        break;
      case 'chrono':
        // Resonant cosmic beam
        this.playTone(620, 0.22, 'sine', 0.11, 0, 1240);
        this.playTone(310, 0.24, 'triangle', 0.09, 0.02, 620);
        break;
      case 'sylvan':
        // Emerald wind-blade burst
        this.playNoise(0.22, 1800, 0.11, 0, 'bandpass', 3600);
        this.playTone(392, 0.18, 'triangle', 0.09, 0.01, 659.25);
        break;
      default:
        this.attack();
        break;
    }
  }

  public elementalImpact(faction: Faction, heavy = false): void {
    const mult = heavy ? 1.25 : 1;
    switch (faction) {
      case 'pyroclast':
        this.playNoise(0.32, 480, 0.18 * mult, 0, 'lowpass', 95);
        this.playTone(110, 0.3, 'sawtooth', 0.15 * mult, 0, 36, 480);
        break;
      case 'cryo_mecha':
        // Ice crystal shatter chime
        this.playNoise(0.24, 3400, 0.15 * mult, 0, 'highpass', 1200);
        [1567.98, 2093, 1318.5].forEach((f, i) => {
          this.playTone(f, 0.16, 'triangle', 0.08 * mult, i * 0.028, f * 0.72);
        });
        break;
      case 'umbra':
        this.playTone(88, 0.34, 'square', 0.14 * mult, 0, 28, 380);
        this.playNoise(0.24, 1400, 0.14 * mult, 0, 'bandpass', 220);
        break;
      case 'chrono':
        this.playTone(880, 0.26, 'sine', 0.11 * mult, 0, 220);
        this.playTone(120, 0.28, 'triangle', 0.14 * mult, 0.02, 42);
        break;
      case 'sylvan':
        this.playTone(150, 0.24, 'triangle', 0.13 * mult, 0, 58);
        this.playNoise(0.2, 1600, 0.12 * mult, 0, 'bandpass', 420);
        break;
      default:
        this.hit(heavy);
        break;
    }
  }

  public hit(heavy = false): void {
    this.playNoise(heavy ? 0.34 : 0.18, heavy ? 520 : 900, heavy ? 0.22 : 0.14, 0, 'lowpass', 100);
    this.playTone(heavy ? 92 : 150, heavy ? 0.38 : 0.18, 'square', heavy ? 0.18 : 0.11, 0, 32);
  }

  /** Massive anime bass drop + supernova shatter for Final Blow (LP -> 0) */
  public finalBlow(): void {
    this.playTone(120, 0.85, 'sawtooth', 0.24, 0, 22, 360);
    this.playTone(84, 0.9, 'square', 0.2, 0.03, 20, 280);
    this.playNoise(0.75, 1600, 0.24, 0, 'lowpass', 120);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) => {
      this.playTone(f, 0.72, 'triangle', 0.1, 0.12 + idx * 0.04);
    });
  }

  public shieldBlock(): void {
    this.playTone(980, 0.22, 'triangle', 0.12, 0, 740);
    this.playTone(1480, 0.16, 'sine', 0.08, 0.02, 1100);
  }

  public spellCast(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'sine', 0.09, idx * 0.045);
    });
  }

  public relicAttach(): void {
    this.playTone(440, 0.12, 'triangle', 0.1, 0, 660);
    this.playTone(880, 0.2, 'sine', 0.09, 0.08, 1175);
  }

  public soulBurn(): void {
    this.playNoise(0.26, 1200, 0.14, 0, 'bandpass', 420);
    this.playTone(220, 0.28, 'sawtooth', 0.1, 0.03, 587);
  }

  public evolve(): void {
    const notes = [392, 493.88, 587.33, 783.99, 987.77, 1174.66];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.42, 'triangle', 0.12, i * 0.065);
      this.playTone(freq * 1.5, 0.35, 'sine', 0.05, i * 0.065 + 0.02);
    });
    this.playNoise(0.45, 2200, 0.09, 0.05, 'highpass', 5200);
  }

  public fusion(): void {
    // Dual swirling vortex ascending
    this.playTone(140, 0.62, 'sawtooth', 0.14, 0, 580);
    this.playTone(147, 0.62, 'sawtooth', 0.14, 0, 600);
    this.playNoise(0.62, 800, 0.13, 0, 'bandpass', 3600);
    // Vortex singularity boom + mythic chord
    this.playTone(95, 0.72, 'square', 0.22, 0.56, 28);
    this.playNoise(0.52, 520, 0.22, 0.56, 'lowpass', 85);
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, idx) => {
      this.playTone(f, 0.9, 'triangle', 0.1, 0.6 + idx * 0.032);
    });
  }

  public ambush(): void {
    this.playTone(880, 0.13, 'sawtooth', 0.14, 0, 620);
    this.playTone(880, 0.14, 'sawtooth', 0.15, 0.15, 520);
    this.playNoise(0.2, 1800, 0.12, 0.05, 'bandpass', 700);
  }

  public packTear(): void {
    this.playNoise(0.32, 3200, 0.18, 0, 'highpass', 1100);
    this.playTone(300, 0.22, 'triangle', 0.1, 0.12, 900);
  }

  public revealRarity(rarity: Rarity): void {
    if (rarity === 'common') {
      this.playTone(440, 0.14, 'sine', 0.08, 0, 520);
    } else if (rarity === 'rare') {
      [523.25, 659.25, 783.99].forEach((f, i) =>
        this.playTone(f, 0.28, 'triangle', 0.11, i * 0.055)
      );
    } else if (rarity === 'epic') {
      [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) =>
        this.playTone(f, 0.42, 'sawtooth', 0.09, i * 0.06)
      );
    } else {
      // Mythic fanfare!
      this.playTone(130.81, 0.7, 'sawtooth', 0.14, 0, 130.81);
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      fanfare.forEach((f, i) => {
        this.playTone(f, 0.75, 'triangle', 0.13, i * 0.075);
        this.playTone(f * 0.5, 0.65, 'sine', 0.08, i * 0.075);
      });
      this.playNoise(0.5, 3600, 0.09, 0.15, 'highpass', 6000);
    }
  }

  public victory(): void {
    this.stopBgm();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.playTone(f, 0.55, 'triangle', 0.13, i * 0.12);
    });
  }

  public defeat(): void {
    this.stopBgm();
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      this.playTone(f, 0.55, 'sawtooth', 0.09, i * 0.15);
    });
  }

  /** Iconic rapid Yu-Gi-Oh! anime LP counter rolling tick */
  public lpTick(isHeal = false): void {
    this.playTone(isHeal ? 1320 : 1040, 0.032, 'square', 0.045, 0, isHeal ? 1560 : 880);
  }

  /** Dramatic prompt alert when a Manual Trap can be chained */
  public trapPrompt(): void {
    this.playTone(740, 0.1, 'triangle', 0.12, 0, 987);
    this.playTone(1174, 0.16, 'sine', 0.1, 0.08, 1480);
  }

  /** Cinematic sweep sound for Turn / Battle Phase cut-in banners */
  public turnSweep(isPlayer = true): void {
    this.playNoise(0.24, isPlayer ? 2200 : 950, 0.09, 0, 'bandpass', isPlayer ? 4200 : 480);
    this.playTone(isPlayer ? 392 : 246.94, 0.22, 'triangle', 0.11, 0.02, isPlayer ? 587.33 : 196);
  }
}

export const soundEngine = new SoundEngine();
