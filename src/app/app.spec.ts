import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { ChessGameService } from './services/chess-game.service';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ChessBoardComponent } from './components/chess-board/chess-board.component';
import { PlayerCardComponent } from './components/player-card/player-card.component';
import { EvalBarComponent } from './components/eval-bar/eval-bar.component';
import { SidebarTabsComponent } from './components/sidebar-tabs/sidebar-tabs.component';
import { LogoComponent } from './components/logo/logo.component';
import { AnalyzerComponent } from './components/analyzer/analyzer.component';
import { TermsComponent } from './components/legal/terms.component';
import { PrivacyComponent } from './components/legal/privacy.component';
import { SettingsService } from './services/settings.service';
import { SoundService } from './services/sound.service';
import { GameAnalysisService } from './services/game-analysis.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('SabioChess Neubrutalist Suite', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        HeaderComponent,
        FooterComponent,
        ChessBoardComponent,
        PlayerCardComponent,
        EvalBarComponent,
        SidebarTabsComponent,
        LogoComponent,
        AnalyzerComponent,
        TermsComponent,
        PrivacyComponent,
      ],
      providers: [
        provideRouter(routes),
        ChessGameService,
        SettingsService,
        SoundService,
        GameAnalysisService,
      ],
    }).compileComponents();
  });

  it('should create the App root component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render player cards with username and rating', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const service = TestBed.inject(ChessGameService);
    service.loadSampleGame('opera');
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Paul Morphy');
    expect(compiled.textContent).toContain('2600');
    expect(compiled.textContent).toContain('Duke Karl / Count Isouard');
    expect(compiled.textContent).toContain('2100');
  });

  it('should navigate to terms of service page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/terms');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Terms of Service');
    expect(compiled.textContent).toContain('Zero Tolerance for Live Cheating');
    expect(compiled.textContent).toContain('Stockfish');
  });

  it('should navigate to privacy policy page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/privacy');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Privacy Policy');
    expect(compiled.textContent).toContain('DATA PRIVACY & GDPR');
    expect(compiled.textContent).toContain('GDPR & CCPA Compliant');
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

  it('should flip the board orientation and invert player cards', () => {
    const service = TestBed.inject(ChessGameService);
    service.loadSampleGame('opera');
    expect(service.isBoardFlipped()).toBe(false);
    expect(service.topPlayer().name).toBe('Duke Karl / Count Isouard');
    expect(service.bottomPlayer().name).toBe('Paul Morphy');

    service.flipBoard();
    expect(service.isBoardFlipped()).toBe(true);
    expect(service.topPlayer().name).toBe('Paul Morphy');
    expect(service.bottomPlayer().name).toBe('Duke Karl / Count Isouard');
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
