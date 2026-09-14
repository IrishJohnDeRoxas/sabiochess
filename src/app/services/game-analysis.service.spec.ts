import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GameAnalysisService } from './game-analysis.service';
import { OpeningBookService } from './opening-book.service';

describe('GameAnalysisService', () => {
  let service: GameAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameAnalysisService, OpeningBookService],
    });
    service = TestBed.inject(GameAnalysisService);
  });

  it('should start with empty analysis state', () => {
    expect(service.movesAnalysis().length).toBe(0);
    expect(service.summary()).toBeNull();
    expect(service.isAnalyzing()).toBe(false);
  });

  it('should analyze a short move history and compute summary accuracy', async () => {
    const history = [
      { from: 'e2', to: 'e4', piece: 'p', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', turn: 'w' as const },
      { from: 'e7', to: 'e5', piece: 'p', san: 'e5', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', turn: 'b' as const },
    ];

    await service.runAnalysis(history);

    expect(service.movesAnalysis().length).toBe(2);
    expect(service.summary()).not.toBeNull();
    expect(service.summary()?.whiteAccuracy).toBeGreaterThan(0);
    expect(service.summary()?.blackAccuracy).toBeGreaterThan(0);
    expect(service.evalGraphPoints().length).toBe(2);
  });
});
