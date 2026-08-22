import { useEffect, useRef } from 'react';
import { GameState, GamePhase, SpaceType } from './types';
import { SPACES } from './engine/board';

/**
 * High-Definition Web Audio Synthesizer & Sound Engine
 * Provides rich, spatialized procedural audio for board game actions,
 * ensuring zero network latency and 100% reliable audio atmosphere.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private eq: BiquadFilterNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private soundUrls: Record<string, string>;
  private isInitialized = false;
  private _isMuted = false;
  private _volume = 0.7;

  constructor(soundUrls: Record<string, string> = {}) {
    this.soundUrls = soundUrls;
  }

  // Create a synthetic impulse response for lush spatial reverb
  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number) {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  private preloadPromise: Promise<void> | null = null;

  initSync() {
    if (this.isInitialized && this.ctx) return;
    this.isInitialized = true;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();

      // High-Def EQ (sparkle in highs + punch in low shelf)
      this.eq = this.ctx.createBiquadFilter();
      this.eq.type = 'peaking';
      this.eq.frequency.value = 3000;
      this.eq.Q.value = 1.2;
      this.eq.gain.value = 3.5;

      this.lowShelf = this.ctx.createBiquadFilter();
      this.lowShelf.type = 'lowshelf';
      this.lowShelf.frequency.value = 220;
      this.lowShelf.gain.value = 2.5;

      // Spatial Convolution Reverb
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.createImpulseResponse(this.ctx, 1.8, 2.8);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.22;

      // Master volume and compression for crisp, non-clipping sound
      this.masterGain.gain.value = this._isMuted ? 0 : this._volume;

      this.compressor.threshold.value = -22;
      this.compressor.knee.value = 28;
      this.compressor.ratio.value = 10;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.22;

      // Routing:
      // Dry: lowShelf -> EQ -> masterGain -> compressor -> destination
      // Wet: reverb -> reverbGain -> masterGain -> compressor -> destination
      this.lowShelf.connect(this.eq);
      this.eq.connect(this.masterGain);

      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.preloadPromise = this.preloadAssets();
    } catch (e) {
      console.warn('[SoundEngine] AudioContext initialization failed', e);
    }
  }

  async init() {
    this.initSync();
    if (this.preloadPromise) await this.preloadPromise;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    } else if (!this.isInitialized) {
      this.initSync();
    }
  }

  setMuted(muted: boolean) {
    this._isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this._volume, this.ctx.currentTime);
    }
  }

  isMuted(): boolean {
    return this._isMuted;
  }

  setVolume(volume: number) {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this._isMuted) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    }
  }

  getVolume(): number {
    return this._volume;
  }

  private async preloadAssets() {
    if (!this.ctx || Object.keys(this.soundUrls).length === 0) return;
    const loadPromises = Object.entries(this.soundUrls).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.buffers[key] = audioBuffer;
      } catch {
        // Fallback to high-quality synthetic sounds seamlessly
      }
    });
    await Promise.allSettled(loadPromises);
  }

  /**
   * Helper to create a spatial routing pipeline for synthetic or sample audio
   */
  private createVoice(panX: number = 0, volume: number = 1.0): {
    ctx: AudioContext;
    input: GainNode;
    now: number;
  } | null {
    if (this._isMuted) return null;
    this.resume();
    if (!this.ctx || !this.masterGain || !this.lowShelf) return null;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(volume, now);

    // Spatial Stereo Panner
    const clampedPan = Math.max(-1, Math.min(1, panX));
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(clampedPan, now);
      voiceGain.connect(panner);
      panner.connect(this.lowShelf);
      if (this.reverb) {
        panner.connect(this.reverb);
      }
    } else {
      voiceGain.connect(this.lowShelf);
      if (this.reverb) {
        voiceGain.connect(this.reverb);
      }
    }

    return { ctx, input: voiceGain, now };
  }

  /**
   * Plays a preloaded audio buffer if present, otherwise uses synthetic fallback
   */
  async play(soundId: string, panX: number = 0, volume: number = 1.0) {
    if (this._isMuted) return;
    this.resume();

    const buffer = this.buffers[soundId];
    if (buffer && this.ctx) {
      try {
        const voice = this.createVoice(panX, volume);
        if (!voice) return;
        const source = voice.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(voice.input);
        source.start(0);
        return;
      } catch {
        // Continue to synthetic fallback below
      }
    }

    // High quality synthetic fallbacks
    switch (soundId) {
      case 'dice':
        this.playDice(panX);
        break;
      case 'buy':
        this.playBuy(panX);
        break;
      case 'rent':
        this.playRent(panX);
        break;
      case 'go':
        this.playGo(panX);
        break;
      case 'jail':
        this.playJail(panX);
        break;
      case 'card':
        this.playCard(panX);
        break;
      case 'bankrupt':
        this.playBankrupt(panX);
        break;
      case 'railroad':
        this.playRailroad(panX);
        break;
      case 'utility':
        this.playUtility(panX);
        break;
      case 'ui_click':
        this.playUiClick(panX);
        break;
      case 'win':
      case 'victory':
        this.playVictory();
        break;
      default:
        this.playUiClick(panX);
    }
  }

  // ==========================================
  // HIGH-DEFINITION SYNTHETIC SOUND GENERATORS
  // ==========================================

  /**
   * Tactile UI Click: Ultra clean, crisp, satisfying micro-tap
   */
  playUiClick(panX = 0) {
    const voice = this.createVoice(panX, 0.45);
    if (!voice) return;
    const { ctx, input, now } = voice;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(input);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Rolling Dice: Realistic tumbling dice clatter and table bounces
   */
  playDice(panX = 0, isDoubles = false) {
    const voice = this.createVoice(panX, 0.85);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Series of rapidly decelerating wooden/acrylic dice impacts
    const impactTimes = [0, 0.035, 0.075, 0.125, 0.19, 0.27, 0.38, 0.52];

    impactTimes.forEach((delay, idx) => {
      const t = now + delay;
      const progress = idx / impactTimes.length;
      const intensity = Math.pow(1 - progress * 0.7, 1.4);

      // Noise impact (tactile sharp clack)
      const bufferSize = Math.floor(ctx.sampleRate * 0.025);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200 + (Math.random() * 1200 - 600), t);
      filter.Q.setValueAtTime(3.5, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8 * intensity, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(input);

      noiseSource.start(t);
      noiseSource.stop(t + 0.03);

      // Resonant body tone (wooden table thud)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const baseFreq = 260 + (Math.random() * 80 - 40);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.04);

      oscGain.gain.setValueAtTime(0.5 * intensity, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(oscGain);
      oscGain.connect(input);

      osc.start(t);
      osc.stop(t + 0.045);
    });

    // Doubles bonus sparkle chime
    if (isDoubles) {
      const sparkleDelay = 0.65;
      const notes = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7
      notes.forEach((freq, i) => {
        const t = now + sparkleDelay + i * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(input);

        osc.start(t);
        osc.stop(t + 0.5);
      });
    }
  }

  /**
   * Landing on Property: Inviting, melodic opportunity chime
   */
  playLandProperty(groupColor?: string, panX = 0) {
    const voice = this.createVoice(panX, 0.7);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Harmonious two-note opportunity chime (E5 -> B5 or A5 -> E6)
    const pitches = [659.25, 987.77];
    pitches.forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  /**
   * Landing on own property: Warm welcoming chime
   */
  playLandHome(panX = 0) {
    const voice = this.createVoice(panX, 0.6);
    if (!voice) return;
    const { ctx, input, now } = voice;

    const chord = [392.0, 523.25, 659.25]; // G4, C5, E5
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  /**
   * Paying Rent / Tax: Metallic coin clink and cash transaction sting
   */
  playRent(panX = 0) {
    const voice = this.createVoice(panX, 0.75);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Metallic coin exchange ring
    const coinFrequencies = [1318.5, 2093.0, 2637.0];
    coinFrequencies.forEach((freq, idx) => {
      const t = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.4);
    });

    // Mechanical cash drawer slide sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.2, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(input);

    osc.start(now + 0.08);
    osc.stop(now + 0.26);
  }

  /**
   * Purchasing Property: Classic cash register "Ka-Ching!" and coin ring
   */
  playBuy(panX = 0) {
    const voice = this.createVoice(panX, 0.85);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // 1. Mechanical spring click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(800, now);
    clickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
    clickGain.gain.setValueAtTime(0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(input);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. Bright high register bell ("Ching!")
    const bellPitches = [2093.0, 2637.0, 3135.96]; // C7, E7, G7
    bellPitches.forEach((freq, idx) => {
      const t = now + 0.05 + idx * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.75);
    });

    // 3. Gold coin clinking into tray
    [1760.0, 2349.32].forEach((freq, idx) => {
      const t = now + 0.22 + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Passing / Landing on GO: Major fanfare celebration
   */
  playGo(panX = 0) {
    const voice = this.createVoice(panX, 0.85);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Ascending celebratory major chord: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(input);

      osc.start(t);
      osc.stop(t + 0.85);
    });
  }

  /**
   * Landing on Railroad: Train whistle & locomotive rhythm
   */
  playRailroad(panX = 0) {
    const voice = this.createVoice(panX, 0.75);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Dual-tone harmonic train whistle (D5 + F#5) with vibrato LFO
    const whistleFrequencies = [587.33, 739.99];
    whistleFrequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(6, now);
      lfoGain.gain.setValueAtTime(12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(input);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.7);
      osc.stop(now + 0.7);
    });

    // Double locomotive chuff
    [0.2, 0.42].forEach((delay) => {
      const t = now + delay;
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(input);
      noise.start(t);
      noise.stop(t + 0.07);
    });
  }

  /**
   * Landing on Utility: Electric Company spark or Water Works droplet
   */
  playUtility(panX = 0, isWater = false) {
    const voice = this.createVoice(panX, 0.75);
    if (!voice) return;
    const { ctx, input, now } = voice;

    if (isWater) {
      // Bubbling water droplet chirp
      [1400, 1100, 1600].forEach((startFreq, idx) => {
        const t = now + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, t + 0.14);

        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(input);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } else {
      // Electric company spark hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(360, now + 0.15);
      osc.frequency.linearRampToValueAtTime(120, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(input);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  }

  /**
   * Drawing Card: Smooth card draw whoosh and mystery chime
   */
  playCard(panX = 0) {
    const voice = this.createVoice(panX, 0.7);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Card sweep whoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(2.0, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(input);
    noise.start(now);
    noise.stop(now + 0.09);

    // Mystery sparkle chime (B5 -> D#6 -> F#6)
    const arpeggio = [987.77, 1244.51, 1479.98];
    arpeggio.forEach((freq, idx) => {
      const t = now + 0.06 + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Landing on Tax: Downward stern financial thud
   */
  playTax(panX = 0) {
    const voice = this.createVoice(panX, 0.7);
    if (!voice) return;
    const { ctx, input, now } = voice;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(input);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Landing in Jail / Go to Jail: Iron gate slam & metallic clatter
   */
  playJail(panX = 0) {
    const voice = this.createVoice(panX, 0.85);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Low sub thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(input);
    osc.start(now);
    osc.stop(now + 0.46);

    // Iron bar metallic resonant ping
    [880, 1174.66, 1760].forEach((freq, idx) => {
      const t = now + idx * 0.02;
      const barOsc = ctx.createOscillator();
      const barGain = ctx.createGain();
      barOsc.type = 'sine';
      barOsc.frequency.setValueAtTime(freq, t);
      barGain.gain.setValueAtTime(0.4, t);
      barGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      barOsc.connect(barGain);
      barGain.connect(input);
      barOsc.start(t);
      barOsc.stop(t + 0.55);
    });
  }

  /**
   * Free Parking: Relaxing rest chime / Jackpot shower
   */
  playFreeParking(panX = 0, hasJackpot = false) {
    const voice = this.createVoice(panX, 0.7);
    if (!voice) return;
    const { ctx, input, now } = voice;

    if (hasJackpot) {
      // Cascade of coins
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.07;
        const freq = 1600 + Math.random() * 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(input);
        osc.start(t);
        osc.stop(t + 0.35);
      }
    } else {
      // Soothing chord
      [440, 554.37, 659.25].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(input);
        osc.start(now);
        osc.stop(now + 0.65);
      });
    }
  }

  /**
   * Building House / Hotel: Construction hammer tap & upgrade sparkle
   */
  playBuild(panX = 0) {
    const voice = this.createVoice(panX, 0.8);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Double hammer strike on wooden beam
    [0, 0.12].forEach((delay) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 0.06);
    });

    // Upgrade twinkle
    [1046.5, 1318.51, 1567.98].forEach((freq, idx) => {
      const t = now + 0.22 + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Trade Complete: Friendly agreement chime
   */
  playTrade(panX = 0) {
    const voice = this.createVoice(panX, 0.7);
    if (!voice) return;
    const { ctx, input, now } = voice;

    [587.33, 739.99, 880.0].forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  /**
   * Bankruptcy: Dramatic descending minor slide
   */
  playBankrupt(panX = 0) {
    const voice = this.createVoice(panX, 0.85);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // Tragic descending trombone slide (F4 -> E4 -> Eb4 -> D4)
    const notes = [349.23, 329.63, 311.13, 293.66];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.2);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * Winning the Game: Grand orchestral/brass victory fanfare & celebratory chimes
   */
  playVictory() {
    const voice = this.createVoice(0, 0.95);
    if (!voice) return;
    const { ctx, input, now } = voice;

    // 1. Fanfare triplet lead-in: G4 - G4 - G4 - C5
    const triplet = [
      { freq: 392.0, time: 0, dur: 0.12 },
      { freq: 392.0, time: 0.14, dur: 0.12 },
      { freq: 392.0, time: 0.28, dur: 0.12 },
      { freq: 523.25, time: 0.44, dur: 0.38 },
    ];

    triplet.forEach(({ freq, time, dur }) => {
      const t = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });

    // 2. Ascending Brass chords progression: C-Maj -> F-Maj -> G-Maj -> C-Major Climax
    const chords = [
      { notes: [523.25, 659.25, 783.99], time: 0.85, dur: 0.35 },
      { notes: [587.33, 698.46, 880.0], time: 1.25, dur: 0.35 },
      { notes: [783.99, 987.77, 1174.66], time: 1.65, dur: 0.5 },
      { notes: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0], time: 2.2, dur: 2.5 },
    ];

    chords.forEach(({ notes, time, dur }) => {
      const chordTime = now + time;
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);

        gain.gain.setValueAtTime(0.4 / Math.sqrt(notes.length), chordTime);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + dur);

        osc.connect(gain);
        gain.connect(input);
        osc.start(chordTime);
        osc.stop(chordTime + dur + 0.1);
      });
    });

    // 3. Shimmering Victory Glockenspiel Arpeggios during the finale
    const shimmerNotes = [1046.5, 1318.51, 1567.98, 2093.0, 2637.02, 3135.96];
    shimmerNotes.forEach((freq, idx) => {
      const t = now + 2.3 + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(input);
      osc.start(t);
      osc.stop(t + 1.25);
    });

    // 4. Celebratory fireworks pop bursts
    [2.8, 3.2, 3.7, 4.1].forEach((delay, idx) => {
      const t = now + delay;
      const panBurst = idx % 2 === 0 ? -0.6 : 0.6;
      const burstVoice = this.createVoice(panBurst, 0.4);
      if (!burstVoice) return;

      const osc = burstVoice.ctx.createOscillator();
      const gain = burstVoice.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(burstVoice.input);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  // Backwards compatible laser / explosion mappings
  playLaser(panX = 0) {
    this.playUiClick(panX);
  }

  playExplosion(panX = 0) {
    this.playBankrupt(panX);
  }
}

const defaultAssets = {
  laser: '/sounds/laser.mp3',
  explosion: '/sounds/explosion.wav',
  ui_click: '/sounds/ui_click.wav',
  dice: '/sounds/dice.mp3',
  buy: '/sounds/buy.mp3',
  rent: '/sounds/rent.mp3',
  go: '/sounds/go.mp3',
  jail: '/sounds/jail.mp3',
  card: '/sounds/card.mp3',
  bankrupt: '/sounds/bankrupt.mp3',
  railroad: '/sounds/railroad.mp3',
  utility: '/sounds/utility.mp3',
};

export const audio = new SoundEngine(defaultAssets);

/**
 * Calculates a spatial panning value (-1.0 to 1.0) based on board position (0-39)
 */
function getSpacePanX(position: number): number {
  if (position >= 0 && position <= 10) {
    // Bottom edge: index 0 (GO, right = +0.8) to index 10 (Jail, left = -0.8)
    return 0.8 - (position / 10) * 1.6;
  } else if (position > 10 && position <= 20) {
    // Left edge
    return -0.8;
  } else if (position > 20 && position <= 30) {
    // Top edge: index 20 (Free Parking, left = -0.8) to index 30 (Go To Jail, right = +0.8)
    return -0.8 + ((position - 20) / 10) * 1.6;
  } else {
    // Right edge
    return 0.8;
  }
}

/**
 * Comprehensive Audio Hook for tracking and orchestrating atmospheric sound effects
 * for rolling dice, landing on properties, and winning the game.
 */
export function useGameAudio(gameState: GameState | null) {
  const lastLogLength = useRef(0);
  const lastRollCheck = useRef<string | null>(null);
  const lastPositionRef = useRef<Record<string, number>>({});
  const lastPhaseRef = useRef<GamePhase | null>(null);
  const hasWonRef = useRef(false);

  useEffect(() => {
    if (!gameState) {
      hasWonRef.current = false;
      return;
    }

    // 1. GAME OVER / WINNER FANFARE
    if (gameState.phase === GamePhase.GAME_OVER && !hasWonRef.current) {
      hasWonRef.current = true;
      audio.playVictory();
    } else if (gameState.phase !== GamePhase.GAME_OVER) {
      hasWonRef.current = false;
    }

    // 2. DICE ROLLING AUDIO TRIGGER
    const currentRollKey = gameState.lastDiceRoll
      ? `${gameState.turnCount}-${gameState.doublesRolledCount}-${gameState.lastDiceRoll[0]}-${gameState.lastDiceRoll[1]}`
      : null;

    if (currentRollKey && currentRollKey !== lastRollCheck.current) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const panX = currentPlayer ? getSpacePanX(currentPlayer.position) : 0;
      const isDoubles =
        gameState.lastDiceRoll !== null && gameState.lastDiceRoll[0] === gameState.lastDiceRoll[1];

      audio.playDice(panX, isDoubles);
      lastRollCheck.current = currentRollKey;
    }

    // 3. LANDING ON SPACES / PROPERTIES
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer) {
      const prevPos = lastPositionRef.current[currentPlayer.id];
      const newPos = currentPlayer.position;

      // When player position changes or we entered POST_ROLL on a new space
      if (
        prevPos !== undefined &&
        prevPos !== newPos &&
        gameState.phase === GamePhase.POST_ROLL &&
        lastPhaseRef.current !== GamePhase.POST_ROLL
      ) {
        const landedSpace = SPACES[newPos];
        const panX = getSpacePanX(newPos);
        const propState = landedSpace ? gameState.propertyStates[landedSpace.id] : null;

        if (landedSpace) {
          switch (landedSpace.type) {
            case SpaceType.PROPERTY:
              if (!propState?.ownerId) {
                // Opportunity to buy
                audio.playLandProperty(landedSpace.groupColor, panX);
              } else if (propState.ownerId !== currentPlayer.id && !propState.isMortgaged) {
                // Paying rent to owner
                audio.playRent(panX);
              } else {
                // Landing on own property
                audio.playLandHome(panX);
              }
              break;

            case SpaceType.RAILROAD:
              audio.playRailroad(panX);
              if (propState?.ownerId && propState.ownerId !== currentPlayer.id && !propState.isMortgaged) {
                setTimeout(() => audio.playRent(panX), 400);
              }
              break;

            case SpaceType.UTILITY:
              audio.playUtility(panX, landedSpace.name.toLowerCase().includes('water'));
              if (propState?.ownerId && propState.ownerId !== currentPlayer.id && !propState.isMortgaged) {
                setTimeout(() => audio.playRent(panX), 400);
              }
              break;

            case SpaceType.GO:
              audio.playGo(panX);
              break;

            case SpaceType.TAX:
              audio.playTax(panX);
              break;

            case SpaceType.JAIL:
            case SpaceType.GO_TO_JAIL:
              audio.playJail(panX);
              break;

            case SpaceType.FREE_PARKING:
              audio.playFreeParking(panX, gameState.pot > 0);
              break;

            case SpaceType.CHANCE:
            case SpaceType.COMMUNITY_CHEST:
              audio.playCard(panX);
              break;
          }
        }
      }

      // Update position tracking
      lastPositionRef.current[currentPlayer.id] = newPos;
    }

    // 4. ACTION LOGS MONITORING (Secondary triggers & purchases)
    const currentLogsLength = gameState.logs.length;
    if (currentLogsLength > lastLogLength.current) {
      const newLogs = gameState.logs.slice(lastLogLength.current);

      newLogs.forEach((log) => {
        const lower = log.toLowerCase();
        const mockPanX = (Math.random() * 2 - 1) * 0.5;

        if (lower.includes('bought') || lower.includes('purchased')) {
          audio.playBuy(mockPanX);
        } else if (lower.includes('built house') || lower.includes('built hotel')) {
          audio.playBuild(mockPanX);
        } else if (lower.includes('trade accepted') || lower.includes('deal finalized')) {
          audio.playTrade(mockPanX);
        } else if (lower.includes('bankrupt')) {
          audio.playBankrupt(0);
        }
      });
      lastLogLength.current = currentLogsLength;
    }

    lastPhaseRef.current = gameState.phase;
  }, [gameState]);
}
