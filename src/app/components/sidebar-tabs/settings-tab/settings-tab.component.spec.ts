import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsTabComponent } from './settings-tab.component';
import { SettingsService } from '../../../services/settings.service';
import { SoundService } from '../../../services/sound.service';
import { AuthService } from '../../../services/auth.service';

describe('SettingsTabComponent', () => {
  let component: SettingsTabComponent;
  let fixture: ComponentFixture<SettingsTabComponent>;
  let settingsService: SettingsService;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsTabComponent],
      providers: [SettingsService, SoundService, AuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsTabComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle app theme and board themes', () => {
    component.selectAppTheme('dark');
    expect(settingsService.appTheme()).toBe('dark');

    component.selectBoardTheme('wood');
    expect(settingsService.boardTheme()).toBe('wood');
  });

  it('should change analysis depth presets', () => {
    component.setDepth(18);
    expect(settingsService.analysisDepth()).toBe(18);
  });

  it('should apply promo code preset chips into the promo code input at bottom of settings', () => {
    component.applyPromoPreset('EARLYBIRD');
    expect(component.promoCodeInput()).toBe('EARLYBIRD');
  });

  it('should display error when submitting promo code as guest', async () => {
    component.promoCodeInput.set('EARLYBIRD');
    await component.redeemPromoCode();
    expect(component.promoStatusIsError()).toBe(true);
    expect(component.promoStatusMessage()).toContain('Sign in with Google required');
  });

  it('should display error when submitting empty promo code while authenticated', async () => {
    authService.signInMock('free');
    component.promoCodeInput.set('   ');
    await component.redeemPromoCode();
    expect(component.promoStatusIsError()).toBe(true);
    expect(component.promoStatusMessage()).toContain('Please enter a promo code');
  });

  it('should successfully redeem valid promo code and upgrade user', async () => {
    authService.signInMock('free');
    expect(authService.isPro()).toBe(false);

    component.promoCodeInput.set('SABIOPRO');
    await component.redeemPromoCode();

    expect(authService.isPro()).toBe(true);
    expect(component.promoStatusIsError()).toBe(false);
    expect(component.promoStatusMessage()).toContain('Lifetime Pro');
  });

  it('should hide promo code section for guest and render for authenticated user', () => {
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('PROMO CODE & PRO MEMBERSHIP');

    authService.signInMock('free');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('PROMO CODE & PRO MEMBERSHIP');
    expect(compiled.textContent).toContain('REDEEM CODE');
    expect(compiled.textContent).toContain('EARLYBIRD');
  });
});
