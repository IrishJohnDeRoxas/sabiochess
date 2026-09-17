import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChessGameService } from '../../services/chess-game.service';
import { GameAnalysisService } from '../../services/game-analysis.service';
import { SettingsService } from '../../services/settings.service';
import { SoundService } from '../../services/sound.service';
import { AnalyzerComponent } from './analyzer.component';

describe('AnalyzerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyzerComponent],
      providers: [
        ChessGameService,
        SettingsService,
        SoundService,
        GameAnalysisService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ sample: 'opera', flip: 'true' }),
          },
        },
      ],
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

  it('should handle postMessage with LOAD_PGN', () => {
    const fixture = TestBed.createComponent(AnalyzerComponent);
    fixture.detectChanges();
    const game = TestBed.inject(ChessGameService);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'LOAD_PGN',
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
        },
      }),
    );

    expect(game.history().length).toBe(6);
  });

  it('should clean and load plus-separated PGN from URL search params', () => {
    const fixture = TestBed.createComponent(AnalyzerComponent);
    const component = fixture.componentInstance;
    const game = TestBed.inject(ChessGameService);

    // Test private cleanPgnString / handleQueryParams directly
    (component as any).handleQueryParams({
      pgn: '1.+e4+e5+2.+Nf3+Nc6',
    });

    expect(game.history().length).toBe(4);
    expect(game.history()[0].san).toBe('e4');
    expect(game.history()[1].san).toBe('e5');
    expect(game.history()[2].san).toBe('Nf3');
    expect(game.history()[3].san).toBe('Nc6');
  });

  it('should handle URL-encoded PGN with headers and newlines', () => {
    const fixture = TestBed.createComponent(AnalyzerComponent);
    const component = fixture.componentInstance;
    const game = TestBed.inject(ChessGameService);

    const encodedPgn = encodeURIComponent(
      '[Event "Chess.com"]\n[White "Magnus"]\n[Black "Hikaru"]\n\n1. d4 Nf6 2. c4 e6',
    );
    (component as any).handleQueryParams({
      pgn: encodedPgn,
      flip: 'true',
    });

    expect(game.history().length).toBe(4);
    expect(game.matchMetadata()?.white.name).toBe('Magnus');
    expect(game.matchMetadata()?.black.name).toBe('Hikaru');
    expect(game.isBoardFlipped()).toBe(true);
  });
});
