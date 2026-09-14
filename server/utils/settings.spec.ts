import { describe, it, expect } from 'vitest';
import {
  extractUserSettings,
  validateAndSanitizeSettings,
  validateAnalysisDepth,
  isProUser,
  DEFAULT_APP_THEME,
  DEFAULT_BOARD_THEME,
  DEFAULT_MOVE_SOUNDS,
  DEFAULT_ANALYSIS_DEPTH,
} from './settings';

describe('Settings Utils (server/utils/settings.ts)', () => {
  describe('isProUser', () => {
    it('returns true for lifetime or pro tiers', () => {
      expect(isProUser('lifetime')).toBe(true);
      expect(isProUser('pro')).toBe(true);
    });

    it('returns false for free tier or undefined/null', () => {
      expect(isProUser('free')).toBe(false);
      expect(isProUser(null)).toBe(false);
      expect(isProUser(undefined)).toBe(false);
    });
  });

  describe('validateAnalysisDepth', () => {
    it('caps free tier depth to max 22', () => {
      const result = validateAnalysisDepth('free', 25);
      expect(result.valid).toBe(true);
      expect(result.depth).toBe(22);
      expect(result.maxAllowed).toBe(22);
    });

    it('allows depth up to 22 for lifetime tier', () => {
      const result = validateAnalysisDepth('lifetime', 22);
      expect(result.valid).toBe(true);
      expect(result.depth).toBe(22);
      expect(result.maxAllowed).toBe(22);
    });

    it('clamps depth to minimum 10', () => {
      const result = validateAnalysisDepth('lifetime', 5);
      expect(result.valid).toBe(true);
      expect(result.depth).toBe(10);
    });

    it('returns invalid on non-number inputs', () => {
      const result = validateAnalysisDepth('free', 'invalid' as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('extractUserSettings', () => {
    it('extracts settings when user has complete settings', () => {
      const settings = extractUserSettings({
        appTheme: 'light',
        boardTheme: 'wood',
        moveSounds: false,
        analysisDepth: 20,
        chesscomUsername: 'hikaru',
      } as any);

      expect(settings).toEqual({
        appTheme: 'light',
        boardTheme: 'wood',
        moveSounds: false,
        analysisDepth: 20,
        chesscomUsername: 'hikaru',
      });
    });

    it('falls back to defaults when user is empty or fields are missing', () => {
      const settings = extractUserSettings(null);

      expect(settings).toEqual({
        appTheme: DEFAULT_APP_THEME,
        boardTheme: DEFAULT_BOARD_THEME,
        moveSounds: DEFAULT_MOVE_SOUNDS,
        analysisDepth: DEFAULT_ANALYSIS_DEPTH,
        chesscomUsername: null,
      });
    });
  });

  describe('validateAndSanitizeSettings', () => {
    const freeUser = { tier: 'free' };
    const lifetimeUser = { tier: 'lifetime' };

    it('rejects non-object body', () => {
      const res = validateAndSanitizeSettings(freeUser, null);
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.statusCode).toBe(400);
      }
    });

    it('rejects invalid appTheme', () => {
      const res = validateAndSanitizeSettings(freeUser, { appTheme: 'neon' });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.statusCode).toBe(400);
      }
    });

    it('allows free user to set green board theme', () => {
      const res = validateAndSanitizeSettings(freeUser, { boardTheme: 'green' });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.boardTheme).toBe('green');
      }
    });

    it('allows free user to set non-green board themes (slate, ocean, wood)', () => {
      const res = validateAndSanitizeSettings(freeUser, { boardTheme: 'slate' });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.boardTheme).toBe('slate');
      }
    });

    it('rejects invalid board themes with 400', () => {
      const res = validateAndSanitizeSettings(freeUser, { boardTheme: 'invalid-theme' });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.statusCode).toBe(400);
      }
    });

    it('allows lifetime user to set board themes', () => {
      const res = validateAndSanitizeSettings(lifetimeUser, { boardTheme: 'wood' });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.boardTheme).toBe('wood');
      }
    });

    it('caps analysisDepth to 22 for free user', () => {
      const res = validateAndSanitizeSettings(freeUser, { analysisDepth: 28 });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.analysisDepth).toBe(22);
      }
    });

    it('allows analysisDepth up to 22 for lifetime user', () => {
      const res = validateAndSanitizeSettings(lifetimeUser, { analysisDepth: 22 });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.analysisDepth).toBe(22);
      }
    });

    it('validates moveSounds boolean', () => {
      const validRes = validateAndSanitizeSettings(freeUser, { moveSounds: false });
      expect(validRes.valid).toBe(true);

      const invalidRes = validateAndSanitizeSettings(freeUser, { moveSounds: 'yes' });
      expect(invalidRes.valid).toBe(false);
      if (!invalidRes.valid) {
        expect(invalidRes.statusCode).toBe(400);
      }
    });

    it('validates and trims chesscomUsername string or null', () => {
      const validRes = validateAndSanitizeSettings(freeUser, { chesscomUsername: '  magnuscarlsen  ' });
      expect(validRes.valid).toBe(true);
      if (validRes.valid) {
        expect(validRes.settings.chesscomUsername).toBe('magnuscarlsen');
      }

      const emptyRes = validateAndSanitizeSettings(freeUser, { chesscomUsername: '' });
      expect(emptyRes.valid).toBe(true);
      if (emptyRes.valid) {
        expect(emptyRes.settings.chesscomUsername).toBeNull();
      }

      const nullRes = validateAndSanitizeSettings(freeUser, { chesscomUsername: null });
      expect(nullRes.valid).toBe(true);
      if (nullRes.valid) {
        expect(nullRes.settings.chesscomUsername).toBeNull();
      }

      const invalidTypeRes = validateAndSanitizeSettings(freeUser, { chesscomUsername: 12345 });
      expect(invalidTypeRes.valid).toBe(false);
      if (!invalidTypeRes.valid) {
        expect(invalidTypeRes.statusCode).toBe(400);
      }
    });

    it('supports nested settings object format { settings: { ... } }', () => {
      const res = validateAndSanitizeSettings(freeUser, {
        settings: {
          appTheme: 'light',
          moveSounds: true,
          chesscomUsername: 'gothamchess',
        },
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.settings.appTheme).toBe('light');
        expect(res.settings.moveSounds).toBe(true);
        expect(res.settings.chesscomUsername).toBe('gothamchess');
      }
    });
  });
});
