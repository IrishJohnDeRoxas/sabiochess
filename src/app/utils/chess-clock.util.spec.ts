import { describe, it, expect } from 'vitest';
import {
  parseTimeControl,
  parseDuration,
  parseClockComment,
  formatClockTime,
  formatMoveDuration,
  computeGameHistoryTiming,
} from './chess-clock.util';

describe('chess-clock.util', () => {
  describe('parseTimeControl', () => {
    it('should parse standard single base time control', () => {
      expect(parseTimeControl('600')).toEqual({ baseSeconds: 600, incrementSeconds: 0 });
    });

    it('should parse base + increment time control', () => {
      expect(parseTimeControl('180+2')).toEqual({ baseSeconds: 180, incrementSeconds: 2 });
      expect(parseTimeControl('900+10')).toEqual({ baseSeconds: 900, incrementSeconds: 10 });
    });

    it('should parse moves/time format', () => {
      expect(parseTimeControl('40/7200:3600')).toEqual({ baseSeconds: 7200, incrementSeconds: 0 });
      expect(parseTimeControl('1/86400')).toEqual({ baseSeconds: 86400, incrementSeconds: 0 });
    });

    it('should handle undefined or unknown time control', () => {
      expect(parseTimeControl(undefined)).toEqual({ baseSeconds: undefined, incrementSeconds: 0 });
      expect(parseTimeControl('?')).toEqual({ baseSeconds: undefined, incrementSeconds: 0 });
    });
  });

  describe('parseDuration', () => {
    it('should parse H:MM:SS.s format', () => {
      expect(parseDuration('1:15:30')).toBe(4530);
    });

    it('should parse MM:SS.s format', () => {
      expect(parseDuration('09:58.4')).toBeCloseTo(598.4);
      expect(parseDuration('00:04')).toBe(4);
    });

    it('should parse single seconds format', () => {
      expect(parseDuration('14')).toBe(14);
    });
  });

  describe('parseClockComment', () => {
    it('should parse [%clk ...] comment', () => {
      const res = parseClockComment('[%clk 0:09:58.4]');
      expect(res).toEqual({ type: 'clk', seconds: 598.4, raw: '0:09:58.4' });
    });

    it('should parse [%emt ...] comment', () => {
      const res = parseClockComment('[%emt 0:00:04.2]');
      expect(res).toEqual({ type: 'emt', seconds: 4.2, raw: '0:00:04.2' });
    });

    it('should return null for non-clock comments', () => {
      expect(parseClockComment('A great move')).toBeNull();
      expect(parseClockComment(undefined)).toBeNull();
    });
  });

  describe('formatClockTime', () => {
    it('should format minutes and seconds', () => {
      expect(formatClockTime(600)).toBe('10:00');
      expect(formatClockTime(598)).toBe('09:58');
    });

    it('should format hours when > 3600', () => {
      expect(formatClockTime(3665)).toBe('1:01:05');
    });

    it('should format tenths when under 10 seconds', () => {
      expect(formatClockTime(8.4)).toBe('00:08.4');
    });
  });

  describe('formatMoveDuration', () => {
    it('should format tenths under 10s', () => {
      expect(formatMoveDuration(1.6)).toBe('1.6s');
      expect(formatMoveDuration(4.0)).toBe('4s');
    });

    it('should format integer seconds between 10s and 60s', () => {
      expect(formatMoveDuration(14)).toBe('14s');
    });

    it('should format minutes and seconds above 60s', () => {
      expect(formatMoveDuration(72)).toBe('1m 12s');
    });
  });

  describe('computeGameHistoryTiming', () => {
    it('should attach timing information to history records', () => {
      const history = [
        { san: 'e4', fen: 'fen_e4', turn: 'w' as const },
        { san: 'e5', fen: 'fen_e5', turn: 'b' as const },
      ];
      const comments = [
        { fen: 'fen_e4', comment: '[%clk 0:09:58]' },
        { fen: 'fen_e5', comment: '[%clk 0:09:55]' },
      ];

      const res = computeGameHistoryTiming(history, '600', comments);
      expect(res[0].clock).toBe('09:58');
      expect(res[0].moveTime).toBe(2);
      expect(res[0].formattedMoveTime).toBe('2s');

      expect(res[1].clock).toBe('09:55');
      expect(res[1].moveTime).toBe(5);
      expect(res[1].formattedMoveTime).toBe('5s');
    });
  });
});
