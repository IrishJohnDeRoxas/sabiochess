import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import * as dbModule from '../db';
import { signSessionToken } from '../utils/jwt';

describe('Settings Routes (server/routes/settings.ts)', () => {
  const mockSecret = 'test-settings-jwt-secret';

  const mockFreeUser = {
    id: 'user_free_1',
    email: 'freeuser@chess.com',
    name: 'Free User',
    avatarUrl: null,
    googleId: 'g_free_1',
    tier: 'free' as const,
    energy: 2,
    lastEnergyRefillAt: null,
    appTheme: 'dark' as const,
    boardTheme: 'green' as const,
    moveSounds: true,
    analysisDepth: 12,
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
    appTheme: 'light' as const,
    boardTheme: 'wood' as const,
    moveSounds: false,
    analysisDepth: 22,
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

  describe('GET /api/settings', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request('/api/settings', {}, {
        DB: {} as D1Database,
        JWT_SECRET: mockSecret,
      });

      expect(res.status).toBe(401);
    });

    it('returns default settings for free user', async () => {
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
        '/api/settings',
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
      const data = (await res.json()) as { settings: any };
      expect(data.settings).toEqual({
        appTheme: 'dark',
        boardTheme: 'green',
        moveSounds: true,
        analysisDepth: 12,
        chesscomUsername: null,
      });
    });

    it('returns custom settings for lifetime user', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockLifetimeUser, chesscomUsername: 'hikaru' }]),
            }),
          }),
        }),
      };
      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/settings',
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
      const data = (await res.json()) as { settings: any };
      expect(data.settings).toEqual({
        appTheme: 'light',
        boardTheme: 'wood',
        moveSounds: false,
        analysisDepth: 22,
        chesscomUsername: 'hikaru',
      });
    });
  });

  describe('PUT /api/settings and PATCH /api/settings', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await app.request(
        '/api/settings',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appTheme: 'light' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
    });

    it('updates allowed settings for free user and caps analysisDepth to 22', async () => {
      const userState = { ...mockFreeUser };
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([userState]),
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
        '/api/settings',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appTheme: 'light',
            boardTheme: 'green',
            moveSounds: false,
            analysisDepth: 28, // Free user tries to set depth 28 -> capped to 22
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; settings: any };
      expect(data.success).toBe(true);
      expect(data.settings.appTheme).toBe('light');
      expect(data.settings.boardTheme).toBe('green');
      expect(data.settings.moveSounds).toBe(false);
      expect(data.settings.analysisDepth).toBe(22); // Capped to 22!
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('allows free user to save board theme (returns 200)', async () => {
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
        '/api/settings',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boardTheme: 'wood',
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { settings: any };
      expect(data.settings.boardTheme).toBe('wood');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('allows lifetime user to save locked board theme and depth up to 22 via PATCH', async () => {
      const userState = { ...mockLifetimeUser };
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([userState]),
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
        '/api/settings',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${lifetimeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boardTheme: 'ocean',
            analysisDepth: 22,
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; settings: any };
      expect(data.success).toBe(true);
      expect(data.settings.boardTheme).toBe('ocean');
      expect(data.settings.analysisDepth).toBe(22);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('returns 400 on invalid appTheme value', async () => {
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
        '/api/settings',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appTheme: 'cyberpunk-neon',
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain('Invalid appTheme');
    });

    it('returns 400 on invalid moveSounds value', async () => {
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
        '/api/settings',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moveSounds: 'yes-please',
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain('Invalid moveSounds');
    });

    it('updates chesscomUsername when provided', async () => {
      const userState = { ...mockFreeUser };
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([userState]),
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
        '/api/settings',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${freeUserToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chesscomUsername: 'daniil_dubov',
          }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; settings: any };
      expect(data.success).toBe(true);
      expect(data.settings.chesscomUsername).toBe('daniil_dubov');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
