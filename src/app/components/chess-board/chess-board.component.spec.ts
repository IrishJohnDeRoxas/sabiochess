import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChessBoardComponent } from './chess-board.component';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
import { GameAnalysisService } from '../../services/game-analysis.service';
import { SoundService } from '../../services/sound.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ChessBoardComponent', () => {
  let component: ChessBoardComponent;
  let fixture: ComponentFixture<ChessBoardComponent>;
  let gameService: ChessGameService;
  let analysisService: GameAnalysisService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChessBoardComponent],
      providers: [ChessGameService, SettingsService, GameAnalysisService, SoundService],
    }).compileComponents();

    fixture = TestBed.createComponent(ChessBoardComponent);
    component = fixture.componentInstance;
    gameService = TestBed.inject(ChessGameService);
    analysisService = TestBed.inject(GameAnalysisService);
    fixture.detectChanges();
  });

  it('should create ChessBoardComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render all 32 starting pieces as inline SVGs without external img requests', () => {
    const pieces = Array.from(fixture.nativeElement.querySelectorAll('app-chess-piece svg')) as SVGElement[];
    const externalImages = fixture.nativeElement.querySelectorAll('img');
    expect(pieces.length).toBe(32);
    expect(externalImages.length).toBe(0);
    expect(pieces.every((svg) => svg.children.length > 0)).toBe(true);
  });

  it('should render annotation badge when move classification is available', () => {
    gameService.loadSampleGame('opera');
    analysisService.movesAnalysis.set([
      { classification: 'book', plyIndex: 0, from: 'e2', to: 'e4' } as any,
    ]);

    gameService.jumpToPly(0);
    fixture.detectChanges();

    const annotationBadges = fixture.nativeElement.querySelectorAll('.square-annotation');
    expect(annotationBadges.length).toBe(1);
    expect(annotationBadges[0].classList.contains('badge-book')).toBe(true);
  });
});
