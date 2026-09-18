import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformGameSelectorComponent } from './platform-game-selector.component';
import { PlatformImporterService } from '../../services/platform-importer.service';
import { ChessGameService } from '../../services/chess-game.service';
import { SettingsService } from '../../services/settings.service';

describe('PlatformGameSelectorComponent', () => {
  let component: PlatformGameSelectorComponent;
  let fixture: ComponentFixture<PlatformGameSelectorComponent>;
  let platformService: PlatformImporterService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PlatformGameSelectorComponent],
      providers: [
        PlatformImporterService,
        ChessGameService,
        SettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformGameSelectorComponent);
    component = fixture.componentInstance;
    platformService = TestBed.inject(PlatformImporterService);
    fixture.detectChanges();
  });

  it('should create and default to chess.com', () => {
    expect(component).toBeTruthy();
    expect(component.activePlatform()).toBe('chess.com');
  });

  it('should remain on chess.com and ignore lichess since it is locked in development', () => {
    component.selectPlatform('lichess');
    expect(component.activePlatform()).toBe('chess.com');
  });

  it('should clear username when clearUsername is invoked', () => {
    component.username.set('TestPlayer');
    fixture.detectChanges();

    component.clearUsername();
    expect(component.username()).toBe('');
    expect(component.errorMessage()).toBeNull();
  });

  it('should save fetched games to localStorage cache and restore on init', async () => {
    const mockGames = [
      {
        id: 'game-1',
        white: 'hikaru',
        black: 'magnus',
        date: '2026-09-15',
        timeControl: '3m Blitz',
        result: '1-0',
        userResult: 'win' as const,
        pgn: '1. e4 e5 2. Nf3 1-0',
        platform: 'chess.com' as const,
      },
    ];

    vi.spyOn(platformService, 'fetchChessComGames').mockResolvedValue(mockGames);

    component.username.set('hikaru');
    await component.fetchGames();

    expect(component.gamesList()).toEqual(mockGames);
    const cached = localStorage.getItem('sabiochess_cached_games_chess.com_hikaru');
    expect(cached).toBeTruthy();
    expect(JSON.parse(cached!).games).toEqual(mockGames);

    // Create a new component instance to verify restoration
    const fixture2 = TestBed.createComponent(PlatformGameSelectorComponent);
    const comp2 = fixture2.componentInstance;
    comp2.username.set('hikaru');
    comp2.ngOnInit();
    expect(comp2.gamesList()).toEqual(mockGames);
  });

  it('should clear games list and localStorage cache when clearGames is invoked', async () => {
    const mockGames = [
      {
        id: 'game-1',
        white: 'hikaru',
        black: 'magnus',
        date: '2026-09-15',
        timeControl: '3m Blitz',
        result: '1-0',
        userResult: 'win' as const,
        pgn: '1. e4 e5 2. Nf3 1-0',
        platform: 'chess.com' as const,
      },
    ];

    component.username.set('hikaru');
    component.gamesList.set(mockGames);
    localStorage.setItem(
      'sabiochess_cached_games_chess.com_hikaru',
      JSON.stringify({ platform: 'chess.com', username: 'hikaru', games: mockGames, timestamp: Date.now() })
    );

    component.clearGames();

    expect(component.gamesList()).toEqual([]);
    expect(localStorage.getItem('sabiochess_cached_games_chess.com_hikaru')).toBeNull();
    expect(localStorage.getItem('sabiochess_recent_cached_games')).toBeNull();
  });

  it('should auto-orient board when loading a game where active username is Black', () => {
    const gameService = TestBed.inject(ChessGameService);
    const mockGame = {
      id: 'game-black',
      white: 'Opponent',
      black: 'IrishJohnDeRoxas',
      date: '2026-09-18',
      timeControl: '3m Blitz',
      result: '0-1',
      userResult: 'win' as const,
      pgn: '1. e4 e5 2. Nf3 Nc6 0-1',
      platform: 'chess.com' as const,
    };

    component.username.set('IRISHJOHNDEROXAS');
    component.loadGame(mockGame);

    expect(gameService.isBoardFlipped()).toBe(true);
    expect(gameService.bottomPlayer().name).toBe('IrishJohnDeRoxas');
  });
});
