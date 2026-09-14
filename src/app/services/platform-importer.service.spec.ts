import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlatformImporterService } from './platform-importer.service';

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
});
