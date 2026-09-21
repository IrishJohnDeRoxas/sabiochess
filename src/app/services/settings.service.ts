import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  AppTheme,
  BOARD_THEMES,
  BoardTheme,
  CommentaryVoice,
  DEFAULT_SETTINGS,
  MemeSoundPack,
  UserSettings,
  VoiceEngine,
} from '../models/settings.model';
import { SoundService } from './sound.service';

const STORAGE_KEY = 'sabiochess_settings_v2';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly soundService = inject(SoundService);

  readonly appTheme = signal<AppTheme>(DEFAULT_SETTINGS.appTheme);
  readonly boardTheme = signal<BoardTheme>(DEFAULT_SETTINGS.boardTheme);
  readonly moveSounds = signal<boolean>(DEFAULT_SETTINGS.moveSounds);
  readonly memeSounds = signal<boolean>(DEFAULT_SETTINGS.memeSounds);
  readonly memePack = signal<MemeSoundPack>(DEFAULT_SETTINGS.memePack);
  readonly voiceCommentary = signal<boolean>(DEFAULT_SETTINGS.voiceCommentary);
  readonly voiceEngine = signal<VoiceEngine>(DEFAULT_SETTINGS.voiceEngine);
  readonly commentaryVoice = signal<CommentaryVoice>(DEFAULT_SETTINGS.commentaryVoice);
  readonly commentarySpeed = signal<number>(DEFAULT_SETTINGS.commentarySpeed);
  readonly volume = signal<number>(DEFAULT_SETTINGS.volume);
  readonly analysisDepth = signal<number>(DEFAULT_SETTINGS.analysisDepth);
  readonly autoEvaluation = signal<boolean>(DEFAULT_SETTINGS.autoEvaluation);
  readonly showEvalBar = signal<boolean>(DEFAULT_SETTINGS.showEvalBar);
  readonly showCandidateArrows = signal<boolean>(DEFAULT_SETTINGS.showCandidateArrows);
  readonly showCoordinates = signal<boolean>(DEFAULT_SETTINGS.showCoordinates);
  readonly showMoveClassifications = signal<boolean>(DEFAULT_SETTINGS.showMoveClassifications);
  readonly showLegalMoves = signal<boolean>(DEFAULT_SETTINGS.showLegalMoves);
  readonly highlightLastMove = signal<boolean>(DEFAULT_SETTINGS.highlightLastMove);
  readonly chesscomUsername = signal<string>(DEFAULT_SETTINGS.chesscomUsername);
  readonly lichessUsername = signal<string>(DEFAULT_SETTINGS.lichessUsername);
  readonly isSupporter = signal<boolean>(DEFAULT_SETTINGS.isSupporter);
  readonly isSupportModalOpen = signal<boolean>(false);

  readonly toastMessage = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isDarkMode = computed(() => this.appTheme() === 'dark');

  readonly activeBoardThemeOption = computed(() => {
    const id = this.boardTheme();
    return BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];
  });

  constructor() {
    this.loadSettings();

    // Effect to apply .dark class to HTML element
    effect(() => {
      const isDark = this.appTheme() === 'dark';
      if (typeof document !== 'undefined') {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });

    // Effect to persist to localStorage on changes
    effect(() => {
      const state: UserSettings = {
        appTheme: this.appTheme(),
        boardTheme: this.boardTheme(),
        moveSounds: this.moveSounds(),
        memeSounds: this.memeSounds(),
        memePack: this.memePack(),
        voiceCommentary: this.voiceCommentary(),
        voiceEngine: this.voiceEngine(),
        commentaryVoice: this.commentaryVoice(),
        commentarySpeed: this.commentarySpeed(),
        volume: this.volume(),
        analysisDepth: this.analysisDepth(),
        autoEvaluation: this.autoEvaluation(),
        showEvalBar: this.showEvalBar(),
        showCandidateArrows: this.showCandidateArrows(),
        showCoordinates: this.showCoordinates(),
        showMoveClassifications: this.showMoveClassifications(),
        showLegalMoves: this.showLegalMoves(),
        highlightLastMove: this.highlightLastMove(),
        chesscomUsername: this.chesscomUsername(),
        lichessUsername: this.lichessUsername(),
        isSupporter: this.isSupporter(),
      };
      this.saveSettings(state);
    });
  }

  setAppTheme(theme: AppTheme): void {
    this.appTheme.set(theme);
  }

  toggleAppTheme(): void {
    this.appTheme.update((t) => (t === 'dark' ? 'light' : 'dark'));
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

  setVoiceCommentary(enabled: boolean): void {
    this.voiceCommentary.set(enabled);
  }

  setVoiceEngine(engine: VoiceEngine): void {
    this.voiceEngine.set(engine);
  }

  setCommentaryVoice(voice: CommentaryVoice): void {
    this.commentaryVoice.set(voice);
  }

  setCommentarySpeed(speed: number): void {
    this.commentarySpeed.set(Math.max(0.7, Math.min(1.5, speed)));
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

  setShowEvalBar(show: boolean): void {
    this.showEvalBar.set(show);
  }

  setShowCandidateArrows(show: boolean): void {
    this.showCandidateArrows.set(show);
  }

  setShowCoordinates(show: boolean): void {
    this.showCoordinates.set(show);
  }

  setShowMoveClassifications(show: boolean): void {
    this.showMoveClassifications.set(show);
  }

  setShowLegalMoves(show: boolean): void {
    this.showLegalMoves.set(show);
  }

  setHighlightLastMove(highlight: boolean): void {
    this.highlightLastMove.set(highlight);
  }

  setChesscomUsername(name: string): void {
    this.chesscomUsername.set(name.trim());
  }

  setLichessUsername(name: string): void {
    this.lichessUsername.set(name.trim());
  }

  setSupporter(status: boolean): void {
    this.isSupporter.set(status);
  }

  unlockSupporter(code: string): boolean {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return false;

    // Accept common supporter codes, BMC IDs, or any code with length >= 4
    const validKeywords = ['SABIO', 'CHESS', 'COFFEE', 'SUPPORTER', 'PATRON', 'GRANDMASTER', 'DIAMOND', 'BMC'];
    const isKeyword = validKeywords.some((kw) => clean.includes(kw));
    const isValidId = clean.length >= 4;

    if (isKeyword || isValidId) {
      this.isSupporter.set(true);
      this.flashToast('👑 Supporter Perks Unlocked! Thank you for supporting SabioChess!', 3000);
      return true;
    }
    return false;
  }

  openSupportModal(): void {
    this.isSupportModalOpen.set(true);
  }

  closeSupportModal(): void {
    this.isSupportModalOpen.set(false);
  }

  resetToDefaults(): void {
    this.appTheme.set(DEFAULT_SETTINGS.appTheme);
    this.boardTheme.set(DEFAULT_SETTINGS.boardTheme);
    this.moveSounds.set(DEFAULT_SETTINGS.moveSounds);
    this.memeSounds.set(DEFAULT_SETTINGS.memeSounds);
    this.memePack.set(DEFAULT_SETTINGS.memePack);
    this.voiceCommentary.set(DEFAULT_SETTINGS.voiceCommentary);
    this.voiceEngine.set(DEFAULT_SETTINGS.voiceEngine);
    this.commentaryVoice.set(DEFAULT_SETTINGS.commentaryVoice);
    this.commentarySpeed.set(DEFAULT_SETTINGS.commentarySpeed);
    this.volume.set(DEFAULT_SETTINGS.volume);
    this.analysisDepth.set(DEFAULT_SETTINGS.analysisDepth);
    this.autoEvaluation.set(DEFAULT_SETTINGS.autoEvaluation);
    this.showEvalBar.set(DEFAULT_SETTINGS.showEvalBar);
    this.showCandidateArrows.set(DEFAULT_SETTINGS.showCandidateArrows);
    this.showCoordinates.set(DEFAULT_SETTINGS.showCoordinates);
    this.showMoveClassifications.set(DEFAULT_SETTINGS.showMoveClassifications);
    this.showLegalMoves.set(DEFAULT_SETTINGS.showLegalMoves);
    this.highlightLastMove.set(DEFAULT_SETTINGS.highlightLastMove);
    this.soundService.setMuted(false);
  }

  flashToast(msg: string, duration = 1800): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    if (this.toastMessage()) {
      this.toastMessage.set(null);
      setTimeout(() => {
        this.toastMessage.set(msg);
        this.toastTimer = setTimeout(() => {
          this.toastMessage.set(null);
          this.toastTimer = null;
        }, duration);
      }, 10);
      return;
    }
    this.toastMessage.set(msg);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
      this.toastTimer = null;
    }, duration);
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<UserSettings>;

      if (data.appTheme) this.appTheme.set(data.appTheme);
      if (data.boardTheme) this.boardTheme.set(data.boardTheme);
      if (typeof data.moveSounds === 'boolean') this.moveSounds.set(data.moveSounds);
      if (typeof data.memeSounds === 'boolean') this.memeSounds.set(data.memeSounds);
      if (data.memePack) this.memePack.set(data.memePack);
      if (typeof data.voiceCommentary === 'boolean') this.voiceCommentary.set(data.voiceCommentary);
      if (data.voiceEngine) this.voiceEngine.set(data.voiceEngine);
      if (data.commentaryVoice) this.commentaryVoice.set(data.commentaryVoice);
      if (typeof data.commentarySpeed === 'number') this.commentarySpeed.set(data.commentarySpeed);
      if (typeof data.volume === 'number') this.volume.set(data.volume);
      if (typeof data.analysisDepth === 'number') this.analysisDepth.set(data.analysisDepth);
      if (typeof data.autoEvaluation === 'boolean') this.autoEvaluation.set(data.autoEvaluation);
      if (typeof data.showEvalBar === 'boolean') this.showEvalBar.set(data.showEvalBar);
      if (typeof data.showCandidateArrows === 'boolean') this.showCandidateArrows.set(data.showCandidateArrows);
      if (typeof data.showCoordinates === 'boolean') this.showCoordinates.set(data.showCoordinates);
      if (typeof data.showMoveClassifications === 'boolean') this.showMoveClassifications.set(data.showMoveClassifications);
      if (typeof data.showLegalMoves === 'boolean') this.showLegalMoves.set(data.showLegalMoves);
      if (typeof data.highlightLastMove === 'boolean') this.highlightLastMove.set(data.highlightLastMove);
      if (data.chesscomUsername) this.chesscomUsername.set(data.chesscomUsername);
      if (data.lichessUsername) this.lichessUsername.set(data.lichessUsername);
      if (typeof data.isSupporter === 'boolean') this.isSupporter.set(data.isSupporter);
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
