import { Injectable, signal } from '@angular/core';
import { MoveClassification } from '../models/analysis.model';
import { MemeSoundPack } from '../models/settings.model';

export const SOUND_TRACK_POOLS: Record<
  Exclude<MemeSoundPack, 'shuffle'>,
  Record<MoveClassification, string[]>
> = {
  meme: {
    brilliant: [
      'sounds/meme/brilliant/mlg-airhorn.wav',
      'sounds/meme/brilliant/anime-wow.mp3',
      'sounds/meme/brilliant/heavenly-choir.mp3',
      'sounds/meme/brilliant/anime-nani.mp3',
    ],
    great: [
      'sounds/meme/great/let-him-cook.mp3',
      'sounds/meme/great/gah-dayum.mp3',
      'sounds/meme/great/celebration-fanfare.mp3',
      'sounds/meme/great/victory-fanfare.mp3',
    ],
    best: [
      'sounds/meme/best/noice-click.wav',
      'sounds/meme/best/tactical-hitmarker.wav',
      'sounds/meme/best/yeah-baby.mp3',
      'sounds/meme/best/retro-coin.mp3',
    ],
    excellent: [
      'sounds/meme/excellent/emotional-damage.mp3',
      'sounds/meme/excellent/what-da-dog-doin.mp3',
      'sounds/meme/excellent/star-power.mp3',
    ],
    good: [
      'sounds/meme/good/hehe-boi.mp3',
      'sounds/meme/good/taco-bell-bong.mp3',
      'sounds/meme/good/bonk.mp3',
    ],
    book: [
      'sounds/meme/book/what-the-sigma.mp3',
      'sounds/meme/book/rizz-synth.mp3',
      'sounds/meme/book/nerd-emoji.mp3',
      'sounds/meme/book/bass-drop.mp3',
    ],
    inaccuracy: [
      'sounds/meme/inaccuracy/huh-cat.mp3',
      'sounds/meme/inaccuracy/what-the-hell.mp3',
      'sounds/meme/inaccuracy/crickets.mp3',
      'sounds/meme/inaccuracy/dun-dun-dun.mp3',
    ],
    mistake: [
      'sounds/meme/mistake/brother-eww.mp3',
      'sounds/meme/mistake/bruh.mp3',
      'sounds/meme/mistake/boo-womp.mp3',
    ],
    miss: [
      'sounds/meme/miss/windows-error.mp3',
      'sounds/meme/miss/roblox-oof.mp3',
      'sounds/meme/miss/sad-violin.mp3',
    ],
    blunder: [
      'sounds/meme/blunder/fahhh.mp3',
      'sounds/meme/blunder/vine-boom.mp3',
      'sounds/meme/blunder/metal-pipe.mp3',
      'sounds/meme/blunder/dun-dun-dun-shock.mp3',
      'sounds/meme/blunder/get-out.mp3',
      'sounds/meme/blunder/wilhelm-scream.mp3',
    ],
    unknown: [],
  },
  arcade: {
    brilliant: ['sounds/arcade/brilliant/victory-fanfare.wav'],
    great: ['sounds/arcade/great/double-coin.wav'],
    best: ['sounds/arcade/best/coin-chime.wav'],
    excellent: ['sounds/arcade/excellent/powerup.wav'],
    good: ['sounds/arcade/good/blip.wav'],
    book: ['sounds/arcade/book/stage-clear.wav'],
    inaccuracy: ['sounds/arcade/inaccuracy/laser-zap.wav'],
    mistake: ['sounds/arcade/mistake/hit-hurt.wav'],
    miss: ['sounds/arcade/miss/descending-buzz.wav'],
    blunder: ['sounds/arcade/blunder/explosion.wav'],
    unknown: [],
  },
  cartoon: {
    brilliant: ['sounds/cartoon/brilliant/sparkle-cascade.wav'],
    great: ['sounds/cartoon/great/spring-boing.wav'],
    best: ['sounds/cartoon/best/pop-bell.wav'],
    excellent: ['sounds/cartoon/excellent/glockenspiel.wav'],
    good: ['sounds/cartoon/good/woodblock-knock.wav'],
    book: ['sounds/cartoon/book/slide-whistle-up.wav'],
    inaccuracy: ['sounds/cartoon/inaccuracy/rubber-duck.wav'],
    mistake: ['sounds/cartoon/mistake/slide-whistle-down.wav'],
    miss: ['sounds/cartoon/miss/sad-trombone.wav'],
    blunder: ['sounds/cartoon/blunder/anvil-crash.wav'],
    unknown: [],
  },
  classical: {
    brilliant: ['sounds/classical/brilliant/grand-piano-9th.wav'],
    great: ['sounds/classical/great/orchestral-bell.wav'],
    best: ['sounds/classical/best/concert-glockenspiel.wav'],
    excellent: ['sounds/classical/excellent/harp-triad.wav'],
    good: ['sounds/classical/good/staccato-cello.wav'],
    book: ['sounds/classical/book/harp-glissando.wav'],
    inaccuracy: ['sounds/classical/inaccuracy/dissonant-pinch.wav'],
    mistake: ['sounds/classical/mistake/cello-minor-plunge.wav'],
    miss: ['sounds/classical/miss/melancholy-piano.wav'],
    blunder: ['sounds/classical/blunder/timpani-brass-strike.wav'],
    unknown: [],
  },
};

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  readonly isMuted = signal<boolean>(false);
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Lazy AudioContext on first user interaction
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  toggleMute(): void {
    this.isMuted.update((m) => !m);
    if (this.isMuted() && this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted.set(muted);
    if (muted && this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /**
   * Synthesizes crisp physical chess board sounds using Web Audio API
   */
  playChessMoveSound(type: 'move' | 'capture' | 'check' | 'castle' = 'move', volumePercent = 80): void {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const masterVol = Math.max(0, Math.min(1, volumePercent / 100)) * 0.45;
      const now = ctx.currentTime;

      if (type === 'move') {
        // Crisp wood tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

        gain.gain.setValueAtTime(masterVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'capture') {
        // Deep wood knock + impact
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

        gain.gain.setValueAtTime(masterVol * 1.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'check') {
        // High alert ping
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(650, now);
        osc2.frequency.setValueAtTime(1300, now);

        gain.gain.setValueAtTime(masterVol * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.22);
        osc2.stop(now + 0.22);
      } else if (type === 'castle') {
        // Double shuffle
        this.playChessMoveSound('move', volumePercent);
        setTimeout(() => this.playChessMoveSound('move', volumePercent * 0.8), 85);
      }
    } catch {
      // Audio playback fallback
    }
  }

  /**
   * Plays meme reaction audio from sound packs
   */
  playReactionSound(
    classification: MoveClassification,
    pack: MemeSoundPack = 'meme',
    volumePercent = 80
  ): void {
    if (this.isMuted()) return;
    if (classification === 'unknown') return;

    let targetPack: Exclude<MemeSoundPack, 'shuffle'> = 'meme';
    if (pack === 'shuffle') {
      const packs: Exclude<MemeSoundPack, 'shuffle'>[] = ['meme', 'arcade', 'cartoon', 'classical'];
      targetPack = packs[Math.floor(Math.random() * packs.length)];
    } else {
      targetPack = pack;
    }

    const pool = SOUND_TRACK_POOLS[targetPack]?.[classification];
    if (!pool || pool.length === 0) return;

    const chosenUrl = pool[Math.floor(Math.random() * pool.length)];
    this.playAudioFile(chosenUrl, volumePercent);
  }

  playAudioFile(url: string, volumePercent = 80): void {
    if (this.isMuted() || typeof window === 'undefined') return;

    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volumePercent / 100));
      this.currentAudio = audio;
      audio.play().catch(() => {
        // Ignore autoplay or unready error
      });
    } catch {
      // Ignore
    }
  }
}
