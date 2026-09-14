import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import * as googleAuth from '../utils/google-auth';
import * as dbModule from '../db';
import { signSessionToken } from '../utils/jwt';

describe('Auth Routes (server/routes/auth.ts)', () => {
  const mockSecret = 'test-auth-jwt-secret';

  const mockUserRecord = {
    id: 'user_test_123',
    email: 'hikaru@chess.com',
    name: 'Hikaru Nakamura',
    avatarUrl: 'https://example.com/hikaru.jpg',
    googleId: 'google_hikaru_123',
    tier: 'free' as const,
    energy: 5,
    lastEnergyRefillAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  let validToken: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    validToken = await signSessionToken(
      {
        userId: mockUserRecord.id,
        email: mockUserRecord.email,
        tier: mockUserRecord.tier,
      },
      mockSecret
    );
  });

  describe('POST /api/auth/google', () => {
    it('returns 400 when credential is missing', async () => {
      const res = await app.request(
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Missing or invalid Google credential');
    });

    it('returns 401 when Google token verification fails', async () => {
      vi.spyOn(googleAuth, 'verifyGoogleToken').mockRejectedValue(
        new Error('Token verification failed')
      );

      const res = await app.request(
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: 'invalid-token' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string; message: string };
      expect(data.error).toBe('Google authentication failed');
      expect(data.message).toBe('Token verification failed');
    });

    it('returns 500 when DB is not configured', async () => {
      vi.spyOn(googleAuth, 'verifyGoogleToken').mockResolvedValue({
        sub: 'google_new_999',
        email: 'newplayer@chess.com',
        name: 'New Player',
        emailVerified: true,
      });

      const res = await app.request(
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: 'valid-google-credential' }),
        },
        {
          DB: undefined as unknown as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(500);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Database unavailable');
    });

    it('creates a new user when user does not exist in DB', async () => {
      vi.spyOn(googleAuth, 'verifyGoogleToken').mockResolvedValue({
        sub: 'google_new_999',
        email: 'newplayer@chess.com',
        name: 'New Player',
        picture: 'https://example.com/pic.png',
        emailVerified: true,
      });

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No existing user
            }),
          }),
        }),
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
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: 'valid-google-credential' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        token: string;
        user: {
          email: string;
          name: string;
          tier: string;
          energy: number;
          maxEnergy: number;
          isUnlimited: boolean;
        };
      };
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('newplayer@chess.com');
      expect(data.user.name).toBe('New Player');
      expect(data.user.tier).toBe('free');
      expect(data.user.energy).toBe(5);
      expect(data.user.maxEnergy).toBe(5);
      expect(data.user.isUnlimited).toBe(false);

      expect(mockDb.insert).toHaveBeenCalled();

      // Check cookie
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('session=');
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('accepts alternative idToken field in request body', async () => {
      vi.spyOn(googleAuth, 'verifyGoogleToken').mockResolvedValue({
        sub: 'google_id_token_test',
        email: 'idtoken@chess.com',
        name: 'ID Token User',
        emailVerified: true,
      });

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue({}),
        }),
      };

      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'valid-google-id-token' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { email: string } };
      expect(data.user.email).toBe('idtoken@chess.com');
    });

    it('updates existing user when found by googleId/email', async () => {
      vi.spyOn(googleAuth, 'verifyGoogleToken').mockResolvedValue({
        sub: 'google_hikaru_123',
        email: 'hikaru@chess.com',
        name: 'Hikaru Nakamura Updated',
        picture: 'https://example.com/hikaru-new.jpg',
        emailVerified: true,
      });

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserRecord]),
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
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: 'valid-google-credential' }),
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { id: string; name: string } };
      expect(data.user.id).toBe(mockUserRecord.id);
      expect(data.user.name).toBe('Hikaru Nakamura Updated');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when token is missing', async () => {
      const res = await app.request(
        '/api/auth/me',
        {},
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when token is expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 300; // expired 5 mins ago
      const expiredToken = await signSessionToken(
        {
          userId: mockUserRecord.id,
          email: mockUserRecord.email,
          tier: mockUserRecord.tier,
          exp: pastExp,
        },
        mockSecret
      );

      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when token has invalid signature', async () => {
      const wrongSecretToken = await signSessionToken(
        {
          userId: mockUserRecord.id,
          email: mockUserRecord.email,
          tier: mockUserRecord.tier,
        },
        'wrong-secret-key'
      );

      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${wrongSecretToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 when user in valid token does not exist in DB', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // User deleted / not found
            }),
          }),
        }),
      };

      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(401);
      const data = (await res.json()) as { message: string };
      expect(data.message).toBe('User not found');
    });

    it('returns user profile and energy details when authenticated via Bearer header', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserRecord]),
            }),
          }),
        }),
      };

      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        user: {
          id: string;
          email: string;
          energy: number;
          maxEnergy: number;
          isUnlimited: boolean;
        };
      };
      expect(data.user.id).toBe(mockUserRecord.id);
      expect(data.user.email).toBe(mockUserRecord.email);
      expect(data.user.energy).toBe(5);
      expect(data.user.maxEnergy).toBe(5);
      expect(data.user.isUnlimited).toBe(false);
    });

    it('returns user profile when authenticated via session cookie', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserRecord]),
            }),
          }),
        }),
      };

      vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

      const res = await app.request(
        '/api/auth/me',
        {
          headers: {
            Cookie: `session=${validToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { id: string } };
      expect(data.user.id).toBe(mockUserRecord.id);
    });

    it('recalculates energy refill if energy < 5 and hours elapsed', async () => {
      const pastRefill = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const depletedUser = {
        ...mockUserRecord,
        energy: 0,
        lastEnergyRefillAt: pastRefill,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([depletedUser]),
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
        '/api/auth/me',
        {
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        },
        {
          DB: {} as D1Database,
          JWT_SECRET: mockSecret,
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { energy: number } };
      expect(data.user.energy).toBe(3);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears cookies and returns success', async () => {
      const res = await app.request('/api/auth/logout', { method: 'POST' });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; message: string };
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeDefined();
    });
  });
});
