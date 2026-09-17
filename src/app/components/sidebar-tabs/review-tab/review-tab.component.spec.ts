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

  it('should render variation rows and allow jumping to variation from review tab in walkthrough mode', () => {
    gameService.loadSampleGame('opera');
    component.startReviewWalkthrough();
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
    expect(component.isReportView()).toBe(false);

    // Verify explanation contains variation annotation details
    const exp = component.currentExplanation();
    expect(exp).not.toBeNull();
    expect(exp?.isVariation).toBe(true);
    expect(exp?.san).toBe('c5');
    expect(exp?.classification).toBeDefined();

    // Delete variation
    component.deleteVariation(pairs[0].variations[0].id);
    expect(gameService.isVariationActive()).toBe(false);
    expect(gameService.variations().length).toBe(0);
  });

  it('should auto-switch from report view to walkthrough mode when variation becomes active', () => {
    gameService.loadSampleGame('opera');
    fixture.detectChanges();
    expect(component.isReportView()).toBe(true);

    gameService.jumpToPly(0); // 1. e4
    gameService.move('d5'); // alternative move creates variation
    fixture.detectChanges();

    expect(gameService.isVariationActive()).toBe(true);
    expect(component.isReportView()).toBe(false);

    const exp = component.currentExplanation();
    expect(exp?.isVariation).toBe(true);
    expect(exp?.san).toBe('d5');
  });

  it('should render game report screen and transition to review walkthrough on start review', () => {
    gameService.loadSampleGame('opera');
    fixture.detectChanges();

    expect(component.isReportView()).toBe(true);
    const momentum = component.momentumData();
    expect(momentum).toBeTruthy();

    const classificationRows = component.reportClassificationRows();
    expect(classificationRows.length).toBe(7);
    expect(classificationRows[0].label).toBe('Brilliant Move');
    expect(classificationRows[1].label).toBe('Great Move');
    expect(classificationRows[2].label).toBe('Best Move');
    expect(classificationRows[3].label).toBe('Inaccuracy');
    expect(classificationRows[4].label).toBe('Mistake');
    expect(classificationRows[5].label).toBe('Miss');
    expect(classificationRows[6].label).toBe('Blunder');

    // Start Review
    component.startReviewWalkthrough();
    expect(component.isReportView()).toBe(false);

    // Return to Report
    component.returnToReport();
    expect(component.isReportView()).toBe(true);
  });

  it('should toggle sound menu and close on outside click or escape', () => {
    expect(component.isSoundMenuOpen()).toBe(false);

    component.toggleSoundMenu();
    expect(component.isSoundMenuOpen()).toBe(true);

    const outsideTarget = document.createElement('div');
    const mockEvent = { target: outsideTarget } as unknown as MouseEvent;
    component.onDocumentClick(mockEvent);
    expect(component.isSoundMenuOpen()).toBe(false);

    component.toggleSoundMenu();
    expect(component.isSoundMenuOpen()).toBe(true);
    component.onEscape();
    expect(component.isSoundMenuOpen()).toBe(false);
  });

  it('should jump to move on jumpFromMomentum and seekMomentum', () => {
    gameService.loadSampleGame('opera');
    fixture.detectChanges();

    component.jumpFromMomentum(3);
    expect(component.isReportView()).toBe(false);
    expect(gameService.currentPlyIndex()).toBe(2);

    const mockSvg = {
      getBoundingClientRect: () => ({ left: 0, width: 500, top: 0, height: 120 }),
    } as unknown as SVGElement;
    const mockEvent = {
      currentTarget: mockSvg,
      clientX: 50,
    } as unknown as MouseEvent;

    component.seekMomentum(mockEvent);
    expect(component.isReportView()).toBe(false);
    expect(gameService.currentPlyIndex()).toBeGreaterThanOrEqual(0);
  });

  it('should reset game and return to initial state when loadNewGame is called', () => {
    gameService.loadSampleGame('opera');
    fixture.detectChanges();
    expect(gameService.history().length).toBeGreaterThan(0);

    component.loadNewGame();
    fixture.detectChanges();

    expect(gameService.history().length).toBe(0);
    expect(component.isReportView()).toBe(true);
  });
});

