import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisTabComponent } from './analysis-tab.component';
import { ChessGameService } from '../../../services/chess-game.service';
import { GameAnalysisService } from '../../../services/game-analysis.service';
import { SettingsService } from '../../../services/settings.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AnalysisTabComponent', () => {
  let component: AnalysisTabComponent;
  let fixture: ComponentFixture<AnalysisTabComponent>;
  let gameService: ChessGameService;
  let analysisService: GameAnalysisService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisTabComponent],
      providers: [ChessGameService, GameAnalysisService, SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisTabComponent);
    component = fixture.componentInstance;
    gameService = TestBed.inject(ChessGameService);
    analysisService = TestBed.inject(GameAnalysisService);
  });

  it('should create AnalysisTabComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should return initial letter for player initial', () => {
    expect(component.getPlayerInitial('Cupsol83')).toBe('C');
    expect(component.getPlayerInitial('IrishJohnDeRoxas')).toBe('I');
    expect(component.getPlayerInitial('')).toBe('?');
  });

  it('should calculate classification rows properly', () => {
    const rows = component.reportClassificationRows();
    expect(rows.length).toBe(7);
    expect(rows[0].key).toBe('brilliant');
    expect(rows[1].key).toBe('great');
    expect(rows[2].key).toBe('best');
    expect(rows[3].key).toBe('inaccuracy');
    expect(rows[4].key).toBe('mistake');
    expect(rows[5].key).toBe('miss');
    expect(rows[6].key).toBe('blunder');
  });

  it('should generate empty momentum data when no points exist', () => {
    const data = component.momentumData();
    expect(data.markerPins).toEqual([]);
    expect(data.currentPin).toBeNull();
  });

  it('should emit startReview when startReviewWalkthrough is called', () => {
    let emitted = false;
    component.startReview.subscribe(() => {
      emitted = true;
    });

    component.startReviewWalkthrough();
    expect(emitted).toBe(true);
  });
});
