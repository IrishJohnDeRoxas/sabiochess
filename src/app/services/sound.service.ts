import { Injectable, signal } from '@angular/core';
import { MoveClassification } from '../models/analysis.model';
import { MemeSoundPack } from '../models/settings.model';

export type SoundTheme = 'standard' | 'woodland';
export type SoundType = 'move' | 'capture' | 'check' | 'castle';

export interface SoundTrackInfo {
  id: string;
  name: string;
  url: string;
}

interface ActiveAudioTrack {
  source: AudioNode & { stop?: (when?: number) => void };
  gainNode: GainNode;
}

export const MEME_POOLS: Record<MoveClassification, SoundTrackInfo[]> = {
  brilliant: [
    { id: 'mlg_airhorn', name: 'MLG Airhorn', url: '/sounds/meme/brilliant/mlg-airhorn.wav' },
    { id: 'nani', name: 'Anime "Nani?!"', url: '/sounds/meme/brilliant/anime-nani.mp3' },
    { id: 'anime_wow', name: 'Anime "Wow!"', url: '/sounds/meme/brilliant/anime-wow.mp3' },
    { id: 'heavenly', name: 'Heavenly Angelic Choir', url: '/sounds/meme/brilliant/heavenly-choir.mp3' },
  ],
  great: [
    { id: 'let_him_cook', name: '"Let Him Cook!"', url: '/sounds/meme/great/let-him-cook.mp3' },
    { id: 'gah_dayum', name: '"Gah Dayum!"', url: '/sounds/meme/great/gah-dayum.mp3' },
    { id: 'celebration', name: 'Celebration Fanfare', url: '/sounds/meme/great/celebration-fanfare.mp3' },
    { id: 'victory_fanfare', name: 'Victory Fanfare', url: '/sounds/meme/great/victory-fanfare.mp3' },
  ],
  best: [
    { id: 'noice', name: 'Michael Rosen "Noice"', url: '/sounds/meme/best/noice-click.wav' },
    { id: 'hitmarker', name: 'Tactical Hitmarker', url: '/sounds/meme/best/tactical-hitmarker.wav' },
    { id: 'yeah_baby', name: '"WOOOOO Yeah Baby!"', url: '/sounds/meme/best/yeah-baby.mp3' },
    { id: 'retro_coin', name: 'Retro Coin Ding', url: '/sounds/meme/best/retro-coin.mp3' },
  ],
  excellent: [
    { id: 'emotional_damage', name: '"Emotional Damage!"', url: '/sounds/meme/excellent/emotional-damage.mp3' },
    { id: 'what_da_dog_doin', name: '"What Da Dog Doin?!"', url: '/sounds/meme/excellent/what-da-dog-doin.mp3' },
    { id: 'star_power', name: 'Star Power Chime', url: '/sounds/meme/excellent/star-power.mp3' },
  ],
  good: [
    { id: 'hehe_boi', name: '"Hehe Bwoi"', url: '/sounds/meme/good/hehe-boi.mp3' },
    { id: 'taco_bell', name: 'Taco Bell Bong', url: '/sounds/meme/good/taco-bell-bong.mp3' },
    { id: 'bonk', name: 'Comedic Bonk!', url: '/sounds/meme/good/bonk.mp3' },
  ],
  book: [
    { id: 'what_the_sigma', name: '"What The Sigma?!"', url: '/sounds/meme/book/what-the-sigma.mp3' },
    { id: 'rizz', name: 'Rizz Sound Effect (Dramatic Synth)', url: '/sounds/meme/book/rizz-synth.mp3' },
    { id: 'nerd_emoji', name: 'Nerd Emoji', url: '/sounds/meme/book/nerd-emoji.mp3' },
    { id: 'bass_drop', name: 'Phonk Bass Drop', url: '/sounds/meme/book/bass-drop.mp3' },
  ],
  inaccuracy: [
    { id: 'huh_cat', name: 'Confused "HUH?!" Cat', url: '/sounds/meme/inaccuracy/huh-cat.mp3' },
    { id: 'what_the_hell', name: '"Boy What The Hell Boy"', url: '/sounds/meme/inaccuracy/what-the-hell.mp3' },
    { id: 'crickets', name: 'Awkward Crickets', url: '/sounds/meme/inaccuracy/crickets.mp3' },
    { id: 'dundundun', name: 'Dun Dun Dunnn!', url: '/sounds/meme/inaccuracy/dun-dun-dun.mp3' },
  ],
  mistake: [
    { id: 'bruh', name: 'Bruh Sound #2', url: '/sounds/meme/mistake/bruh.mp3' },
    { id: 'brother_ew', name: '"Brother Eww!"', url: '/sounds/meme/mistake/brother-eww.mp3' },
    { id: 'boo_womp', name: 'SpongeBob "Boo-Womp"', url: '/sounds/meme/mistake/boo-womp.mp3' },
  ],
  blunder: [
    { id: 'vine_boom', name: 'Vine Boom', url: '/sounds/meme/blunder/vine-boom.mp3' },
    { id: 'fahhh', name: 'FAHHH (Real Viral Meme)', url: '/sounds/meme/blunder/fahhh.mp3' },
    { id: 'dramatic_hit', name: 'Dun Dun Dunnn!', url: '/sounds/meme/blunder/dun-dun-dun-shock.mp3' },
    { id: 'wilhelm_scream', name: 'Wilhelm Scream', url: '/sounds/meme/blunder/wilhelm-scream.mp3' },
    { id: 'get_out', name: '"Get Out!"', url: '/sounds/meme/blunder/get-out.mp3' },
    { id: 'metal_pipe', name: 'Metal Pipe Falling', url: '/sounds/meme/blunder/metal-pipe.mp3' },
  ],
  miss: [
    { id: 'roblox_oof', name: 'Roblox "OOF!"', url: '/sounds/meme/miss/roblox-oof.mp3' },
    { id: 'windows_error', name: 'System Error Tone', url: '/sounds/meme/miss/windows-error.mp3' },
    { id: 'sad_violin', name: 'Sad Violin', url: '/sounds/meme/miss/sad-violin.mp3' },
  ],
  unknown: [],
};

