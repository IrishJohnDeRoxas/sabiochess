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

  it('should not award brilliant to quiet King moves', () => {
    const fenBefore = 'r6r/pk1qR1pp/3P4/2p4p/5Bn1/2Q5/PPP2PPP/4R1K1 w - - 0 25';
    const fenAfter = 'r6r/pk1qR1pp/3P4/2p4p/5Bn1/2Q5/PPP2PPP/4R1K1 b - - 1 25';
    // Access private methods for test verification
    const svc = service as any;
    const isSacrifice = svc.isSacrificeMove(fenBefore, fenAfter, 'g1', 'g1', 'k', undefined);
    expect(isSacrifice).toBe(false);

    const classification = svc.classifyMove(0, 250, true, 90, isSacrifice, 90);
    expect(classification).toBe('best');
  });

  it('should not treat defended normal piece trades as sacrifices', () => {
    const svc = service as any;
    // Position where White plays Nxd4 capturing on d4 with Queen defending d4
    const fenBefore = 'r1bqkbnr/pppp1ppp/2n5/4p3/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 3';
    const fenAfter = 'r1bqkbnr/pppp1ppp/2n5/4p3/3N4/8/PPP1PPPP/RNBQKB1R b KQkq - 0 3';
    const isSacrifice = svc.isSacrificeMove(fenBefore, fenAfter, 'f3', 'd4', 'n', 'p');
    expect(isSacrifice).toBe(false);

    const classification = svc.classifyMove(0, 0, true, 50, isSacrifice, 50);
    expect(classification).toBe('best');
  });

  it('should award brilliant to a genuine piece sacrifice that maintains a win', () => {
    const svc = service as any;
    // Classical Greek Gift or bishop sacrifice on f7
    const fenBefore = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5';
    // Bxf7+
    const fenAfter = 'r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 5';
    const isSacrifice = svc.isSacrificeMove(fenBefore, fenAfter, 'c4', 'f7', 'b', 'p');
    expect(isSacrifice).toBe(true);

    const classification = svc.classifyMove(0, 200, true, 60, isSacrifice, 70, 100);
    expect(classification).toBe('brilliant');
  });

  it('should not award brilliant in overwhelming blowout positions', () => {
    const svc = service as any;
    // Up 98% win chance / +900 cp, sacrificing a piece is not a brilliancy
    const classification = svc.classifyMove(0, -50, true, 98, true, 96, 900);
    expect(classification).toBe('best');
  });
});

