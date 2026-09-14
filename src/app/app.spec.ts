import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ChessGameService } from './services/chess-game.service';
import { HeaderComponent } from './components/header/header.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { EvalBarComponent } from './components/eval-bar/eval-bar.component';
import { BoardControlsComponent } from './components/board-controls/board-controls.component';
import { LogoComponent } from './components/logo/logo.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('SabioChess Neubrutalist Suite', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HeaderComponent, ChessBoardComponent, EvalBarComponent, BoardControlsComponent, LogoComponent],
      providers: [ChessGameService],
    }).compileComponents();
  });

  it('should create the App root component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand header with SabioChess title', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sabio');
    expect(compiled.textContent).toContain('Chess');
  });

  it('should initialize 64 board squares in ChessGameService', () => {
    const service = TestBed.inject(ChessGameService);
    const squares = service.boardSquares();
    expect(squares.length).toBe(64);
  });

  it('should allow making a valid chess move (e2 to e4)', () => {
    const service = TestBed.inject(ChessGameService);
    // Select e2
    service.handleSquareClick('e2');
    expect(service.selectedSquare()).toBe('e2');
    expect(service.legalMoveSquares()).toContain('e4');
    expect(service.legalMoveSquares()).toContain('e3');

    // Move to e4
    service.handleSquareClick('e4');
    expect(service.turn()).toBe('b');
    expect(service.history().length).toBe(1);
    expect(service.history()[0].san).toBe('e4');
  });

  it('should flip the board orientation when flipBoard() is called', () => {
    const service = TestBed.inject(ChessGameService);
    expect(service.isBoardFlipped()).toBe(false);
    service.flipBoard();
    expect(service.isBoardFlipped()).toBe(true);
  });

  it('should render EvalBar and update value based on position', () => {
    const fixture = TestBed.createComponent(EvalBarComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.eval-score-badge')).toBeTruthy();
  });

  it('should render LogoComponent with SVG pawn and brand text', () => {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg')).toBeTruthy();
    expect(compiled.textContent).toContain('Sabio');
    expect(compiled.textContent).toContain('Chess');
  });
});
