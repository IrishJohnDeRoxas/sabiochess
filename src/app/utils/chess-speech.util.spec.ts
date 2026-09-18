import { describe, it, expect } from 'vitest';
import { formatSanForSpeech, cleanCommentaryForSpeech } from './chess-speech.util';

describe('chess-speech.util', () => {
  describe('formatSanForSpeech', () => {
    it('should format simple pawn moves', () => {
      expect(formatSanForSpeech('e4')).toBe('e4');
      expect(formatSanForSpeech('d5')).toBe('d5');
    });

    it('should format piece moves', () => {
      expect(formatSanForSpeech('Nf3')).toBe('Knight to f3');
      expect(formatSanForSpeech('Bc4')).toBe('Bishop to c4');
      expect(formatSanForSpeech('Qh5')).toBe('Queen to h5');
    });

    it('should format captures', () => {
      expect(formatSanForSpeech('exd5')).toBe('e takes d5');
      expect(formatSanForSpeech('Nxf7+')).toBe('Knight takes f7, check');
      expect(formatSanForSpeech('Qxh7#')).toBe('Queen takes h7, checkmate');
    });

    it('should format castling', () => {
      expect(formatSanForSpeech('O-O')).toBe('Kingside castling');
      expect(formatSanForSpeech('O-O-O')).toBe('Queenside castling');
    });

    it('should format promotions', () => {
      expect(formatSanForSpeech('e8=Q#')).toBe('e8 promotes to Queen, checkmate');
      expect(formatSanForSpeech('cxd8=N')).toBe('c takes d8 promotes to Knight');
    });
  });

  describe('cleanCommentaryForSpeech', () => {
    it('should remove markdown and format evaluations', () => {
      const input = '**Brilliant move!** Nf3 develops with +1.5 advantage.';
      const output = cleanCommentaryForSpeech(input);
      expect(output).toContain('Brilliant move!');
      expect(output).toContain('Knight to f3');
      expect(output).toContain('plus 1.5');
    });

    it('should handle mate evaluations', () => {
      const input = 'Forced mate sequence: #+3 for white.';
      const output = cleanCommentaryForSpeech(input);
      expect(output).toContain('mate in 3 for white');
    });
  });
});
