import { Injectable, effect, inject, signal } from '@angular/core';
import { CommentaryVoice } from '../models/settings.model';
import { cleanCommentaryForSpeech } from '../utils/chess-speech.util';
import { SettingsService } from './settings.service';

export interface SupertonicProgressPayload {
  progress?: number;
  name?: string;
}

export interface SupertonicReadyPayload {
  device?: string;
}

export interface SupertonicAudioPayload {
  id: string | number;
  sampleRate: number;
  samples: Float32Array;
}

export interface SupertonicErrorPayload {
  message?: string;
}

export type SupertonicWorkerMessage =
  | { type: 'PROGRESS'; payload?: SupertonicProgressPayload }
  | { type: 'READY'; payload?: SupertonicReadyPayload }
  | { type: 'AUDIO'; payload: SupertonicAudioPayload }
  | { type: 'ERROR'; payload?: SupertonicErrorPayload };

@Injectable({
  providedIn: 'root',
})
export class VoiceCommentaryService {
  private readonly settingsService = inject(SettingsService);

  private worker: Worker | null = null;
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private activeRequestId = 0;
  private pendingSpeakPayload: {
    rawText: string;
    options?: {
      voice?: CommentaryVoice;
      speed?: number;
      force?: boolean;
      interrupt?: boolean;
    };
  } | null = null;

  readonly isModelReady = signal<boolean>(false);
  readonly isLoadingModel = signal<boolean>(false);
  readonly downloadProgress = signal<number>(0);
  readonly statusText = signal<string>('Not Initialized');
  readonly isSpeaking = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly lastError = signal<string | null>(null);

  constructor() {
    // If voice commentary is enabled on start, initialize model if neural engine selected
    effect(() => {
      const enabled = this.settingsService.voiceCommentary();
      const engine = this.settingsService.voiceEngine();
      if (enabled && engine === 'neural' && !this.isModelReady() && !this.isLoadingModel()) {
        this.initModel();
      }
    });
  }