export const ARCADE_POOLS: Record<MoveClassification, SoundTrackInfo[]> = {
  brilliant: [{ id: 'arcade_victory', name: '8-Bit Victory Fanfare', url: '/sounds/arcade/brilliant/victory-fanfare.wav' }],
  great: [{ id: 'arcade_double_coin', name: 'Arcade Double Coin', url: '/sounds/arcade/great/double-coin.wav' }],
  best: [{ id: 'arcade_coin', name: '8-Bit Coin Chime', url: '/sounds/arcade/best/coin-chime.wav' }],
  excellent: [{ id: 'arcade_powerup', name: '8-Bit Power-Up', url: '/sounds/arcade/excellent/powerup.wav' }],
  good: [{ id: 'arcade_blip', name: '8-Bit Friendly Blip', url: '/sounds/arcade/good/blip.wav' }],
  book: [{ id: 'arcade_stage_clear', name: 'Stage Clear Jingle', url: '/sounds/arcade/book/stage-clear.wav' }],
  inaccuracy: [{ id: 'arcade_laser_zap', name: 'Laser Zap Down', url: '/sounds/arcade/inaccuracy/laser-zap.wav' }],
  mistake: [{ id: 'arcade_hit_hurt', name: '8-Bit Hit Hurt', url: '/sounds/arcade/mistake/hit-hurt.wav' }],
  blunder: [{ id: 'arcade_explosion', name: '8-Bit Explosion', url: '/sounds/arcade/blunder/explosion.wav' }],
  miss: [{ id: 'arcade_descending_buzz', name: 'Bit-Crush Buzz Drop', url: '/sounds/arcade/miss/descending-buzz.wav' }],
  unknown: [],
};

