import { TestBed } from '@angular/core/testing';
import { AnalyzerComponent } from './analyzer.component';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';
import { SoundService } from '../../services/sound.service';
import { GameAnalysisService } from '../../services/game-analysis.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AnalyzerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzerComponent],
      providers: [ChessGameService, SettingsService, SoundService, GameAnalysisService],
    }).compileComponents();
  });

  it('should create the analyzer component', () => {
    const fixture = TestBed.createComponent(AnalyzerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render player cards and chess board', () => {
    const fixture = TestBed.createComponent(AnalyzerComponent);
    const game = TestBed.inject(ChessGameService);
    game.loadSampleGame('opera');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Paul Morphy');
    expect(compiled.textContent).toContain('Duke Karl / Count Isouard');
    expect(compiled.querySelector('app-chess-board')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar-tabs')).toBeTruthy();
  });
});
