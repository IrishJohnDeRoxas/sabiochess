import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
    expect(service.memeSounds()).toBe(true);
    expect(service.memePack()).toBe('meme');
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

  it('should toggle sound options and persist volume', () => {
    service.setMoveSounds(false);
    expect(service.moveSounds()).toBe(false);

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
