import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GameAnalysisService } from './game-analysis.service';
import { OpeningBookService } from './opening-book.service';
import { SettingsService } from './settings.service';

describe('GameAnalysisService', () => {
  let service: GameAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameAnalysisService, OpeningBookService, SettingsService],
    });
    service = TestBed.inject(GameAnalysisService);
  });

  it('should start with empty analysis state', () => {
    expect(service.movesAnalysis().length).toBe(0);
    expect(service.summary()).toBeNull();
    expect(service.isAnalyzing()).toBe(false);
  });

  it('should compute CAPS2 win probability properly', () => {
    // 0 cp should equal 50% win probability
    expect(service.evalToWinChance(0, null)).toBeCloseTo(50);
    // +400 cp advantage should give ~81% win probability
    expect(service.evalToWinChance(400, null)).toBeGreaterThan(75);
    // Mate for white = 100%, Mate for black = 0%
    expect(service.evalToWinChance(null, 1)).toBe(100);
    expect(service.evalToWinChance(null, -1)).toBe(0);
  });

  it('should compute CAPS2 move accuracy from win delta', () => {
    // Zero loss or best move = 100%
    expect(service.calculateCaps2Accuracy(0, true)).toBe(100);
    expect(service.calculateCaps2Accuracy(0, false)).toBe(100);
    // 10% deltaWin gives ~35% accuracy (mistake territory in Chess.com)
    const acc10 = service.calculateCaps2Accuracy(10, false);
    expect(acc10).toBeGreaterThan(25);
    expect(acc10).toBeLessThan(50);
  });

  it('should analyze a move history and compute summary accuracy with opening detection', async () => {
    const history = [
      { from: 'e2', to: 'e4', piece: 'p', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', turn: 'w' as const },
      { from: 'e7', to: 'e5', piece: 'p', san: 'e5', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', turn: 'b' as const },
      { from: 'g1', to: 'f3', piece: 'n', san: 'Nf3', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', turn: 'w' as const },
      { from: 'b8', to: 'c6', piece: 'n', san: 'Nc6', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', turn: 'b' as const },
    ];

    await service.runAnalysis(history, undefined, { white: 1800, black: 1750 });

    expect(service.movesAnalysis().length).toBe(4);
    const summary = service.summary();
    expect(summary).not.toBeNull();
    expect(summary?.whiteAccuracy).toBeGreaterThanOrEqual(80);
    expect(summary?.blackAccuracy).toBeGreaterThanOrEqual(80);
    expect(summary?.whitePerformanceRating).toBeGreaterThan(1000);
    expect(summary?.whitePerformanceRating).toBeLessThanOrEqual(3500);
    expect(summary?.blackPerformanceRating).toBeGreaterThan(1000);
    expect(summary?.blackPerformanceRating).toBeLessThanOrEqual(3500);
    expect(service.evalGraphPoints().length).toBe(4);
  });

  it('should handle playerRatings correctly and anchor estimated game rating', async () => {
    service.setPlayerRatings({ white: 2400, black: 2350 });
    expect(service.playerRatings().white).toBe(2400);
    expect(service.playerRatings().black).toBe(2350);
  });
});
