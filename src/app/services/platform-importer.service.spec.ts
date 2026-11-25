import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlatformImporterService, parsePlatformInput } from './platform-importer.service';

describe('PlatformImporterService', () => {
  let service: PlatformImporterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformImporterService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformImporterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse platform inputs correctly', () => {
    const chessComLive = parsePlatformInput('https://www.chess.com/game/live/169503198404?username=IrishJohnDeRoxas');
    expect(chessComLive.isGameUrlOrId).toBe(true);
    expect(chessComLive.gameId).toBe('169503198404');
    expect(chessComLive.extractedUsername).toBe('irishjohnderoxas');
    expect(chessComLive.platform).toBe('chess.com');

    const numericOnly = parsePlatformInput('169503198404');
    expect(numericOnly.isGameUrlOrId).toBe(true);
    expect(numericOnly.gameId).toBe('169503198404');
    expect(numericOnly.platform).toBe('chess.com');

    const lichessUrl = parsePlatformInput('https://lichess.org/Qa7vMW5H');
    expect(lichessUrl.isGameUrlOrId).toBe(true);
    expect(lichessUrl.gameId).toBe('Qa7vMW5H');
    expect(lichessUrl.platform).toBe('lichess');

    const plainUser = parsePlatformInput('hikaru');
    expect(plainUser.isGameUrlOrId).toBe(false);
  });

  it('should throw if username is empty', async () => {
    await expect(service.fetchChessComGames('')).rejects.toThrow();
  });

  it('should fetch and parse lichess games', async () => {
    const fetchPromise = service.fetchLichessGames('hikaru');

    const req = httpMock.expectOne((r) => r.url.includes('lichess.org/api/games/user/hikaru'));
    expect(req.request.method).toBe('GET');
    req.flush(
      '[Event "Rated Blitz"]\n[White "hikaru"]\n[Black "magnus"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
    );

    const games = await fetchPromise;
    expect(games.length).toBe(1);
    expect(games[0].white).toBe('hikaru');
    expect(games[0].userResult).toBe('win');
  });

  it('should fetch a specific lichess game by URL or ID', async () => {
    const fetchPromise = service.fetchLichessGames('https://lichess.org/Qa7vMW5H');

    const req = httpMock.expectOne((r) => r.url.includes('lichess.org/game/export/Qa7vMW5H'));
    expect(req.request.method).toBe('GET');
    req.flush(
      '[Event "Rated Blitz"]\n[White "player1"]\n[Black "player2"]\n[Result "0-1"]\n\n1. d4 d5 0-1'
    );

    const games = await fetchPromise;
    expect(games.length).toBe(1);
    expect(games[0].white).toBe('player1');
    expect(games[0].result).toBe('0-1');
  });

  it('should fetch a specific chess.com game by searching archives backwards', async () => {
    const fetchPromise = service.fetchChessComGames('https://www.chess.com/game/live/169503198404?username=irishjohnderoxas');

    const archivesReq = httpMock.expectOne((r) => r.url.includes('/pub/player/irishjohnderoxas/games/archives'));
    archivesReq.flush({
      archives: [
        'https://api.chess.com/pub/player/irishjohnderoxas/games/2026/05',
        'https://api.chess.com/pub/player/irishjohnderoxas/games/2026/11'
      ]
    });

    await Promise.resolve();

    // It should check the latest archive first (2026/11)
    const novReq = httpMock.expectOne('https://api.chess.com/pub/player/irishjohnderoxas/games/2026/11');
    novReq.flush({ games: [] });

    await Promise.resolve();

    // Then check the earlier archive (2026/05)
    const mayReq = httpMock.expectOne('https://api.chess.com/pub/player/irishjohnderoxas/games/2026/05');
    mayReq.flush({
      games: [
        {
          url: 'https://www.chess.com/game/live/169503198404',
          pgn: '[Event "Live Chess"]\n[White "IrishJohnDeRoxas"]\n[Black "vagner_tal"]\n[Result "0-1"]\n\n1. e4 0-1',
          white: { username: 'IrishJohnDeRoxas', rating: 920, result: 'resigned' },
          black: { username: 'vagner_tal', rating: 922, result: 'win' }
        }
      ]
    });

    const games = await fetchPromise;
    expect(games.length).toBe(1);
    expect(games[0].id).toBe('https://www.chess.com/game/live/169503198404');
    expect(games[0].white).toBe('IrishJohnDeRoxas');
    expect(games[0].black).toBe('vagner_tal');
    expect(games[0].userResult).toBe('loss');
  });
});
