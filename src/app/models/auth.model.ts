export type UserTier = 'guest' | 'free' | 'pro' | 'lifetime';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  tier: 'free' | 'pro' | 'lifetime';
  energy?: number | null;
  maxEnergy?: number;
  isUnlimited?: boolean;
  nextRefillAt?: string | null;
  chesscomUsername?: string | null;
  createdAt?: string | Date;
}

export interface EnergyStatus {
  energy: number;
  maxEnergy: number;
  isUnlimited: boolean;
  isGuest: boolean;
  nextRefillAt: string | null;
}

export interface PromoRedeemResult {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  visitorId: string;
  energy: number;
  maxEnergy: number;
  isUnlimited: boolean;
  nextRefillAt: string | null;
  isLoading: boolean;
}

export const DEMO_USERS: Record<'free' | 'pro', AuthUser> = {
  free: {
    id: 'demo_user_free',
    email: 'player@chessclub.com',
    name: 'Kasparov Trainee',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    tier: 'free',
    energy: 5,
    maxEnergy: 5,
    isUnlimited: false,
    nextRefillAt: new Date(Date.now() + 86400000).toISOString(),
    chesscomUsername: 'KasparovTrainee',
  },
  pro: {
    id: 'demo_user_pro',
    email: 'founder@sabiochess.com',
    name: 'Grandmaster VIP',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    tier: 'lifetime',
    energy: null,
    maxEnergy: 999,
    isUnlimited: true,
    nextRefillAt: null,
    chesscomUsername: 'HikaruFan',
  },
};

export const VALID_PROMO_CODES = ['EARLYBIRD', 'SABIOPRO', 'BETA2026', 'STREAMERPRO', 'VIP-X9K2-7A'];
