import { describe, it, expect } from 'vitest';
import { computeGameOutcome, getPlayerOutcomeStatus } from './chess-outcome.util';

describe('chess-outcome.util', () => {
  describe('computeGameOutcome', () => {
    it('should compute white win by checkmate', () => {
      const outcome = computeGameOutcome(
        { result: '1-0', termination: 'Won by checkmate' },
        [{ san: 'Rd8#', fen: 'r1bk3r/ppp2ppp/8/8/8/8/PPP2PPP/RNBQKBNR w KQ - 0 1', turn: 'w' }]
      );

      expect(outcome.isFinished).toBe(true);
      expect(outcome.winner).toBe('white');
      expect(outcome.loser).toBe('black');
      expect(outcome.whiteScore).toBe('1');
      expect(outcome.blackScore).toBe('0');
      expect(outcome.terminationType).toBe('checkmate');
    });

    it('should compute black win by resignation', () => {
      const outcome = computeGameOutcome(
        { result: '0-1' },
        [{ san: 'Nxd1', fen: 'r1b1k2r/ppp2ppp/8/8/8/8/PPP2PPP/RN1qKBNR w KQkq - 0 1', turn: 'b' }]
      );

      expect(outcome.isFinished).toBe(true);
      expect(outcome.winner).toBe('black');
      expect(outcome.loser).toBe('white');
      expect(outcome.whiteScore).toBe('0');
      expect(outcome.blackScore).toBe('1');
    });

    it('should compute draw by stalemate / agreement', () => {
      const outcome = computeGameOutcome(
        { result: '1/2-1/2' },
        []
      );

      expect(outcome.isFinished).toBe(true);
      expect(outcome.isDraw).toBe(true);
      expect(outcome.whiteScore).toBe('½');
      expect(outcome.blackScore).toBe('½');
    });
  });

  describe('getPlayerOutcomeStatus', () => {
    it('should provide correct winner and loser pills', () => {
      const outcome = computeGameOutcome(
        { result: '1-0', termination: 'Won by checkmate' },
        [{ san: 'Qh7#', fen: '8/8/8/8/8/8/8/8 w - - 0 1', turn: 'w' }]
      );

      const whiteStatus = getPlayerOutcomeStatus(outcome, 'white');
      expect(whiteStatus.isWinner).toBe(true);
      expect(whiteStatus.score).toBe('1');
      expect(whiteStatus.reason).toBe('Won by checkmate');

      const blackStatus = getPlayerOutcomeStatus(outcome, 'black');
      expect(blackStatus.isLoser).toBe(true);
      expect(blackStatus.score).toBe('0');
      expect(blackStatus.reason).toBe('Checkmated');
    });
  });
});
