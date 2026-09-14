import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import * as dbModule from '../db';
import { signSessionToken } from '../utils/jwt';

describe('Promo Routes (server/routes/promo.ts)', () => {
  const mockSecret = 'test-promo-jwt-secret';

  const mockFreeUser = {
    id: 'user_free_promo_1',
    email: 'freeuser@chess.com',
    name: 'Free Promo User',
    avatarUrl: null,
    googleId: 'g_free_promo_1',
    tier: 'free' as const,
    energy: 2,
    lastEnergyRefillAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLifetimeUser = {
    id: 'user_lifetime_promo_1',
    email: 'lifetime@chess.com',
    name: 'Existing Lifetime User',
    avatarUrl: null,
    googleId: 'g_lifetime_1',
    tier: 'lifetime' as const,
    energy: null,
    lastEnergyRefillAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validPromoCode = {
    id: 'promo_1',
    code: 'EARLYBIRD',
    tier: 'lifetime' as const,
    maxUses: 100,
    usedCount: 5,
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let freeUserToken: string;
  let lifetimeUserToken: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    freeUserToken = await signSessionToken(
      {
        userId: mockFreeUser.id,
        email: mockFreeUser.email,
        tier: mockFreeUser.tier,
      },
      mockSecret,
    );

    lifetimeUserToken = await signSessionToken(
      {
        userId: mockLifetimeUser.id,
        email: mockLifetimeUser.email,
        tier: mockLifetimeUser.tier,
      },
      mockSecret,
    );
  });

  describe('POST /api/promo/redeem', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'EARLYBIRD' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(401);
    });

    it('returns 400 when promo code is empty or missing', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockFreeUser]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: '   ' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Invalid promo code');
    });

    it('returns 400 when user is already Lifetime Pro', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockLifetimeUser]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lifetimeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: 'EARLYBIRD' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Already Lifetime Pro');
    });

    it('returns 404 when promo code does not exist or is inactive', async () => {
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([mockFreeUser]); // authMiddleware
                return Promise.resolve([]); // promoCode lookup: not found
              }),
            }),
          }),
        })),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: 'INVALIDCODE' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Invalid Code');
    });

    it('returns 400 when promo code is expired', async () => {
      let callCount = 0;
      const expiredPromo = {
        ...validPromoCode,
        expiresAt: new Date(Date.now() - 100000), // in the past
      };

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([mockFreeUser]);
                return Promise.resolve([expiredPromo]);
              }),
            }),
          }),
        })),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: 'EARLYBIRD' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Code Expired');
    });

    it('returns 400 when promo code max uses is reached', async () => {
      let callCount = 0;
      const maxedPromo = {
        ...validPromoCode,
        maxUses: 10,
        usedCount: 10,
      };

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([mockFreeUser]);
                return Promise.resolve([maxedPromo]);
              }),
            }),
          }),
        })),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: 'EARLYBIRD' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Code Limit Reached');
    });

    it('returns 400 when user has already redeemed this promo code', async () => {
      let callCount = 0;
      const existingRedemption = {
        id: 'redemption_1',
        promoCodeId: validPromoCode.id,
        userId: mockFreeUser.id,
        redeemedAt: new Date(),
      };

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([mockFreeUser]);
                if (callCount === 2) return Promise.resolve([validPromoCode]);
                return Promise.resolve([existingRedemption]);
              }),
            }),
          }),
        })),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: 'EARLYBIRD' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Already Redeemed');
    });

    it('successfully redeems promo code, upgrades user to lifetime and returns new token & user', async () => {
      let callCount = 0;
      const userCopy = { ...mockFreeUser };

      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([userCopy]);
                if (callCount === 2) return Promise.resolve([validPromoCode]);
                return Promise.resolve([]); // not redeemed yet
              }),
            }),
          }),
        })),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue({}),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/promo/redeem',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: ' earlybird ' }), // test normalization
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; token: string; user: { tier: string; isUnlimited: boolean } };
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.tier).toBe('lifetime');
      expect(data.user.isUnlimited).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledTimes(2); // promoCodes and users
    });
  });
});
