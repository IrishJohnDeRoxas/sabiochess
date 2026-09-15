import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VariationBannerComponent } from './variation-banner.component';
import { ChessGameService } from '../../services/chess-game.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('VariationBannerComponent', () => {
  let component: VariationBannerComponent;
  let fixture: ComponentFixture<VariationBannerComponent>;
  let gameService: ChessGameService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariationBannerComponent],
      providers: [ChessGameService],
    }).compileComponents();

    fixture = TestBed.createComponent(VariationBannerComponent);
    component = fixture.componentInstance;
    gameService = TestBed.inject(ChessGameService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show banner when no variation is active', () => {
    const banner = fixture.nativeElement.querySelector('.variation-banner');
    expect(banner).toBeNull();
  });

  it('should show banner when a variation is active and allow returning to main line', () => {
    gameService.move('e4');
    gameService.move('e5');
    gameService.undo();
    // Play alternate move c5 to branch into variation
    gameService.move('c5');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.variation-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('VARIATION ACTIVE');

    const returnBtn = banner.querySelector('button');
    expect(returnBtn).not.toBeNull();
    returnBtn.click();
    fixture.detectChanges();

    expect(gameService.isVariationActive()).toBe(false);
    expect(gameService.lastMove()?.from).toBe('e2');
    expect(gameService.lastMove()?.to).toBe('e4');
  });
});
