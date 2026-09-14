import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import * as dbModule from '../db';
import { signSessionToken } from '../utils/jwt';

describe('Energy Routes (server/routes/energy.ts)', () => {
  const mockSecret = 'test-energy-jwt-secret';

  const mockFreeUser = {
    id: 'user_free_1',
    email: 'freeuser@chess.com',
    name: 'Free User',
    avatarUrl: null,
    googleId: 'g_free_1',
    tier: 'free' as const,
    energy: 5,
    lastEnergyRefillAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLifetimeUser = {
    id: 'user_lifetime_1',
    email: 'vip@chess.com',
    name: 'Lifetime VIP',
    avatarUrl: null,
    googleId: 'g_vip_1',
    tier: 'lifetime' as const,
    energy: null,
    lastEnergyRefillAt: null,
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
      mockSecret
    );

    lifetimeUserToken = await signSessionToken(
      {
        userId: mockLifetimeUser.id,
        email: mockLifetimeUser.email,
        tier: mockLifetimeUser.tier,
      },
      mockSecret
    );
  });

  describe('GET /api/energy/status', () => {
    it('returns 401 when not authenticated and no visitor id', async () => {
      const res = await app.request('/api/energy/status', {}, {
        DB: {} as D1Database,
        JWT_SECRET: mockSecret,
      });

      expect(res.status).toBe(401);
    });

    it('returns energy status for guest when X-Visitor-Id is provided', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'guest_test-visitor-123',
                  fingerprint: 'test-visitor-123',
                  energy: 5,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/status',
        {
          headers: {
            'X-Visitor-Id': 'test-visitor-123',
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { energy: number; maxEnergy: number; isGuest: boolean };
      expect(data.energy).toBe(5);
      expect(data.maxEnergy).toBe(5);
      expect(data.isGuest).toBe(true);
    });

    it('creates and returns 5 energy for new guest if record does not exist', async () => {
      let isFirst = true;
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                if (isFirst) {
                  isFirst = false;
                  return Promise.resolve([]);
                }
                return Promise.resolve([
                  {
                    id: 'guest_new-visitor-456',
                    fingerprint: 'new-visitor-456',
                    energy: 5,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]);
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue({}),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/status',
        {
          headers: {
            'X-Visitor-Id': 'new-visitor-456',
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { energy: number; isGuest: boolean };
      expect(data.energy).toBe(5);
      expect(data.isGuest).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns energy status for free user', async () => {
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
        '/api/energy/status',
        {
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { energy: number; maxEnergy: number; isUnlimited: boolean };
      expect(data.energy).toBe(5);
      expect(data.maxEnergy).toBe(5);
      expect(data.isUnlimited).toBe(false);
    });

    it('returns unlimited status for lifetime user', async () => {
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
        '/api/energy/status',
        {
          headers: {
            Authorization: `Bearer ${lifetimeUserToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { energy: number | null; isUnlimited: boolean };
      expect(data.energy).toBeNull();
      expect(data.isUnlimited).toBe(true);
    });
  });

  describe('POST /api/energy/consume', () => {
    it('returns 401 when not authenticated and no visitor id', async () => {
      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
    });

    it('deducts 1 energy for guest user with available energy', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'guest_visitor-abc',
                  fingerprint: 'visitor-abc',
                  energy: 5,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
          headers: {
            'X-Visitor-Id': 'visitor-abc',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: 1 }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        success: boolean;
        energy: number;
        isGuest: boolean;
      };
      expect(data.success).toBe(true);
      expect(data.energy).toBe(4);
      expect(data.isGuest).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns 429 when guest user has 0 energy', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 'guest_visitor-exhausted',
                  fingerprint: 'visitor-exhausted',
                  energy: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
          headers: {
            'X-Visitor-Id': 'visitor-exhausted',
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(429);
      const data = (await res.json()) as {
        success: boolean;
        error: string;
        energy: number;
        isGuest: boolean;
      };
      expect(data.success).toBe(false);
      expect(data.error).toBe('guest_energy_depleted');
      expect(data.energy).toBe(0);
      expect(data.isGuest).toBe(true);
    });

    it('deducts 1 energy for free user with available energy', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockFreeUser]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: 1 }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        success: boolean;
        energy: number;
        maxEnergy: number;
        nextRefillAt: string;
      };
      expect(data.success).toBe(true);
      expect(data.energy).toBe(4);
      expect(data.maxEnergy).toBe(5);
      expect(data.nextRefillAt).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns 429 when free user has 0 energy', async () => {
      const emptyUser = {
        ...mockFreeUser,
        energy: 0,
        lastEnergyRefillAt: new Date(),
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([emptyUser]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(429);
      const data = (await res.json()) as {
        success: boolean;
        error: string;
        energy: number;
        nextRefillAt: string;
      };
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient energy');
      expect(data.energy).toBe(0);
      expect(data.nextRefillAt).toBeDefined();
    });

    it('passes through consumption for lifetime/pro user without DB deduction', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockLifetimeUser]),
            }),
          }),
        }),
        update: vi.fn(),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/energy/consume',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lifetimeUserToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; isUnlimited: boolean; energy: null };
      expect(data.success).toBe(true);
      expect(data.isUnlimited).toBe(true);
      expect(data.energy).toBeNull();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
