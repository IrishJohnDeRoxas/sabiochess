import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, extractAuthToken, DEFAULT_DEV_JWT_SECRET } from './auth';
import { signSessionToken } from '../utils/jwt';
import { Env, AppVariables } from '../types';
import * as dbModule from '../db';

describe('Auth Middleware (server/middleware/auth.ts)', () => {
  const mockSecret = 'test-jwt-secret-key-123456';
  const mockUser = {
    id: 'usr_abc123',
    email: 'gm@chess.com',
    name: 'Magnus',
    avatarUrl: 'https://avatar.com/pic.png',
    googleId: 'g_123',
    tier: 'free' as const,
    energy: 2,
    lastEnergyRefillAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let validToken: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    validToken = await signSessionToken(
      {
        userId: mockUser.id,
        email: mockUser.email,
        tier: mockUser.tier,
      },
      mockSecret
    );
  });

  function createTestApp(mockDbUser: typeof mockUser | null = mockUser) {
    const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

    // Mock createDb
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDbUser ? [mockDbUser] : []),
          }),
        }),
      }),
    };

    vi.spyOn(dbModule, 'createDb').mockReturnValue(mockDb as any);

    app.use('/protected/*', authMiddleware);
    app.get('/protected/test', (c) => {
      const user = c.get('user');
      const jwtPayload = c.get('jwtPayload');
      return c.json({ success: true, user, jwtPayload });
    });

    return { app, mockDb };
  }

  it('rejects with 401 when no token is provided', async () => {
    const { app } = createTestApp();
    const res = await app.request('/protected/test', {}, {
      DB: {} as D1Database,
      JWT_SECRET: mockSecret,
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('Authentication required');
  });

  it('rejects with 401 when invalid token is provided', async () => {
    const { app } = createTestApp();
    const res = await app.request(
      '/protected/test',
      {
        headers: {
          Authorization: 'Bearer invalid.jwt.token',
        },
      },
      {
        DB: {} as D1Database,
        JWT_SECRET: mockSecret,
      }
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('authenticates successfully via Authorization Bearer header', async () => {
    const { app } = createTestApp(mockUser);
    const res = await app.request(
      '/protected/test',
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
    const body = (await res.json()) as { success: boolean; user: typeof mockUser; jwtPayload: { userId: string } };
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(mockUser.id);
    expect(body.jwtPayload.userId).toBe(mockUser.id);
  });

  it('authenticates successfully via session cookie', async () => {
    const { app } = createTestApp(mockUser);
    const res = await app.request(
      '/protected/test',
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
    const body = (await res.json()) as { success: boolean; user: typeof mockUser };
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(mockUser.id);
  });

  it('authenticates successfully via auth_token cookie', async () => {
    const { app } = createTestApp(mockUser);
    const res = await app.request(
      '/protected/test',
      {
        headers: {
          Cookie: `auth_token=${validToken}`,
        },
      },
      {
        DB: {} as D1Database,
        JWT_SECRET: mockSecret,
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('rejects with 401 if user does not exist in DB', async () => {
    const { app } = createTestApp(null);
    const res = await app.request(
      '/protected/test',
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
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('User not found');
  });

  it('extractAuthToken extracts correctly or returns null', () => {
    const mockContextNoAuth = {
      req: {
        header: () => undefined,
      },
    };
    expect(extractAuthToken(mockContextNoAuth as any)).toBeNull();
  });
});
