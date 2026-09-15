import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
import { VALID_PROMO_CODES } from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let settingsService: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    TestBed.configureTestingModule({
      providers: [AuthService, SettingsService],
    });
    service = TestBed.inject(AuthService);
    settingsService = TestBed.inject(SettingsService);
  });

  it('should initialize as guest user with 5 default energy', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isGuest()).toBe(true);
    expect(service.userTier()).toBe('guest');
    expect(service.isFreeUser()).toBe(false);
    expect(service.isPro()).toBe(false);
    expect(service.energy()).toBe(5);
    expect(service.maxEnergy()).toBe(5);
    expect(service.isUnlimitedEnergy()).toBe(false);
    expect(service.visitorId()).toBeTruthy();
  });

  it('should sign in as mock free user and update state', () => {
    service.signInMock('free', 'Test Free User', 'free@example.com');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isGuest()).toBe(false);
    expect(service.userTier()).toBe('free');
    expect(service.isFreeUser()).toBe(true);
    expect(service.isPro()).toBe(false);
    expect(service.displayName()).toBe('Test Free User');
    expect(service.currentUser()?.email).toBe('free@example.com');
    expect(service.energy()).toBe(5);
  });

  it('should sign in as mock pro user with unlimited energy', () => {
    service.signInMock('pro', 'VIP Founder', 'founder@sabiochess.com');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isGuest()).toBe(false);
    expect(service.userTier()).toBe('lifetime');
    expect(service.isPro()).toBe(true);
    expect(service.isUnlimitedEnergy()).toBe(true);
  });

  it('should switch back to guest mode', () => {
    service.signInMock('free');
    expect(service.isGuest()).toBe(false);

    service.switchToGuest();
    expect(service.isGuest()).toBe(true);
    expect(service.currentUser()).toBeNull();
  });

  it('should logout and reset state', async () => {
    service.signInMock('pro');
    expect(service.isAuthenticated()).toBe(true);

    await service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isGuest()).toBe(true);
    expect(service.token()).toBeNull();
  });

  it('should reject promo code redemption when user is guest', async () => {
    expect(service.isGuest()).toBe(true);
    const res = await service.redeemPromoCode('EARLYBIRD');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Sign in with Google required');
    expect(service.isPro()).toBe(false);
  });

  it('should sign in with Google credential and update user state', async () => {
    const res = await service.signInWithGoogle('test_google_credential');
    expect(res.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBeTruthy();
  });

  it('should redeem valid promo code and upgrade free user to lifetime pro', async () => {
    service.signInMock('free');
    expect(service.isPro()).toBe(false);

    const res = await service.redeemPromoCode('EARLYBIRD');
    expect(res.success).toBe(true);
    expect(service.isPro()).toBe(true);
    expect(service.userTier()).toBe('lifetime');
    expect(service.isUnlimitedEnergy()).toBe(true);
  });

  it('should reject empty promo code', async () => {
    service.signInMock('free');
    const res = await service.redeemPromoCode('   ');
    expect(res.success).toBe(false);
  });

  it('should reject redeeming when already lifetime pro', async () => {
    service.signInMock('pro');
    const res = await service.redeemPromoCode('EARLYBIRD');
    expect(res.success).toBe(false);
    expect(res.message).toContain('already has Lifetime Pro');
  });

  it('should consume energy when not unlimited and deduct balance', async () => {
    service.signInMock('free');
    service.energy.set(5);

    const res = await service.consumeEnergy(1);
    expect(res.success).toBe(true);
    expect(service.energy()).toBe(4);
  });

  it('should allow unlimited consumption for pro users without deducting balance', async () => {
    service.signInMock('pro');
    const res = await service.consumeEnergy(1);
    expect(res.success).toBe(true);
    expect(service.energy()).toBe(999);
  });

  it('should manage modal open/close state signals', () => {
    service.openAuthModal();
    expect(service.isAuthModalOpen()).toBe(true);
    expect(service.isProModalOpen()).toBe(false);

    service.closeAuthModal();
    expect(service.isAuthModalOpen()).toBe(false);

    service.openProModal();
    expect(service.isProModalOpen()).toBe(true);
    expect(service.isAuthModalOpen()).toBe(false);

    service.closeProModal();
    expect(service.isProModalOpen()).toBe(false);

    service.toggleUserMenu();
    expect(service.isUserMenuOpen()).toBe(true);
    service.closeUserMenu();
    expect(service.isUserMenuOpen()).toBe(false);
  });
});
