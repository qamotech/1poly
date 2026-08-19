import { useEffect, useRef } from 'react';
import { GameState, SpaceType } from './types';
import { SPACES } from './engine/board';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private eq: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private soundUrls: Record<string, string>;
  private isInitialized = false;

  constructor(soundUrls: Record<string, string>) {
    this.soundUrls = soundUrls;
  }

  // Create a synthetic impulse response for the reverb
  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number) {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = Math.random() * 2 - 1;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return impulse;
  }

  private preloadPromise: Promise<void> | null = null;

  initSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      
      // High-Def EQ (slight mid-scoop, high sparkle)
      this.eq = this.ctx.createBiquadFilter();
      this.eq.type = 'peaking';
      this.eq.frequency.value = 2500;
      this.eq.Q.value = 1.5;
      this.eq.gain.value = 4; // Add sparkle

      const lowShelf = this.ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 200;
      lowShelf.gain.value = 3; // Add bass punch
      
      // Reverb (Ultra High Def FX)
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.createImpulseResponse(this.ctx, 1.5, 3.0);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.15; // Wet level

      // Master volume and compression for punchy, non-clipping sound
      this.masterGain.gain.value = 0.6;
      
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Routing:
      // Dry: Source -> lowShelf -> EQ -> masterGain -> compressor -> dest
      // Wet: Source -> reverb -> reverbGain -> masterGain -> compressor -> dest
      lowShelf.connect(this.eq);
      this.eq.connect(this.masterGain);
      
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      
      // Save entry point for dry signals
      (this as any).entryNode = lowShelf;

      this.preloadPromise = this.preloadAssets();
    } catch (e) {
      console.warn("AudioContext initialization failed", e);
    }
  }

  async init() {
    this.initSync();
    if (this.preloadPromise) await this.preloadPromise;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    } else if (!this.isInitialized) {
      this.initSync();
    }
  }

  private async preloadAssets() {
    if (!this.ctx) return;
    const loadPromises = Object.entries(this.soundUrls).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.buffers[key] = audioBuffer;
      } catch (err) {
        // Will fail silently if the files haven't been added to the public folder yet
        console.warn(`[SoundEngine] Failed to load audio file for '${key}' at ${url}`, err);
      }
    });
    await Promise.allSettled(loadPromises);
  }

  /**
   * Plays a preloaded audio buffer with spatial panning.
   * @param soundId The key in the soundUrls dictionary.
   * @param panX The 2D spatial panning value relative to center (-1.0 to 1.0).
   * @param volume The volume level (0.0 to 1.0).
   */
  async play(soundId: string, panX: number = 0, volume: number = 1.0) {
    if (!this.ctx || !this.masterGain) {
      this.initSync();
    }
    
    this.resume();

    if (this.preloadPromise) {
      await this.preloadPromise;
    }

    const buffer = this.buffers[soundId];
    if (!buffer) return; // Asset not loaded or failed to load

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = volume;

      // PannerNode for basic 2D spatial panning
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, panX));
        source.connect(panner);
        panner.connect(gainNode);
      } else {
        // Fallback for older browsers
        const panner = this.ctx.createPanner();
        panner.panningModel = 'equalpower';
        panner.setPosition(panX, 0, 1 - Math.abs(panX));
        source.connect(panner);
        panner.connect(gainNode);
      }
      
      const targetNode = (this as any).entryNode || this.masterGain;
      gainNode.connect(targetNode);
      
      // Also send to Reverb for that Ultra High Def space
      if (this.reverb) {
        gainNode.connect(this.reverb);
      }

      source.start(0);
    } catch (e) {
      console.warn(`Failed to play sound: ${soundId}`, e);
    }
  }

  // Core requested methods mapped directly
  playLaser(panX = 0) { this.play('laser', panX); }
  playExplosion(panX = 0) { this.play('explosion', panX); }
  playUiClick(panX = 0) { this.play('ui_click', panX); }

  // Game specific methods mapped to samples
  playDice(panX = 0) { this.play('dice', panX); }
  playBuy(panX = 0) { this.play('buy', panX); }
  playRent(panX = 0) { this.play('rent', panX); }
  playGo(panX = 0) { this.play('go', panX); }
  playJail(panX = 0) { this.play('jail', panX); }
  playCard(panX = 0) { this.play('card', panX); }
  playBankrupt(panX = 0) { this.play('bankrupt', panX); }
  playRailroad(panX = 0) { this.play('railroad', panX); }
  playUtility(panX = 0) { this.play('utility', panX); }
}

const defaultAssets = {
  // Required requested assets
  laser: '/sounds/laser.mp3',
  explosion: '/sounds/explosion.wav',
  ui_click: '/sounds/ui_click.wav',
  
  // Game assets
  dice: '/sounds/dice.mp3',
  buy: '/sounds/buy.mp3',
  rent: '/sounds/rent.mp3',
  go: '/sounds/go.mp3',
  jail: '/sounds/jail.mp3',
  card: '/sounds/card.mp3',
  bankrupt: '/sounds/bankrupt.mp3',
  railroad: '/sounds/railroad.mp3',
  utility: '/sounds/utility.mp3'
};

export const audio = new SoundEngine(defaultAssets);

export function useGameAudio(gameState: GameState | null) {
  const lastLogLength = useRef(0);
  const lastRollCheck = useRef<string | null>(null);

  useEffect(() => {
    if (!gameState) return;
    
    const currentLogsLength = gameState.logs.length;
    if (currentLogsLength > lastLogLength.current) {
      const newLogs = gameState.logs.slice(lastLogLength.current);
      
      newLogs.forEach(log => {
        const lower = log.toLowerCase();
        // Determine arbitrary panning based on event index just for demonstration
        const mockPanX = (Math.random() * 2) - 1; 

        if (lower.includes('rolled')) {
          audio.playDice(mockPanX);
        } else if (lower.includes('bought')) {
          audio.playBuy(mockPanX);
        } else if (lower.includes('passed go') || lower.includes('landed on go')) {
          setTimeout(() => audio.playGo(0), 500);
        } else if (lower.includes('paid') && (lower.includes('rent') || lower.includes('tax'))) {
          audio.playRent(mockPanX);
        } else if (lower.includes('jail')) {
          audio.playJail(0);
        } else if (lower.includes('drew a') || lower.includes('chance') || lower.includes('chest')) {
          audio.playCard(mockPanX);
        } else if (lower.includes('bankrupt')) {
          audio.playBankrupt(0);
        }
      });
      lastLogLength.current = currentLogsLength;
    }

    const currentRollKey = gameState.lastDiceRoll ? `${gameState.turnCount}-${gameState.doublesRolledCount}` : null;
    
    if (currentRollKey && currentRollKey !== lastRollCheck.current) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer) {
        const space = SPACES[currentPlayer.position];
        // Calculate rough panning based on board position (0 to 39 mapped to -1 to 1 X-axis)
        const posPercent = currentPlayer.position / 39;
        let panX = 0;
        if (posPercent < 0.25) panX = -1 + (posPercent / 0.25) * 2; // Bottom edge (left to right mapping mock)
        else if (posPercent < 0.5) panX = -1; // Left edge
        else if (posPercent < 0.75) panX = 1 - ((posPercent - 0.5) / 0.25) * 2; // Top edge
        else panX = 1; // Right edge

        if (space.type === SpaceType.RAILROAD) {
          setTimeout(() => audio.playRailroad(panX), 600);
        } else if (space.type === SpaceType.UTILITY) {
          setTimeout(() => audio.playUtility(panX), 600);
        }
      }
      lastRollCheck.current = currentRollKey;
    }
    
  }, [gameState]);
}
