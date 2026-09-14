import { eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { createDb } from '../db';
import { User, users } from '../db/schema';
import { authMiddleware, DEFAULT_DEV_JWT_SECRET } from '../middleware/auth';
import { AppVariables, Env } from '../types';
import { calculateEnergyStatus, MAX_FREE_ENERGY } from '../utils/energy';
import { verifyGoogleToken } from '../utils/google-auth';
import { DEFAULT_JWT_EXPIRY_SECONDS, signSessionToken } from '../utils/jwt';

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * POST /api/auth/google
 * Verifies Google credential token, upserts user in D1 database, returns session JWT and sets cookie.
 */
auth.post('/google', async (c) => {
  const body = await c.req
    .json<{ credential?: string; idToken?: string; token?: string }>()
    .catch(() => ({}) as { credential?: string; idToken?: string; token?: string });
  const credential = body.credential || body.idToken || body.token;

  if (!credential || typeof credential !== 'string') {
    return c.json({ error: 'Missing or invalid Google credential' }, 400);
  }

  let claims;
  try {
    claims = await verifyGoogleToken(credential, {
      clientId: c.env?.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    return c.json(
      {
        error: 'Google authentication failed',
        message: err instanceof Error ? err.message : 'Invalid Google token',
      },
      401,
    );
  }

  if (!c.env?.DB) {
    return c.json({ error: 'Database unavailable' }, 500);
  }

  const db = createDb(c.env.DB);
  let user: User;

  const [existingUser] = await db
    .select()
    .from(users)
    .where(or(eq(users.googleId, claims.sub), eq(users.email, claims.email)))
    .limit(1);

  if (existingUser) {
    const updateData: Partial<typeof users.$inferInsert> = {
      googleId: claims.sub,
      name: claims.name || existingUser.name,
      avatarUrl: claims.picture || existingUser.avatarUrl,
      updatedAt: new Date(),
    };

    await db.update(users).set(updateData).where(eq(users.id, existingUser.id));
    user = {
      ...existingUser,
      ...updateData,
      updatedAt: updateData.updatedAt as Date,
    };
  } else {
    const newUser: typeof users.$inferInsert = {
      id: crypto.randomUUID(),
      email: claims.email,
      name: claims.name || null,
      avatarUrl: claims.picture || null,
      googleId: claims.sub,
      tier: 'free',
      energy: MAX_FREE_ENERGY,
      lastEnergyRefillAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);
    user = newUser as User;
  }

  const energyStatus = calculateEnergyStatus(user);
  if (energyStatus.needsDbUpdate) {
    await db
      .update(users)
      .set({
        energy: energyStatus.energy,
        lastEnergyRefillAt: energyStatus.lastEnergyRefillAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    user.energy = energyStatus.energy;
    user.lastEnergyRefillAt = energyStatus.lastEnergyRefillAt;
  }

  const secret = c.env?.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;
  const token = await signSessionToken(
    {
      userId: user.id,
      email: user.email,
      tier: user.tier,
    },
    secret,
  );

  setCookie(c, 'session', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: DEFAULT_JWT_EXPIRY_SECONDS,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tier: user.tier,
      energy: energyStatus.energy,
      maxEnergy: energyStatus.maxEnergy,
      isUnlimited: energyStatus.isUnlimited,
      nextRefillAt: energyStatus.nextRefillAt ? energyStatus.nextRefillAt.toISOString() : null,
      chesscomUsername: user.chesscomUsername ?? null,
      createdAt: user.createdAt,
    },
  });
});

/**
 * GET /api/auth/me
 * Authenticated endpoint returning current user profile, tier, energy status and refill countdown.
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
  }

  const energyStatus = calculateEnergyStatus(user);

  if (energyStatus.needsDbUpdate && c.env?.DB) {
    const db = createDb(c.env.DB);
    await db
      .update(users)
      .set({
        energy: energyStatus.energy,
        lastEnergyRefillAt: energyStatus.lastEnergyRefillAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    user.energy = energyStatus.energy;
    user.lastEnergyRefillAt = energyStatus.lastEnergyRefillAt;
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tier: user.tier,
      energy: energyStatus.energy,
      maxEnergy: energyStatus.maxEnergy,
      isUnlimited: energyStatus.isUnlimited,
      nextRefillAt: energyStatus.nextRefillAt ? energyStatus.nextRefillAt.toISOString() : null,
      chesscomUsername: user.chesscomUsername ?? null,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /api/auth/logout
 * Clears session cookies.
 */
auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' });
  deleteCookie(c, 'auth_token', { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully' });
});

export default auth;