export const CARTOON_POOLS: Record<MoveClassification, SoundTrackInfo[]> = {
  brilliant: [{ id: 'cartoon_sparkle', name: 'Magic Sparkle Cascade', url: '/sounds/cartoon/brilliant/sparkle-cascade.wav' }],
  great: [{ id: 'cartoon_spring', name: 'Spring Boing', url: '/sounds/cartoon/great/spring-boing.wav' }],
  best: [{ id: 'cartoon_pop_bell', name: 'Bubble Pop & Bell', url: '/sounds/cartoon/best/pop-bell.wav' }],
  excellent: [{ id: 'cartoon_glockenspiel', name: 'Gentle Glockenspiel', url: '/sounds/cartoon/excellent/glockenspiel.wav' }],
  good: [{ id: 'cartoon_woodblock', name: 'Woodblock Knock', url: '/sounds/cartoon/good/woodblock-knock.wav' }],
  book: [{ id: 'cartoon_slide_up', name: 'Slide Whistle Up', url: '/sounds/cartoon/book/slide-whistle-up.wav' }],
  inaccuracy: [{ id: 'cartoon_rubber_duck', name: 'Rubber Duck Squeak', url: '/sounds/cartoon/inaccuracy/rubber-duck.wav' }],
  mistake: [{ id: 'cartoon_slide_down', name: 'Slide Whistle Down', url: '/sounds/cartoon/mistake/slide-whistle-down.wav' }],
  blunder: [{ id: 'cartoon_anvil', name: 'Comical Anvil Crash', url: '/sounds/cartoon/blunder/anvil-crash.wav' }],
  miss: [{ id: 'cartoon_sad_trombone', name: 'Sad Wah-Wah Trombone', url: '/sounds/cartoon/miss/sad-trombone.wav' }],
  unknown: [],
};

export const CLASSICAL_POOLS: Record<MoveClassification, SoundTrackInfo[]> = {
  brilliant: [{ id: 'classical_grand_piano', name: 'Grand Piano Major 9th', url: '/sounds/classical/brilliant/grand-piano-9th.wav' }],
  great: [{ id: 'classical_orchestral_bell', name: 'Tubular Orchestral Bell', url: '/sounds/classical/great/orchestral-bell.wav' }],
  best: [{ id: 'classical_concert_glockenspiel', name: 'Concert Glockenspiel', url: '/sounds/classical/best/concert-glockenspiel.wav' }],
  excellent: [{ id: 'classical_harp_triad', name: 'Warm Harp Triad', url: '/sounds/classical/excellent/harp-triad.wav' }],
  good: [{ id: 'classical_staccato_cello', name: 'Staccato String Cello', url: '/sounds/classical/good/staccato-cello.wav' }],
  book: [{ id: 'classical_harp_glissando', name: 'Concert Harp Glissando', url: '/sounds/classical/book/harp-glissando.wav' }],
  inaccuracy: [{ id: 'classical_dissonant_pinch', name: 'Dissonant String Pinch', url: '/sounds/classical/inaccuracy/dissonant-pinch.wav' }],
  mistake: [{ id: 'classical_cello_plunge', name: 'Cello Minor Plunge', url: '/sounds/classical/mistake/cello-minor-plunge.wav' }],
  blunder: [{ id: 'classical_timpani_brass', name: 'Timpani Strike & Low Brass', url: '/sounds/classical/blunder/timpani-brass-strike.wav' }],
  miss: [{ id: 'classical_melancholy_piano', name: 'Melancholy Minor Piano', url: '/sounds/classical/miss/melancholy-piano.wav' }],
  unknown: [],
};

export const ALL_PACK_POOLS: Record<
  Exclude<MemeSoundPack, 'shuffle'>,
  Record<MoveClassification, SoundTrackInfo[]>
> = {
  meme: MEME_POOLS,
  arcade: ARCADE_POOLS,
  cartoon: CARTOON_POOLS,
  classical: CLASSICAL_POOLS,
};

export const SOUND_TRACK_POOLS: Record<
  Exclude<MemeSoundPack, 'shuffle'>,
  Record<MoveClassification, string[]>
