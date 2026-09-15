import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('PlayerCardComponent', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentInstance;
  });

  it('should create PlayerCardComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should display player name, rating and title', () => {
    component.player = {
      name: 'Hikaru Nakamura',
      rating: 2875,
      title: 'GM',
    };
    component.color = 'w';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Hikaru Nakamura');
    expect(compiled.textContent).toContain('2875');
    expect(compiled.textContent).toContain('GM');
  });

  it('should display unrated symbol (?) when rating is missing', () => {
    component.player = {
      name: 'Casual Player',
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Casual Player');
    expect(compiled.textContent).toContain('?');
  });

  it('should apply is-active-turn class when isTurn is true and game is not ended', () => {
    component.isTurn = true;
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.player-card-container') as HTMLElement;
    expect(container.classList.contains('is-active-turn')).toBe(true);
  });

  it('should display outcome status and winner styling when player wins', () => {
    component.outcome = {
      isWinner: true,
      isLoser: false,
      isDraw: false,
      score: '1',
      reason: 'Won by checkmate',
      shortReason: 'Checkmate',
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Won by checkmate');
    expect(compiled.textContent).toContain('1');
  });

  it('should display clock time and detect low-time', () => {
    component.clock = '00:08.4';
    expect(component.isLowTime).toBe(true);

    component.clock = '05:30';
    expect(component.isLowTime).toBe(false);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('05:30');
  });
});