  /**
   * Initializes the Supertonic TTS Web Worker and starts downloading model weights.
   */
  initModel(): void {
    if (this.isModelReady() || this.isLoadingModel()) return;

    if (typeof Worker === 'undefined') {
      this.lastError.set('Web Workers not supported in this environment');
      return;
    }

    this.isLoadingModel.set(true);
    this.statusText.set('Starting Supertonic Neural Engine...');
    this.lastError.set(null);

    try {
      if (!this.worker) {
        this.worker = new Worker(
          new URL('../workers/supertonic.worker', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (err) => {
          console.error('[VoiceCommentaryService] Worker error:', err);
          this.isLoadingModel.set(false);
          this.lastError.set('Web Worker initialization error');
        };
      }

      this.worker.postMessage({ type: 'INIT' });
    } catch (err: any) {
      console.error('[VoiceCommentaryService] Failed to spawn worker:', err);
      this.isLoadingModel.set(false);
      this.lastError.set(err?.message || 'Failed to spawn worker');
    }
  }

  /**
   * Speaks commentary or chess moves aloud using Supertonic TTS or native fallback.
   */
  speak(
    rawText: string,
    options: {
      voice?: CommentaryVoice;
      speed?: number;
      force?: boolean;
      interrupt?: boolean;
    } = {}
  ): void {
    const isEnabled = this.settingsService.voiceCommentary();
    if (!isEnabled && !options.force) {
      return;
    }

    const cleanedText = cleanCommentaryForSpeech(rawText);
    if (!cleanedText) return;

    // Interrupt prior speech if requested (default true for snappy UI response)
    if (options.interrupt !== false) {
      this.stop();
    }

    const engine = this.settingsService.voiceEngine();
    const voice = options.voice || this.settingsService.commentaryVoice();
    const speed = options.speed || this.settingsService.commentarySpeed();

    if (engine === 'instant') {
      this.speakNative(cleanedText, speed);
      return;
    }

    // Neural mode
    this.ensureAudioContext();

    if (!this.isModelReady()) {
      this.pendingSpeakPayload = { rawText, options };
      this.initModel();
      return;
    }

    const requestId = ++this.activeRequestId;
    this.isGenerating.set(true);

    this.worker?.postMessage({
      type: 'GENERATE',
      payload: {
        id: requestId.toString(),
        text: cleanedText,
        voice,
        speed,
      },
    });
  }

  /**
   * Plays a quick preview sentence to test selected voice and speed.
   */
  testVoice(voice?: CommentaryVoice): void {
    const targetVoice = voice || this.settingsService.commentaryVoice();
    const samplePhrases = [
      'Welcome to SabioChess. Brilliant move, sacrificing the queen for a checkmate net!',
      'Grandmaster commentary is active. Solid opening book preparation!',
      'Incredible strike! You broke through the defense with knight takes f7 check.',
    ];
    const phrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
    this.speak(phrase, { voice: targetVoice, force: true, interrupt: true });
  }

  /**
   * Stops current audio playback immediately and cancels pending generation.
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Ignore if already ended
      }
      this.currentSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.activeRequestId++;
    this.worker?.postMessage({ type: 'CANCEL' });
    this.isGenerating.set(false);
    this.isSpeaking.set(false);
  }

  private speakNative(text: string, speed: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.8, Math.min(1.4, speed));
    utterance.volume = Math.max(0, Math.min(1, this.settingsService.volume() / 100));

    utterance.onstart = () => {
      this.isSpeaking.set(true);
    };

    utterance.onend = () => {
      this.isSpeaking.set(false);
    };

    utterance.onerror = () => {
      this.isSpeaking.set(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  private handleWorkerMessage(data: SupertonicWorkerMessage | null | undefined): void {
    const { type, payload } = data || {};

    switch (type) {
      case 'PROGRESS': {
        const progress = Math.round((payload?.progress ?? 0) * 100);
        this.downloadProgress.set(progress);
        const name = payload?.name ? ` (${payload.name})` : '';
        this.statusText.set(`Downloading Supertonic model... ${progress}%${name}`);
        break;
      }

      case 'READY': {
        this.isModelReady.set(true);
        this.isLoadingModel.set(false);
        this.downloadProgress.set(100);
        const dev = payload?.device === 'webgpu' ? ' (WebGPU Accelerated)' : ' (WASM)';
        this.statusText.set(`Supertonic 2 Neural Voice Ready${dev}`);

        if (this.pendingSpeakPayload) {
          const { rawText, options } = this.pendingSpeakPayload;
          this.pendingSpeakPayload = null;
          this.speak(rawText, options);
        }
        break;
      }

      case 'AUDIO': {
        const { id, sampleRate, samples } = payload || {};
        this.isGenerating.set(false);
        if (id === undefined || parseInt(String(id), 10) !== this.activeRequestId) {
          // Stale audio request from previous move
          return;
        }
        if (samples && sampleRate) {
          this.playAudioSamples(samples, sampleRate);
        }
        break;
      }

      case 'ERROR': {
        this.isLoadingModel.set(false);
        this.isGenerating.set(false);
        this.isSpeaking.set(false);
        this.lastError.set(payload?.message || 'TTS Error');
        break;
      }
    }
  }

  private async playAudioSamples(samples: Float32Array, sampleRate: number): Promise<void> {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const volumePercent = this.settingsService.volume();
      if (volumePercent <= 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, samples.length, sampleRate);
      audioBuffer.getChannelData(0).set(samples);

      const sourceNode = this.audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;

      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = volumePercent / 100;

      sourceNode.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      this.currentSource = sourceNode;
      this.isSpeaking.set(true);

      sourceNode.onended = () => {
        if (this.currentSource === sourceNode) {
          this.currentSource = null;
          this.isSpeaking.set(false);
        }
      };

      sourceNode.start(0);
    } catch (err) {
      console.error('[VoiceCommentaryService] Audio playback failed:', err);
      this.isSpeaking.set(false);
    }
  }

  private ensureAudioContext(): void {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
  }
}
