import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthModalComponent } from './auth-modal.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

describe('AuthModalComponent', () => {
  let component: AuthModalComponent;
  let fixture: ComponentFixture<AuthModalComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [AuthService, SettingsService],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs between signin, compare, and promo', () => {
    expect(component.activeTab()).toBe('signin');

    component.setTab('compare');
    expect(component.activeTab()).toBe('compare');

    component.setTab('promo');
    expect(component.activeTab()).toBe('promo');
  });

  it('should sign in as mock free user and pro user', () => {
    component.signInFree();
    expect(authService.isFreeUser()).toBe(true);

    component.signInPro();
    expect(authService.isPro()).toBe(true);
  });

  it('should allow continuing as guest', () => {
    authService.signInMock('free');
    component.continueGuest();
    expect(authService.isGuest()).toBe(true);
  });

  it('should apply preset promo code to input and redeem', async () => {
    component.applyPresetCode('EARLYBIRD');
    expect(component.promoCodeInput()).toBe('EARLYBIRD');

    await component.redeemCode();
    expect(authService.isPro()).toBe(true);
    expect(component.promoError()).toBe(false);
  });
});
