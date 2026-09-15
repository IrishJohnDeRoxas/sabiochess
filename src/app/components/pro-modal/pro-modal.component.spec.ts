import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProModalComponent } from './pro-modal.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

describe('ProModalComponent', () => {
  let component: ProModalComponent;
  let fixture: ComponentFixture<ProModalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProModalComponent],
      providers: [AuthService, SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ProModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should populate sample promo code', () => {
    component.applySampleCode('SABIOPRO');
    expect(component.promoCodeInput()).toBe('SABIOPRO');
  });

  it('should reject promo redemption when guest', async () => {
    component.promoCodeInput.set('SABIOPRO');
    await component.redeemCode();

    expect(authService.isPro()).toBe(false);
    expect(component.promoError()).toBe(true);
    expect(component.promoMessage()).toContain('Sign in with Google required');
  });

  it('should redeem promo code and unlock pro access when signed in', async () => {
    authService.signInMock('free');
    component.promoCodeInput.set('SABIOPRO');
    await component.redeemCode();

    expect(authService.isPro()).toBe(true);
    expect(component.promoError()).toBe(false);
  });

  it('should allow instant demo unlock of pro pass in dev', () => {
    component.quickUnlockPro();
    expect(authService.isPro()).toBe(true);
    expect(authService.isUnlimitedEnergy()).toBe(true);
  });

  it('should close on backdrop click and escape key', () => {
    authService.openProModal();
    expect(authService.isProModalOpen()).toBe(true);

    const mockEvent = { target: 'backdrop', currentTarget: 'backdrop' } as unknown as MouseEvent;
    component.onBackdropClick(mockEvent);
    expect(authService.isProModalOpen()).toBe(false);

    authService.openProModal();
    expect(authService.isProModalOpen()).toBe(true);
    component.handleEscape();
    expect(authService.isProModalOpen()).toBe(false);
  });
});
