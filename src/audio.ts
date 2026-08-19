import { useEffect, useRef } from 'react';
import { GameState, SpaceType } from './types';
import { SPACES } from './engine/board';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private soundUrls: Record<string, string>;
  private isInitialized = false;

  constructor(soundUrls: Record<string, string>) {
    this.soundUrls = soundUrls;
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      
      // Master volume and compression for punchy, non-clipping sound
      this.masterGain.gain.value = 0.5;
      
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      await this.preloadAssets();
    } catch (e) {
      console.warn("AudioContext initialization failed", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    } else if (!this.isInitialized) {
      this.init();
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
  play(soundId: string, panX: number = 0, volume: number = 1.0) {
    if (!this.ctx || !this.masterGain) {
      this.init();
      return;
    }
    
    this.resume();

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
      
      gainNode.connect(this.masterGain);
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
