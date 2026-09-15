import { TestBed } from '@angular/core/testing';
import { ChessGameService, SAMPLE_GAMES } from './chess-game.service';
import { SoundService } from './sound.service';
import { SettingsService } from './settings.service';
import { GameAnalysisService } from './game-analysis.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChessGameService', () => {
  let service: ChessGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChessGameService, SoundService, SettingsService, GameAnalysisService],
    });
    service = TestBed.inject(ChessGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with starting board position and default metadata', () => {
    expect(service.fen()).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(service.history().length).toBe(0);
    expect(service.currentPlyIndex()).toBeNull();
  });

  it('should reset board to starting position (ply -1) when loading PGN so game is not already finished', () => {
    const opera = SAMPLE_GAMES.find((g) => g.id === 'opera')!;
    const loaded = service.loadSampleGame(opera.id);

    expect(loaded).toBe(true);
    expect(service.history().length).toBe(33); // 33 plies in Opera Game
    // Crucial requirement: board starts at initial position (-1), ready to step through
    expect(service.currentPlyIndex()).toBe(-1);
    expect(service.fen()).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  });

  it('should accurately compute game outcome and winner when game is loaded', () => {
    const opera = SAMPLE_GAMES.find((g) => g.id === 'opera')!;
    service.loadSampleGame(opera.id);

    const outcome = service.gameOutcome();
    expect(outcome.isFinished).toBe(true);
    expect(outcome.winner).toBe('white');
    expect(outcome.loser).toBe('black');
    expect(outcome.whiteScore).toBe('1');
    expect(outcome.blackScore).toBe('0');
    expect(outcome.terminationType).toBe('checkmate');

    const whiteStatus = service.whiteOutcome();
    expect(whiteStatus.isWinner).toBe(true);
    expect(whiteStatus.reason).toBe('Won by checkmate');

    const blackStatus = service.blackOutcome();
    expect(blackStatus.isLoser).toBe(true);
    expect(blackStatus.reason).toBe('Checkmated');
  });

  it('should allow stepping forward and backward through plies', () => {
    service.loadSampleGame('opera');
    expect(service.currentPlyIndex()).toBe(-1);

    service.nextMove();
    expect(service.currentPlyIndex()).toBe(0);
    expect(service.history()[0].san).toBe('e4');

    service.nextMove();
    expect(service.currentPlyIndex()).toBe(1);
    expect(service.history()[1].san).toBe('e5');

    service.prevMove();
    expect(service.currentPlyIndex()).toBe(0);

    service.goToStart();
    expect(service.currentPlyIndex()).toBe(-1);

    service.goToEnd();
    expect(service.currentPlyIndex()).toBe(32);
    expect(service.history()[32].san).toBe('Rd8#');
  });

  it('should not show winner/loser outcome on player cards when at start or intermediate plies', () => {
    service.loadSampleGame('opera');
    // Board starts at ply -1 (start of game)
    expect(service.currentPlyIndex()).toBe(-1);
    expect(service.isAtFinalMove()).toBe(false);
    expect(service.bottomOutcome().isWinner).toBe(false);
    expect(service.topOutcome().isLoser).toBe(false);
    expect(service.bottomOutcome().score).toBeNull();

    // Step to move 1 (ply 0)
    service.jumpToPly(0);
    expect(service.isAtFinalMove()).toBe(false);
    expect(service.bottomOutcome().isWinner).toBe(false);
    expect(service.topOutcome().isLoser).toBe(false);

    // Jump to the final checkmate ply (ply 32)
    service.goToEnd();
    expect(service.isAtFinalMove()).toBe(true);
    expect(service.bottomOutcome().isWinner).toBe(true);
    expect(service.bottomOutcome().score).toBe('1');
    expect(service.topOutcome().isLoser).toBe(true);
    expect(service.topOutcome().score).toBe('0');
  });

  it('should have eval bar at zero (0.0) at the start of game and reset', () => {
    // Initial state
    expect(service.evalScore()).toBe(0.0);
    expect(service.evalFormatted()).toBe('0.0');
    expect(service.whiteAdvantagePercentage()).toBe(50);

    // After loading sample game (which starts at ply -1)
    service.loadSampleGame('opera');
    expect(service.currentPlyIndex()).toBe(-1);
    expect(service.evalScore()).toBe(0.0);
    expect(service.evalFormatted()).toBe('0.0');
    expect(service.whiteAdvantagePercentage()).toBe(50);

    // After resetting game
    service.resetGame();
    expect(service.evalScore()).toBe(0.0);
    expect(service.evalFormatted()).toBe('0.0');
    expect(service.whiteAdvantagePercentage()).toBe(50);
  });

  it('should update eval bar dynamically when navigating through plies', () => {
    service.loadSampleGame('opera');
    expect(service.evalFormatted()).toBe('0.0');

    // Move to end checkmate
    service.goToEnd();
    expect(service.isGameOver()).toBe(true);
    expect(service.evalFormatted()).toBe('#W');
    expect(service.whiteAdvantagePercentage()).toBe(100);

    // Step back to start
    service.goToStart();
    expect(service.evalFormatted()).toBe('0.0');
    expect(service.whiteAdvantagePercentage()).toBe(50);
  });

  it('should format evaluations without plus or minus signs and without negative numbers', () => {
    // When white is ahead by heuristic (e.g. after 1. e4)
    service.loadSampleGame('opera');
    service.jumpToPly(0);
    expect(service.evalFormatted()).not.toContain('+');
    expect(service.evalFormatted()).not.toContain('-');

    // Force heuristic evaluation with black lead (placed in Black segment)
    service.heuristicEvalScore.set(-2.4);
    expect(service.evalFormatted()).toBe('2.4');
    expect(service.evalScore()).toBe(-2.4);

    // Force heuristic evaluation with white lead (placed in White segment)
    service.heuristicEvalScore.set(1.8);
    expect(service.evalFormatted()).toBe('1.8');
    expect(service.evalScore()).toBe(1.8);
  });

  it('should take the whole eval bar when mate or M1 is showing', () => {
    // Checkmate on board (White wins) -> 100% White
    service.loadSampleGame('opera');
    service.goToEnd();
    expect(service.whiteAdvantagePercentage()).toBe(100);

    // Test heuristic forced mate states during active game ply
    service.jumpToPly(4);

    // Large advantage or White forced mate
    service.heuristicEvalScore.set(95);
    expect(service.whiteAdvantagePercentage()).toBe(100);

    // Black forced mate
    service.heuristicEvalScore.set(-95);
    expect(service.whiteAdvantagePercentage()).toBe(0);
  });

  it('should create an analysis variation branch without overwriting main line history', () => {
    service.move('e4');
    service.move('e5');
    service.undo();
    // Now we are at ply 0 (after e4). Main history has 2 elements (e4, e5).
    expect(service.currentPlyIndex()).toBe(0);
    expect(service.history().length).toBe(2);

    // Play an alternate move (out of order): c5 (Sicilian) instead of e5
    const success = service.move('c5');
    expect(success).toBe(true);

    // Main line history must NOT be overwritten!
    expect(service.history().length).toBe(2);
    expect(service.history()[0].san).toBe('e4');
    expect(service.history()[1].san).toBe('e5');

    // A variation branch should be active
    expect(service.variations().length).toBe(1);
    expect(service.isVariationActive()).toBe(true);
    expect(service.activeVariation()?.plyIndex).toBe(0);
    expect(service.lastMove()?.from).toBe('c7');
    expect(service.lastMove()?.to).toBe('c5');

    // Playing another move in the variation appends to the variation
    service.move('Nf3');
    expect(service.variations()[0].moves.length).toBe(2);
    expect(service.activeVariation()?.plyIndex).toBe(1);

    // Stepping back through variation with undo
    service.undo();
    expect(service.activeVariation()?.plyIndex).toBe(0);

    // Stepping back past the first variation move returns to main line parent ply
    service.undo();
    expect(service.isVariationActive()).toBe(false);
    expect(service.currentPlyIndex()).toBe(0);
    expect(service.lastMove()?.from).toBe('e2');
    expect(service.lastMove()?.to).toBe('e4');
  });

  it('should step forward on main line if user plays the same move that exists in history', () => {
    service.move('e4');
    service.move('e5');
    service.undo();
    expect(service.currentPlyIndex()).toBe(0);

    // Play e5 again (same move as recorded in main line)
    const success = service.move('e5');
    expect(success).toBe(true);
    expect(service.isVariationActive()).toBe(false);
    expect(service.currentPlyIndex()).toBe(1);
    expect(service.variations().length).toBe(0);
  });

  it('should navigate variations with firstPly and lastPly', () => {
    service.move('e4');
    service.move('e5');
    service.undo();
    service.move('c5');
    service.move('Nf3');
    service.move('d6');

    expect(service.isVariationActive()).toBe(true);
    expect(service.activeVariation()?.plyIndex).toBe(2);

    service.firstPly();
    expect(service.isVariationActive()).toBe(false);
    expect(service.currentPlyIndex()).toBe(0);

    // Re-enter variation
    service.jumpToVariation(service.variations()[0].id, 1);
    expect(service.isVariationActive()).toBe(true);
    expect(service.activeVariation()?.plyIndex).toBe(1);

    service.lastPly();
    expect(service.activeVariation()?.plyIndex).toBe(2);
  });

  it('should delete variation cleanly', () => {
    service.move('e4');
    service.move('e5');
    service.undo();
    service.move('c5');

    const varId = service.variations()[0].id;
    expect(service.isVariationActive()).toBe(true);

    service.deleteVariation(varId);
    expect(service.variations().length).toBe(0);
    expect(service.isVariationActive()).toBe(false);
    expect(service.currentPlyIndex()).toBe(0);
  });

  it('should play reaction sound when navigating to a classified move and memeSounds is enabled', () => {
    const soundService = TestBed.inject(SoundService);
    const soundSpy = vi.spyOn(soundService, 'playReactionSound');
    const settingsService = TestBed.inject(SettingsService);
    const analysisService = TestBed.inject(GameAnalysisService);

    settingsService.setMemeSounds(true);
    service.loadSampleGame('opera');

    // Mock analysis data for ply 0 and 1
    analysisService.movesAnalysis.set([
      { classification: 'book', plyIndex: 0 } as any,
      { classification: 'blunder', plyIndex: 1 } as any,
    ]);

    service.jumpToPly(0);
    expect(soundSpy).toHaveBeenCalledWith('book', 'meme', settingsService.volume());

    service.jumpToPly(1);
    expect(soundSpy).toHaveBeenCalledWith('blunder', 'meme', settingsService.volume());
  });

  it('should attach classification to the destination square of the last move in boardSquares', () => {
    const analysisService = TestBed.inject(GameAnalysisService);
    service.loadSampleGame('opera');

    // Mock analysis data
    analysisService.movesAnalysis.set([
      { classification: 'book', plyIndex: 0, from: 'e2', to: 'e4' } as any,
      { classification: 'best', plyIndex: 1, from: 'e7', to: 'e5' } as any,
    ]);

    // Ply 0: 1. e4 -> e4 should have book classification
    service.jumpToPly(0);
    const squaresPly0 = service.boardSquares();
    const e4Square = squaresPly0.find((s) => s.square === 'e4');
    const e2Square = squaresPly0.find((s) => s.square === 'e2');
    expect(e4Square?.classification).toBe('book');
    expect(e2Square?.classification).toBeUndefined();

    // Ply 1: 1... e5 -> e5 should have best classification
    service.jumpToPly(1);
    const squaresPly1 = service.boardSquares();
    const e5Square = squaresPly1.find((s) => s.square === 'e5');
    expect(e5Square?.classification).toBe('best');
  });
});