> = {
  meme: Object.fromEntries(
    Object.entries(MEME_POOLS).map(([k, v]) => [k, v.map((item) => item.url)])
  ) as any,
  arcade: Object.fromEntries(
    Object.entries(ARCADE_POOLS).map(([k, v]) => [k, v.map((item) => item.url)])
  ) as any,
  cartoon: Object.fromEntries(
    Object.entries(CARTOON_POOLS).map(([k, v]) => [k, v.map((item) => item.url)])
  ) as any,
  classical: Object.fromEntries(
    Object.entries(CLASSICAL_POOLS).map(([k, v]) => [k, v.map((item) => item.url)])
  ) as any,
};

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  readonly isMuted = signal<boolean>(false);
  readonly theme = signal<SoundTheme>('standard');
  readonly memePack = signal<MemeSoundPack>('meme');

  private audioCtx: AudioContext | null = null;
  private offlineCtx: OfflineAudioContext | null = null;
  private audioBufferCache = new Map<string, AudioBuffer>();
  private loadingBuffers = new Set<string>();
  private lastPlayedUrlByClassification = new Map<MoveClassification, string>();
  private activeTracks: ActiveAudioTrack[] = [];
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('pointerdown', unlockAudio, { passive: true });

      // Preload sound buffers across all sound packs in background silently
      this.preloadAllSounds();
    }
  }

  setTheme(newTheme: SoundTheme): void {
    this.theme.set(newTheme);
  }

  setMemePack(newPack: MemeSoundPack): void {
    this.memePack.set(newPack);
  }

  toggleMute(): void {
    this.isMuted.update((muted) => !muted);
    if (this.isMuted()) {
      this.stopCurrentSounds(0.04);
      if (this.currentAudio) {
        this.currentAudio.pause();
      }
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted.set(muted);
    if (muted) {
      this.stopCurrentSounds(0.04);
      if (this.currentAudio) {
        this.currentAudio.pause();
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private getOfflineAudioContext(): OfflineAudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.offlineCtx) {
      const OfflineCtxClass =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (OfflineCtxClass) {
        this.offlineCtx = new OfflineCtxClass(1, 1, 44100);
      }
    }
    return this.offlineCtx;
  }

  /**
   * Smoothly fades out and terminates all currently playing sounds.
   * Prevents cacophony and audio clipping when stepping quickly through moves.
   */
  stopCurrentSounds(fadeDuration = 0.08): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
    }

    if (this.activeTracks.length === 0 || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const tracksToStop = [...this.activeTracks];
    this.activeTracks = [];

    for (const track of tracksToStop) {
      try {
        track.gainNode.gain.cancelScheduledValues(now);
        track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
        track.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
        if (typeof track.source.stop === 'function') {
          track.source.stop(now + fadeDuration + 0.01);
        }
      } catch {}
    }
  }

  private registerActiveTrack(
    source: AudioNode & { stop?: (when?: number) => void },
    gainNode: GainNode
  ): void {
    const track: ActiveAudioTrack = { source, gainNode };
    this.activeTracks.push(track);

    if ('onended' in source) {
      (source as AudioScheduledSourceNode).onended = () => {
        const idx = this.activeTracks.indexOf(track);
        if (idx !== -1) {
          this.activeTracks.splice(idx, 1);
        }
      };
    }
  }

  private preloadAllSounds(): void {
    const packs = [MEME_POOLS, ARCADE_POOLS, CARTOON_POOLS, CLASSICAL_POOLS];
    for (const poolMap of packs) {
      const classifications = Object.keys(poolMap) as MoveClassification[];
      for (const c of classifications) {
        const tracks = poolMap[c] || [];
        for (const t of tracks) {
          this.loadAudioBuffer(t.url).catch(() => {});
        }
      }
    }
  }

  async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }
    if (this.loadingBuffers.has(url) || typeof window === 'undefined' || !window.fetch) {
      return null;
    }

    this.loadingBuffers.add(url);
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const ctx = this.audioCtx || this.getOfflineAudioContext();
      if (!ctx) return null;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    } finally {
      this.loadingBuffers.delete(url);
    }
  }

  /**
   * Play standard chess move sound effects using Web Audio API synthesis.
   */
  play(type: SoundType = 'move', volumeMultiplier = 1.0): void {
    if (this.isMuted() || typeof window === 'undefined') return;

    try {
      this.stopCurrentSounds(0.06);

      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const vol = Math.max(0, Math.min(1, volumeMultiplier));

      switch (type) {
        case 'move':
          this.synthWoodClick(ctx, now, 380, 70, 0.05, 0.35 * vol);
          break;

        case 'capture':
          this.synthWoodClick(ctx, now, 520, 110, 0.065, 0.45 * vol);
          this.synthWoodClick(ctx, now + 0.015, 280, 80, 0.05, 0.25 * vol);
          break;

        case 'check':
          this.synthChime(ctx, now, 587.33, 0.22, 0.25 * vol);
          this.synthChime(ctx, now + 0.04, 880.0, 0.26, 0.2 * vol);
          break;

        case 'castle':
          this.synthWoodClick(ctx, now, 380, 75, 0.045, 0.3 * vol);
          this.synthWoodClick(ctx, now + 0.085, 340, 70, 0.05, 0.35 * vol);
          break;
      }
    } catch {}
  }

  playChessMoveSound(
    type: 'move' | 'capture' | 'check' | 'castle' = 'move',
    volumePercent = 80
  ): void {
    const volMult = Math.max(0, Math.min(1, volumePercent / 100));
    this.play(type, volMult);
  }

  /**
   * Play a sound effect corresponding to a move classification and active pack.
   */
  playClassification(
    classification: MoveClassification,
    volumeMultiplier = 0.8,
    explicitPack?: MemeSoundPack,
    explicitUrl?: string
  ): void {
    if (this.isMuted() || typeof window === 'undefined' || classification === 'unknown') return;

    try {
      this.stopCurrentSounds(0.08);

      const ctx = this.getAudioContext();
      if (!ctx) return;

      let rawPack: Exclude<MemeSoundPack, 'shuffle'> = 'meme';
      const currentPack = explicitPack || this.memePack();

      if (currentPack === 'shuffle') {
        const availablePacks: Exclude<MemeSoundPack, 'shuffle'>[] = [
          'meme',
          'arcade',
          'cartoon',
          'classical',
        ];
        rawPack = availablePacks[Math.floor(Math.random() * availablePacks.length)];
      } else {
        rawPack = currentPack;
      }

      // If explicit procedural synth is desired or fallback needed
      if (!explicitUrl && (rawPack === 'arcade' || rawPack === 'cartoon' || rawPack === 'classical')) {
        this.fallbackProceduralSynth(ctx, classification, rawPack, volumeMultiplier);
        return;
      }

      const targetUrl = explicitUrl || this.selectRandomTrack(classification, rawPack)?.url;
      if (!targetUrl) {
        this.fallbackProceduralSynth(ctx, classification, rawPack, volumeMultiplier);
        return;
      }

      const cached = this.audioBufferCache.get(targetUrl);
      if (cached) {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const targetVol = Math.max(0, Math.min(1, 0.75 * volumeMultiplier));
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.015);
        source.buffer = cached;
        source.connect(gain);
        gain.connect(ctx.destination);
        this.registerActiveTrack(source, gain);
        source.start(0);
        return;
      }

      // Buffer not yet cached: trigger load & fallback to HTMLAudio / procedural tone
      this.loadAudioBuffer(targetUrl)
        .then((buf) => {
          if (buf && this.audioCtx) {
            // Buffer ready
          }
        })
        .catch(() => {});

      this.playAudioFile(targetUrl, volumeMultiplier * 100);
    } catch {}
  }

  playReactionSound(
    classification: MoveClassification,
    pack: MemeSoundPack = 'meme',
    volumePercent = 80
  ): void {
    const volMult = Math.max(0, Math.min(1, volumePercent / 100));
    this.playClassification(classification, volMult, pack);
  }

  playRandomPackSound(
    pack: MemeSoundPack = 'meme',
    volumePercent = 80
  ): void {
    if (this.isMuted()) {
      this.setMuted(false);
    }

    const volMult = Math.max(0, Math.min(1, volumePercent / 100));
    const classifications: MoveClassification[] = [
      'brilliant',
      'great',
      'best',
      'excellent',
      'good',
      'book',
      'inaccuracy',
      'mistake',
      'blunder',
      'miss',
    ];

    let targetPack = pack;
    if (targetPack === 'shuffle') {
      const availablePacks: Exclude<MemeSoundPack, 'shuffle'>[] = [
        'meme',
        'arcade',
        'cartoon',
        'classical',
      ];
      targetPack = availablePacks[Math.floor(Math.random() * availablePacks.length)];
    }

    const randomClassification =
      classifications[Math.floor(Math.random() * classifications.length)];

    this.playClassification(randomClassification, volMult, targetPack);
  }

  private selectRandomTrack(
    classification: MoveClassification,
    pack: Exclude<MemeSoundPack, 'shuffle'> = 'meme'
  ): SoundTrackInfo | null {
    const packPool = ALL_PACK_POOLS[pack] || MEME_POOLS;
    const pool = packPool[classification];
    if (!pool || pool.length === 0) return null;
    if (pool.length === 1) return pool[0];

    const lastUrl = this.lastPlayedUrlByClassification.get(classification);
    const candidates = pool.filter((track) => track.url !== lastUrl);
    const selected =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : pool[Math.floor(Math.random() * pool.length)];

    this.lastPlayedUrlByClassification.set(classification, selected.url);
    return selected;
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
      audio.play().catch(() => {});
    } catch {}
  }

  // --- PROCEDURAL AUDIO GENERATION PACKS ---

  private fallbackProceduralSynth(
    ctx: AudioContext,
    classification: MoveClassification,
    pack: MemeSoundPack,
    volMult: number
  ): void {
    if (pack === 'arcade') {
      this.synthArcadePack(ctx, classification, volMult);
    } else if (pack === 'cartoon') {
      this.synthCartoonPack(ctx, classification, volMult);
    } else if (pack === 'classical') {
      this.synthClassicalPack(ctx, classification, volMult);
    } else {
      this.synthProceduralMeme(ctx, classification, volMult);
    }
  }

  private synthArcadePack(
    ctx: AudioContext,
    classification: MoveClassification,
    volMult: number
  ): void {
    const now = ctx.currentTime;
    const vol = 0.32 * volMult;

    switch (classification) {
      case 'brilliant': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
        notes.forEach((freq, idx) => {
          this.synthSquare(ctx, now + idx * 0.05, freq, 0.08, vol * 0.75);
        });
        this.synthSquare(ctx, now + 0.35, 2093.0, 0.35, vol * 0.85);
        break;
      }
      case 'great':
        this.synthSquare(ctx, now, 987.77, 0.07, vol * 0.8);
        this.synthSquare(ctx, now + 0.07, 1318.51, 0.3, vol);
        break;

      case 'best':
        this.synthSquare(ctx, now, 1046.5, 0.06, vol * 0.8);
        this.synthSquare(ctx, now + 0.06, 1567.98, 0.25, vol);
        break;

      case 'excellent':
        this.synthSquare(ctx, now, 659.25, 0.06, vol * 0.75);
        this.synthSquare(ctx, now + 0.06, 880.0, 0.06, vol * 0.8);
        this.synthSquare(ctx, now + 0.12, 1174.66, 0.28, vol * 0.9);
        break;

      case 'good':
        this.synthSquare(ctx, now, 783.99, 0.05, vol * 0.75);
        this.synthSquare(ctx, now + 0.05, 1046.5, 0.15, vol * 0.8);
        break;

      case 'book':
        [440.0, 554.37, 659.25, 880.0].forEach((freq, idx) => {
          this.synthSquare(ctx, now + idx * 0.07, freq, 0.12, vol * 0.75);
        });
        break;

      case 'inaccuracy':
        this.synthSlide(ctx, now, 880, 220, 0.16, vol * 0.85);
        break;

      case 'mistake':
        this.synthSquare(ctx, now, 220.0, 0.09, vol * 0.95);
        this.synthSquare(ctx, now + 0.08, 146.83, 0.22, vol * 0.85);
        break;

      case 'blunder':
        this.synthSlide(ctx, now, 350, 50, 0.35, vol * 1.1);
        this.synthSubBoom(ctx, now, 140, 30, 0.45, vol * 1.2);
        break;

      case 'miss':
        this.synthSlide(ctx, now, 440, 110, 0.32, vol * 0.9);
        break;
    }
  }

  private synthCartoonPack(
    ctx: AudioContext,
    classification: MoveClassification,
    volMult: number
  ): void {
    const now = ctx.currentTime;
    const vol = 0.35 * volMult;

    switch (classification) {
      case 'brilliant':
        this.synthSlide(ctx, now, 523.25, 1567.98, 0.25, vol * 0.8);
        this.synthChime(ctx, now + 0.15, 1760.0, 0.4, vol * 0.9);
        this.synthChime(ctx, now + 0.25, 2093.0, 0.5, vol * 1.0);
        break;

      case 'great':
        this.synthSlide(ctx, now, 220, 780, 0.15, vol * 1.0);
        this.synthSlide(ctx, now + 0.12, 580, 980, 0.2, vol * 0.85);
        break;

      case 'best':
        this.synthWoodClick(ctx, now, 600, 150, 0.035, vol * 0.9);
        this.synthChime(ctx, now + 0.03, 1760.0, 0.4, vol);
        break;

      case 'excellent':
        this.synthChime(ctx, now, 1046.5, 0.4, vol * 0.85);
        this.synthChime(ctx, now + 0.08, 1318.51, 0.45, vol * 0.9);
        break;

      case 'good':
        this.synthWoodClick(ctx, now, 600, 180, 0.04, vol * 0.9);
        this.synthWoodClick(ctx, now + 0.02, 750, 200, 0.05, vol * 0.7);
        break;

      case 'book':
        this.synthSlide(ctx, now, 450, 1400, 0.35, vol * 0.9);
        this.synthChime(ctx, now + 0.32, 1760.0, 0.3, vol * 0.8);
        break;

      case 'inaccuracy':
        this.synthSlide(ctx, now, 850, 1500, 0.1, vol * 0.85);
        this.synthSlide(ctx, now + 0.1, 1500, 800, 0.12, vol * 0.85);
        break;

      case 'mistake':
        this.synthSlide(ctx, now, 1150, 280, 0.45, vol * 1.0);
        break;

      case 'blunder':
        this.synthSubBoom(ctx, now, 180, 40, 0.5, vol * 1.2);
        this.synthSlide(ctx, now + 0.1, 350, 120, 0.4, vol * 0.9);
        break;

      case 'miss':
        [415.3, 392.0, 369.99, 349.23].forEach((freq, idx) => {
          const start = now + idx * 0.22;
          const dur = idx === 3 ? 0.45 : 0.18;
          this.synthSlide(ctx, start, freq, freq - (idx === 3 ? 25 : 5), dur, vol * 0.85);
        });
        break;

      default:
        this.synthWoodClick(ctx, now, 480, 150, 0.05, vol);
    }
  }

  private synthClassicalPack(
    ctx: AudioContext,
    classification: MoveClassification,
    volMult: number
  ): void {
    const now = ctx.currentTime;
    const vol = 0.32 * volMult;

    switch (classification) {
      case 'brilliant':
        [261.63, 329.63, 392.0, 493.88, 587.33, 1046.5].forEach((freq, idx) => {
          this.synthChime(ctx, now + idx * 0.025, freq, 1.2, vol * (idx === 5 ? 0.9 : 0.75));
        });
        break;

      case 'great':
        this.synthChime(ctx, now, 523.25, 1.2, vol * 1.0);
        this.synthChime(ctx, now + 0.02, 783.99, 1.0, vol * 0.75);
        break;

      case 'best':
        this.synthChime(ctx, now, 880.0, 0.8, vol * 0.9);
        this.synthChime(ctx, now + 0.06, 1318.51, 0.9, vol * 0.85);
        break;

      case 'excellent':
        [392.0, 493.88, 587.33, 783.99].forEach((freq, idx) => {
          this.synthChime(ctx, now + idx * 0.035, freq, 0.9, vol * 0.8);
        });
        break;

      case 'good':
        this.synthChime(ctx, now, 392.0, 0.3, vol * 0.85);
        this.synthChime(ctx, now + 0.02, 784.0, 0.22, vol * 0.5);
        break;

      case 'book':
        [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
          this.synthChime(ctx, now + idx * 0.03, freq, 0.75, vol * 0.65);
        });
        break;

      case 'inaccuracy':
        this.synthChime(ctx, now, 440.0, 0.45, vol * 0.75);
        this.synthChime(ctx, now + 0.015, 466.16, 0.45, vol * 0.75);
        break;

      case 'mistake':
        this.synthSlide(ctx, now, 220.0, 196.0, 0.2, vol * 0.8);
        this.synthSlide(ctx, now + 0.18, 196.0, 164.81, 0.35, vol * 0.85);
        break;

      case 'blunder':
        this.synthSubBoom(ctx, now, 75, 30, 0.9, vol * 1.3);
        this.synthChime(ctx, now + 0.03, 146.83, 0.7, vol * 0.7);
        this.synthChime(ctx, now + 0.03, 174.61, 0.7, vol * 0.7);
        break;

      case 'miss':
        [220.0, 261.63, 329.63].forEach((freq, idx) => {
          this.synthChime(ctx, now + idx * 0.03, freq, 1.1, vol * 0.75);
        });
        break;

      default:
        this.synthWoodClick(ctx, now, 400, 100, 0.05, vol);
    }
  }

  private synthProceduralMeme(
    ctx: AudioContext,
    classification: MoveClassification,
    volMult: number
  ): void {
    const now = ctx.currentTime;
    const vol = 0.4 * volMult;

    switch (classification) {
      case 'blunder':
        this.synthSubBoom(ctx, now, 110, 30, 0.9, vol * 1.5);
        break;

      case 'brilliant':
        this.synthChime(ctx, now, 1046.5, 0.4, vol * 0.8);
        this.synthChime(ctx, now + 0.05, 1318.5, 0.4, vol * 0.8);
        this.synthChime(ctx, now + 0.1, 1567.98, 0.5, vol * 0.9);
        this.synthChime(ctx, now + 0.15, 2093.0, 0.6, vol * 1.0);
        break;

      case 'great':
        this.synthChime(ctx, now, 587.33, 0.25, vol);
        this.synthChime(ctx, now + 0.05, 880.0, 0.35, vol * 1.1);
        break;

      case 'best':
        this.synthChime(ctx, now, 1174.66, 0.45, vol * 1.2);
        break;

      case 'excellent':
        this.synthChime(ctx, now, 880.0, 0.2, vol * 0.9);
        this.synthChime(ctx, now + 0.08, 1318.5, 0.35, vol);
        break;

      case 'good':
        this.synthWoodClick(ctx, now, 500, 180, 0.04, vol * 0.8);
        break;

      case 'book':
        this.synthWoodClick(ctx, now, 350, 90, 0.04, vol * 0.7);
        this.synthChime(ctx, now + 0.03, 1046.5, 0.3, vol * 0.7);
        break;

      case 'inaccuracy':
        this.synthSlide(ctx, now, 420, 280, 0.25, vol * 0.8);
        break;

      case 'mistake':
        this.synthChime(ctx, now, 370.0, 0.35, vol);
        this.synthChime(ctx, now + 0.05, 523.25, 0.35, vol * 0.9);
        break;

      case 'miss':
        this.synthSlide(ctx, now, 340, 220, 0.45, vol);
        break;
    }
  }

  private synthSquare(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.registerActiveTrack(osc, gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private synthSubBoom(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.registerActiveTrack(osc, gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthSlide(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.linearRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.registerActiveTrack(osc, gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthWoodClick(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.registerActiveTrack(osc, gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private synthChime(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.registerActiveTrack(osc, gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}
