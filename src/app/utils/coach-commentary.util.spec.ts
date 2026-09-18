import { describe, it, expect } from 'vitest';
import { getCoachCommentary, formatFriendlyMove } from './coach-commentary.util';

describe('coach-commentary.util', () => {
  describe('formatFriendlyMove', () => {
    it('should format castling correctly', () => {
      expect(formatFriendlyMove('O-O')).toBe('Castling kingside (O-O)');
      expect(formatFriendlyMove('O-O-O')).toBe('Castling queenside (O-O-O)');
    });

    it('should return raw SAN for regular moves', () => {
      expect(formatFriendlyMove('Nf3')).toBe('Nf3');
      expect(formatFriendlyMove('e4')).toBe('e4');
    });
  });

  describe('getCoachCommentary', () => {
    it('should produce checkmate commentary', () => {
      const commentary = getCoachCommentary('best', 'Qxf7#', null, 25);
      expect(commentary).toMatch(/Checkmate|Game over/i);
    });

    it('should produce opening book commentary with opening name', () => {
      const commentary = getCoachCommentary('book', 'e4', null, 0, "King's Pawn Opening");
      expect(commentary).toContain("King's Pawn Opening");
    });

    it('should react to previous check by describing check parry or capture', () => {
      const commentary = getCoachCommentary('best', 'Bxf7', null, 15, null, {
        prevMoveSan: 'Nf7+',
      });
      expect(commentary).toMatch(/checking piece|threat|check/i);
    });

    it('should recognize immediate recapture when previous move was capture', () => {
      const commentary = getCoachCommentary('best', 'exd5', null, 10, null, {
        prevMoveSan: 'exd5',
      });
      expect(commentary).toMatch(/recapture|takes back|pawn/i);
    });

    it('should recognize punishing an opponent blunder', () => {
      const commentary = getCoachCommentary('best', 'Qxe5', null, 20, null, {
        prevMoveSan: 'f6',
        prevClassification: 'blunder',
      });
      expect(commentary).toMatch(/punish|misstep|pounce|slip|capitaliz/i);
    });

    it('should generate realistic knight outpost commentary', () => {
      const commentary = getCoachCommentary('best', 'Nd5', null, 18);
      expect(commentary).toMatch(/outpost|d5/i);
    });

    it('should generate realistic bishop fianchetto commentary', () => {
      const commentary = getCoachCommentary('best', 'Bg2', null, 4);
      expect(commentary).toMatch(/fianchetto|g2|diagonal/i);
    });

    it('should generate realistic rook 7th rank infiltration commentary', () => {
      const commentary = getCoachCommentary('best', 'Rd7', null, 28);
      expect(commentary).toMatch(/7th rank|d7|second rank|pigs/i);
    });

    it('should generate realistic endgame king activation commentary', () => {
      const commentary = getCoachCommentary('best', 'Ke4', null, 44);
      expect(commentary).toMatch(/king|endgame|passed pawn|opposition/i);
    });

    it('should include friendly best move recommendation on mistakes and blunders', () => {
      const mistakeComment = getCoachCommentary('mistake', 'f3', 'Nf3', 8);
      expect(mistakeComment).toContain('Nf3');

      const blunderComment = getCoachCommentary('blunder', 'g4', 'O-O', 12);
      expect(blunderComment).toContain('Castling kingside (O-O)');
    });

    it('should stay deterministic for identical inputs and plies', () => {
      const c1 = getCoachCommentary('best', 'Nf3', null, 2);
      const c2 = getCoachCommentary('best', 'Nf3', null, 2);
      expect(c1).toBe(c2);
    });
  });
});
