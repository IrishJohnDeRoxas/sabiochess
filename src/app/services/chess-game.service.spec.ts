import { TestBed } from '@angular/core/testing';
import { ChessGameService, SAMPLE_GAMES } from './chess-game.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ChessGameService', () => {
  let service: ChessGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChessGameService],
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
});
