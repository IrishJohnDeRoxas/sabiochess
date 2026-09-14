import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  BOARD_THEMES,
  BoardTheme,
  DEFAULT_SETTINGS,
  MemeSoundPack,
  UserSettings,
} from '../models/settings.model';
import { SoundService } from './sound.service';

const STORAGE_KEY = 'sabiochess_settings_v2';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly soundService = inject(SoundService);

  readonly boardTheme = signal<BoardTheme>(DEFAULT_SETTINGS.boardTheme);
  readonly moveSounds = signal<boolean>(DEFAULT_SETTINGS.moveSounds);
  readonly memeSounds = signal<boolean>(DEFAULT_SETTINGS.memeSounds);
  readonly memePack = signal<MemeSoundPack>(DEFAULT_SETTINGS.memePack);
  readonly volume = signal<number>(DEFAULT_SETTINGS.volume);
  readonly analysisDepth = signal<number>(DEFAULT_SETTINGS.analysisDepth);
  readonly autoEvaluation = signal<boolean>(DEFAULT_SETTINGS.autoEvaluation);
  readonly autoQueen = signal<boolean>(DEFAULT_SETTINGS.autoQueen);
  readonly showEvalBar = signal<boolean>(DEFAULT_SETTINGS.showEvalBar);
  readonly chesscomUsername = signal<string>(DEFAULT_SETTINGS.chesscomUsername);
  readonly lichessUsername = signal<string>(DEFAULT_SETTINGS.lichessUsername);

  readonly activeBoardThemeOption = computed(() => {
    const id = this.boardTheme();
    return BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];
  });

  constructor() {
    this.loadSettings();

    // Effect to persist to localStorage on changes
    effect(() => {
      const state: UserSettings = {
        boardTheme: this.boardTheme(),
        moveSounds: this.moveSounds(),
        memeSounds: this.memeSounds(),
        memePack: this.memePack(),
        volume: this.volume(),
        analysisDepth: this.analysisDepth(),
        autoEvaluation: this.autoEvaluation(),
        autoQueen: this.autoQueen(),
        showEvalBar: this.showEvalBar(),
        chesscomUsername: this.chesscomUsername(),
        lichessUsername: this.lichessUsername(),
      };
      this.saveSettings(state);
    });
  }

  setBoardTheme(theme: BoardTheme): void {
    this.boardTheme.set(theme);
  }

  setMoveSounds(enabled: boolean): void {
    this.moveSounds.set(enabled);
  }

  setMemeSounds(enabled: boolean): void {
    this.memeSounds.set(enabled);
  }

  setMemePack(pack: MemeSoundPack): void {
    this.memePack.set(pack);
  }

  setVolume(vol: number): void {
    this.volume.set(Math.max(0, Math.min(100, vol)));
  }

  setAnalysisDepth(depth: number): void {
    this.analysisDepth.set(Math.max(10, Math.min(22, depth)));
  }

  setAutoEvaluation(enabled: boolean): void {
    this.autoEvaluation.set(enabled);
  }

  setAutoQueen(enabled: boolean): void {
    this.autoQueen.set(enabled);
  }

  setShowEvalBar(show: boolean): void {
    this.showEvalBar.set(show);
  }

  setChesscomUsername(name: string): void {
    this.chesscomUsername.set(name.trim());
  }

  setLichessUsername(name: string): void {
    this.lichessUsername.set(name.trim());
  }

  resetToDefaults(): void {
    this.boardTheme.set(DEFAULT_SETTINGS.boardTheme);
    this.moveSounds.set(DEFAULT_SETTINGS.moveSounds);
    this.memeSounds.set(DEFAULT_SETTINGS.memeSounds);
    this.memePack.set(DEFAULT_SETTINGS.memePack);
    this.volume.set(DEFAULT_SETTINGS.volume);
    this.analysisDepth.set(DEFAULT_SETTINGS.analysisDepth);
    this.autoEvaluation.set(DEFAULT_SETTINGS.autoEvaluation);
    this.autoQueen.set(DEFAULT_SETTINGS.autoQueen);
    this.showEvalBar.set(DEFAULT_SETTINGS.showEvalBar);
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<UserSettings>;

      if (data.boardTheme) this.boardTheme.set(data.boardTheme);
      if (typeof data.moveSounds === 'boolean') this.moveSounds.set(data.moveSounds);
      if (typeof data.memeSounds === 'boolean') this.memeSounds.set(data.memeSounds);
      if (data.memePack) this.memePack.set(data.memePack);
      if (typeof data.volume === 'number') this.volume.set(data.volume);
      if (typeof data.analysisDepth === 'number') this.analysisDepth.set(data.analysisDepth);
      if (typeof data.autoEvaluation === 'boolean') this.autoEvaluation.set(data.autoEvaluation);
      if (typeof data.autoQueen === 'boolean') this.autoQueen.set(data.autoQueen);
      if (typeof data.showEvalBar === 'boolean') this.showEvalBar.set(data.showEvalBar);
      if (data.chesscomUsername) this.chesscomUsername.set(data.chesscomUsername);
      if (data.lichessUsername) this.lichessUsername.set(data.lichessUsername);
    } catch {
      // Ignore load error
    }
  }

  private saveSettings(state: UserSettings): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore save error
    }
  }
}
