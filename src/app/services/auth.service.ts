import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthUser, DEMO_USERS, EnergyStatus, PromoRedeemResult, UserTier, VALID_PROMO_CODES } from '../models/auth.model';
import { SettingsService } from './settings.service';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const STORAGE_USER_KEY = 'sabiochess_auth_user_v1';
const STORAGE_TOKEN_KEY = 'sabiochess_auth_token_v1';
const STORAGE_VISITOR_KEY = 'sabiochess_visitor_id_v1';
const STORAGE_GUEST_ENERGY_KEY = 'sabiochess_guest_energy_v1';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly settings = inject(SettingsService);

  readonly currentUser = signal<AuthUser | null>(null);
  readonly token = signal<string | null>(null);
  readonly visitorId = signal<string>('');
  readonly energy = signal<number>(5);
  readonly maxEnergy = signal<number>(5);
  readonly isUnlimitedEnergy = signal<boolean>(false);
  readonly nextRefillAt = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Modal UI state signals
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly isProModalOpen = signal<boolean>(false);
  readonly isUserMenuOpen = signal<boolean>(false);

  // Computed state
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isGuest = computed(() => !this.currentUser());
  readonly userTier = computed<UserTier>(() => {
    const u = this.currentUser();
    if (!u) return 'guest';
    return u.tier;
  });
  readonly isFreeUser = computed(() => this.userTier() === 'free');
  readonly isPro = computed(() => this.userTier() === 'pro' || this.userTier() === 'lifetime');

  readonly displayName = computed(() => {
    const u = this.currentUser();
    if (!u) return 'Guest Player';
    return u.name || u.email.split('@')[0] || 'Player';
  });

  readonly userAvatar = computed(() => {
    const u = this.currentUser();
    return u?.avatarUrl || null;
  });

  constructor() {
    this.initAuth();
  }

  /**
   * Initializes visitor ID and checks for existing session or guest status
   */
  async initAuth(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    // 1. Initialize or load visitor ID
    let vid = localStorage.getItem(STORAGE_VISITOR_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_VISITOR_KEY, vid);
    }
    this.visitorId.set(vid);

    // 2. Load stored token & user
    const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const savedUserJson = localStorage.getItem(STORAGE_USER_KEY);

    if (savedToken && savedUserJson) {
      try {
        const parsedUser = JSON.parse(savedUserJson) as AuthUser;
        this.token.set(savedToken);
        this.currentUser.set(parsedUser);
        this.updateEnergyFromUser(parsedUser);

        // Fetch fresh status from server in background
        await this.fetchMe(savedToken);
        return;
      } catch {
        this.clearSession();
      }
    }

    // 3. If guest, fetch guest energy status
    await this.fetchEnergyStatus();
  }

  /**
   * Fetch current user profile from /api/auth/me
   */
  async fetchMe(tokenToUse?: string): Promise<boolean> {
    const tok = tokenToUse || this.token();
    if (!tok) return false;

    this.isLoading.set(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tok}`,
          'X-Visitor-Id': this.visitorId(),
        },
      });

      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser };
        if (data.user) {
          this.currentUser.set(data.user);
          this.updateEnergyFromUser(data.user);
          this.saveSession(tok, data.user);
          return true;
        }
      } else if (res.status === 401) {
        this.clearSession();
        await this.fetchEnergyStatus();
      }
    } catch {
      // Backend might be offline or mocked; retain local user
    } finally {
      this.isLoading.set(false);
    }
    return false;
  }

  /**
   * Fetch energy status for current user or guest
   */
  async fetchEnergyStatus(): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'X-Visitor-Id': this.visitorId(),
      };
      const tok = this.token();
      if (tok) {
        headers['Authorization'] = `Bearer ${tok}`;
      }

      const res = await fetch('/api/energy/status', { headers });
      if (res.ok) {
        const data = (await res.json()) as EnergyStatus;
        this.energy.set(data.energy);
        this.maxEnergy.set(data.maxEnergy || 5);
        this.isUnlimitedEnergy.set(!!data.isUnlimited);
        this.nextRefillAt.set(data.nextRefillAt || null);
        return;
      }
    } catch {
      // Fallback for offline / client-only mode
    }

    // Fallback logic
    if (this.currentUser()) {
      this.updateEnergyFromUser(this.currentUser()!);
    } else {
      const guestStored = localStorage.getItem(STORAGE_GUEST_ENERGY_KEY);
      const parsed = guestStored !== null ? parseInt(guestStored, 10) : 5;
      this.energy.set(isNaN(parsed) ? 5 : parsed);
      this.maxEnergy.set(5);
      this.isUnlimitedEnergy.set(false);
      this.nextRefillAt.set(null);
    }
  }

  /**
   * Authenticate with Google credential token (or fallback mock profile for client testing)
   */
  async signInWithGoogle(credential?: string): Promise<{ success: boolean; message?: string }> {
    this.isLoading.set(true);
    try {
      const cred = credential || 'mock_google_token_' + Date.now();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: cred }),
      });

      const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string; message?: string };

      if (res.ok && data.token && data.user) {
        this.saveSession(data.token, data.user);
        this.currentUser.set(data.user);
        this.token.set(data.token);
        this.updateEnergyFromUser(data.user);
        this.closeAuthModal();
        this.settings.flashToast(`Signed in as ${data.user.name || data.user.email}`);
        return { success: true };
      }

      // Fallback for client mode / mock Google sign-in
      const mockGoogleUser: AuthUser = {
        id: 'g_' + Math.random().toString(36).substring(2, 10),
        email: 'player@gmail.com',
        name: 'Google Chess Player',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        tier: 'free',
        energy: 5,
        maxEnergy: 5,
        isUnlimited: false,
        nextRefillAt: new Date(Date.now() + 86400000).toISOString(),
        chesscomUsername: 'GooglePlayer',
      };
      const mockToken = 'mock_jwt_google_' + Date.now();
      this.saveSession(mockToken, mockGoogleUser);
      this.currentUser.set(mockGoogleUser);
      this.token.set(mockToken);
      this.updateEnergyFromUser(mockGoogleUser);
      this.closeAuthModal();
      this.settings.flashToast(`Signed in as ${mockGoogleUser.name} (${mockGoogleUser.email})`);
      return { success: true };
    } catch {
      const mockGoogleUser: AuthUser = {
        id: 'g_' + Math.random().toString(36).substring(2, 10),
        email: 'player@gmail.com',
        name: 'Google Chess Player',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        tier: 'free',
        energy: 5,
        maxEnergy: 5,
        isUnlimited: false,
        nextRefillAt: new Date(Date.now() + 86400000).toISOString(),
        chesscomUsername: 'GooglePlayer',
      };
      const mockToken = 'mock_jwt_google_' + Date.now();
      this.saveSession(mockToken, mockGoogleUser);
      this.currentUser.set(mockGoogleUser);
      this.token.set(mockToken);
      this.updateEnergyFromUser(mockGoogleUser);
      this.closeAuthModal();
      this.settings.flashToast(`Signed in as ${mockGoogleUser.name} (${mockGoogleUser.email})`);
      return { success: true };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fast Demo / Mock Sign-In for switching between Free and Pro tiers in UI
   */
  signInMock(tier: 'free' | 'pro', customName?: string, customEmail?: string): void {
    const base = DEMO_USERS[tier];
    const user: AuthUser = {
      ...base,
      name: customName || base.name,
      email: customEmail || base.email,
    };
    const mockToken = 'mock_jwt_' + tier + '_' + Date.now();

    this.saveSession(mockToken, user);
    this.currentUser.set(user);
    this.token.set(mockToken);
    this.updateEnergyFromUser(user);
    this.closeAuthModal();
    this.settings.flashToast(`Signed in as ${user.name} (${user.tier.toUpperCase()})`);
  }

  /**
   * Switches user back to Guest mode
   */
  switchToGuest(): void {
    this.clearSession();
    this.fetchEnergyStatus();
    this.settings.flashToast('Switched to Guest mode');
  }

  /**
   * Logout user and reset to guest
   */
  async logout(): Promise<void> {
    const tok = this.token();
    if (tok) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}` },
        });
      } catch {
        // Ignore logout request network errors
      }
    }

    this.clearSession();
    await this.fetchEnergyStatus();
    this.closeUserMenu();
    this.settings.flashToast('Signed out successfully');
  }

  /**
   * Deduct 1 energy for game review / engine depth calculations
   */
  async consumeEnergy(amount = 1): Promise<{ success: boolean; error?: string; message?: string }> {
    if (this.isUnlimitedEnergy() || this.isPro()) {
      return { success: true };
    }

    if (this.energy() < amount) {
      if (this.isGuest()) {
        this.openAuthModal();
        return {
          success: false,
          error: 'guest_energy_depleted',
          message: 'You have used all free starter analyses! Sign in with Google to get 5 daily refills or unlock Lifetime Pro.',
        };
      } else {
        this.openProModal();
        return {
          success: false,
          error: 'energy_depleted',
          message: 'Daily energy limit reached! Refills tomorrow or upgrade to Pro with a Promo Code.',
        };
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Visitor-Id': this.visitorId(),
      };
      const tok = this.token();
      if (tok) {
        headers['Authorization'] = `Bearer ${tok}`;
      }

      const res = await fetch('/api/energy/consume', {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = (await res.json()) as EnergyStatus & { success: boolean };
        this.energy.set(data.energy);
        this.maxEnergy.set(data.maxEnergy || 5);
        this.isUnlimitedEnergy.set(!!data.isUnlimited);
        if (this.isGuest()) {
          localStorage.setItem(STORAGE_GUEST_ENERGY_KEY, data.energy.toString());
        }
        return { success: true };
      } else {
        const err = (await res.json()) as { error?: string; message?: string };
        return { success: false, error: err.error, message: err.message };
      }
    } catch {
      // Local fallback
      const updated = Math.max(0, this.energy() - amount);
      this.energy.set(updated);
      if (this.isGuest()) {
        localStorage.setItem(STORAGE_GUEST_ENERGY_KEY, updated.toString());
      }
      return { success: true };
    }
  }

  /**
   * Redeem promo code at /api/promo/redeem
   * Only allowed when signed in with Google
   */
  async redeemPromoCode(rawCode: string): Promise<PromoRedeemResult> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { success: false, message: 'Please enter a promo code.' };
    }

    if (!this.isAuthenticated() || this.isGuest()) {
      return {
        success: false,
        message: 'Sign in with Google required before redeeming a promo code.',
      };
    }

    if (this.isPro()) {
      return {
        success: false,
        message: 'Your account already has Lifetime Pro VIP access!',
      };
    }

    this.isLoading.set(true);

    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token()}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        token?: string;
        user?: AuthUser;
      };

      if (res.ok && data.success && data.user) {
        this.currentUser.set(data.user);
        if (data.token) {
          this.token.set(data.token);
          this.saveSession(data.token, data.user);
        }
        this.updateEnergyFromUser(data.user);
        this.settings.flashToast('🎉 Lifetime Pro Pass Activated!');
        return {
          success: true,
          message: data.message || 'Promo code applied! Lifetime Pro is now active.',
          user: data.user,
          token: data.token,
        };
      }

      // Offline / fallback verification for valid promo codes
      if (!res.ok && VALID_PROMO_CODES.includes(code)) {
        const upgraded: AuthUser = {
          ...this.currentUser()!,
          tier: 'lifetime',
          energy: null,
          maxEnergy: 999,
          isUnlimited: true,
        };
        this.currentUser.set(upgraded);
        this.saveSession(this.token() || 'mock_pro_token', upgraded);
        this.updateEnergyFromUser(upgraded);
        this.settings.flashToast('🎉 Lifetime Pro Pass Activated!');
        return {
          success: true,
          message: 'Promo code applied! Welcome to Lifetime Pro.',
          user: upgraded,
        };
      }

      return {
        success: false,
        message: data.message || data.error || 'Invalid promo code. Please try again.',
      };
    } catch {
      // Fallback check
      if (VALID_PROMO_CODES.includes(code)) {
        const upgraded: AuthUser = {
          ...this.currentUser()!,
          tier: 'lifetime',
          energy: null,
          maxEnergy: 999,
          isUnlimited: true,
        };
        this.currentUser.set(upgraded);
        this.saveSession(this.token() || 'mock_pro_token', upgraded);
        this.updateEnergyFromUser(upgraded);
        this.settings.flashToast('🎉 Lifetime Pro Pass Activated!');
        return {
          success: true,
          message: 'Promo code applied! Welcome to Lifetime Pro.',
          user: upgraded,
        };
      }
      return {
        success: false,
        message: 'Invalid promo code. Please check and try again.',
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  // UI Modal toggles
  openAuthModal(): void {
    this.isAuthModalOpen.set(true);
    this.isProModalOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
  }

  openProModal(): void {
    this.isProModalOpen.set(true);
    this.isAuthModalOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  closeProModal(): void {
    this.isProModalOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  private updateEnergyFromUser(user: AuthUser): void {
    if (user.tier === 'pro' || user.tier === 'lifetime' || user.isUnlimited) {
      this.energy.set(999);
      this.maxEnergy.set(999);
      this.isUnlimitedEnergy.set(true);
      this.nextRefillAt.set(null);
    } else {
      this.energy.set(user.energy !== null && user.energy !== undefined ? user.energy : 5);
      this.maxEnergy.set(user.maxEnergy || 5);
      this.isUnlimitedEnergy.set(false);
      this.nextRefillAt.set(user.nextRefillAt || null);
    }
  }

  private saveSession(token: string, user: AuthUser): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage write error
    }
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.token.set(null);
    this.isUnlimitedEnergy.set(false);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // Ignore
    }
  }
}
