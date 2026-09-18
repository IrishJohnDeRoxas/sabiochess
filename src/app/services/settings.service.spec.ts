import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SettingsService],
    });
    service = TestBed.inject(SettingsService);
  });

  it('should initialize with default settings', () => {
    expect(service.appTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
    expect(service.boardTheme()).toBe('green');
    expect(service.moveSounds()).toBe(true);
    expect(service.memeSounds()).toBe(false);
    expect(service.memePack()).toBe('meme');
    expect(service.voiceCommentary()).toBe(false);
    expect(service.voiceEngine()).toBe('neural');
    expect(service.commentaryVoice()).toBe('F1');
    expect(service.analysisDepth()).toBe(14);
    expect(service.showCoordinates()).toBe(true);
    expect(service.showMoveClassifications()).toBe(true);
    expect(service.showLegalMoves()).toBe(true);
    expect(service.highlightLastMove()).toBe(true);
  });

  it('should toggle board visual preferences', () => {
    service.setShowCoordinates(false);
    expect(service.showCoordinates()).toBe(false);

    service.setShowMoveClassifications(false);
    expect(service.showMoveClassifications()).toBe(false);

    service.setShowLegalMoves(false);
    expect(service.showLegalMoves()).toBe(false);

    service.setHighlightLastMove(false);
    expect(service.highlightLastMove()).toBe(false);
  });

  it('should update app theme and toggle dark mode', () => {
    service.setAppTheme('dark');
    expect(service.appTheme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);

    service.toggleAppTheme();
    expect(service.appTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('should update board theme and return corresponding theme option', () => {
    service.setBoardTheme('wood');
    expect(service.boardTheme()).toBe('wood');
    expect(service.activeBoardThemeOption().name).toBe('Classic Wood');
  });

  it('should toggle sound and voice options', () => {
    service.setMoveSounds(false);
    expect(service.moveSounds()).toBe(false);

    service.setVoiceCommentary(true);
    expect(service.voiceCommentary()).toBe(true);

    service.setVoiceEngine('instant');
    expect(service.voiceEngine()).toBe('instant');

    service.setCommentaryVoice('M1');
    expect(service.commentaryVoice()).toBe('M1');

    service.setCommentarySpeed(1.2);
    expect(service.commentarySpeed()).toBe(1.2);

    service.setVolume(50);
    expect(service.volume()).toBe(50);
  });

  it('should clamp analysis depth within 10 to 22', () => {
    service.setAnalysisDepth(5);
    expect(service.analysisDepth()).toBe(10);

    service.setAnalysisDepth(25);
    expect(service.analysisDepth()).toBe(22);

    service.setAnalysisDepth(16);
    expect(service.analysisDepth()).toBe(16);
  });

  it('should flash toast message and reset after duration', () => {
    service.flashToast('TEST MESSAGE', 1000);
    expect(service.toastMessage()).toBe('TEST MESSAGE');
  });
});
