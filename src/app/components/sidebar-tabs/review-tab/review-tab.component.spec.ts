import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewTabComponent } from './review-tab.component';
import { ChessGameService } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';
import { OpeningBookService } from '../../../services/opening-book.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ReviewTabComponent', () => {
  let component: ReviewTabComponent;
  let fixture: ComponentFixture<ReviewTabComponent>;
  let gameService: ChessGameService;
  let analysisService: GameAnalysisService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewTabComponent],
      providers: [ChessGameService, GameAnalysisService, SettingsService, SoundService, OpeningBookService],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewTabComponent);
    component = fixture.componentInstance;
    gameService = TestBed.inject(ChessGameService);
    analysisService = TestBed.inject(GameAnalysisService);
  });

  it('should create ReviewTabComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should format accuracy properly', () => {
    expect(component.formatAccuracy(85.4)).toBe('85%');
    expect(component.formatAccuracy(null)).toBe('0%');
  });

  it('should render move pairs and timing when game has moves', () => {
    gameService.loadSampleGame('opera');
    fixture.detectChanges();

    const pairs = component.movePairs();
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0].whiteSan).toBe('e4');
    expect(pairs[0].blackSan).toBe('e5');
  });

  it('should provide coach explanation with classification when ply is selected', () => {
    gameService.loadSampleGame('opera');
    gameService.jumpToPly(0); // Move 1: e4
    fixture.detectChanges();

    const exp = component.currentExplanation();
    expect(exp).not.toBeNull();
    expect(exp?.san).toBe('e4');
  });

  it('should render variation rows and allow jumping to variation from review tab', () => {
    gameService.loadSampleGame('opera');
    gameService.jumpToPly(0); // after 1. e4
    // Make alternate move 1... c5
    gameService.move('c5');
    fixture.detectChanges();

    const pairs = component.movePairs();
    expect(pairs[0].variations.length).toBe(1);
    expect(pairs[0].variations[0].moves[0].san).toBe('c5');

    const pills = fixture.nativeElement.querySelectorAll('.variation-move-pill');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0].textContent).toContain('c5');

    // Click pill to jump
    component.jumpToVariation(pairs[0].variations[0].id, 0);
    expect(gameService.isVariationActive()).toBe(true);

    // Delete variation
    component.deleteVariation(pairs[0].variations[0].id);
    expect(gameService.isVariationActive()).toBe(false);
    expect(gameService.variations().length).toBe(0);
  });
});

