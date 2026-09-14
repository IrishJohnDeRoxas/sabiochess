import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { Env, AppVariables } from '../types';
import { verifySessionToken, JwtUserPayload } from '../utils/jwt';
import { createDb } from '../db';
import { users, User } from '../db/schema';

export const DEFAULT_DEV_JWT_SECRET = 'dev-jwt-secret-key-do-not-use-in-production';

/**
 * Extracts JWT token from Authorization Bearer header or session cookies.
 */
export function extractAuthToken(c: Context<{ Bindings: Env; Variables: AppVariables }>): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  try {
    const sessionCookie = getCookie(c, 'session') || getCookie(c, 'auth_token');
    if (sessionCookie && sessionCookie.trim()) {
      return sessionCookie.trim();
    }
  } catch {
    // Safely ignore if req header/cookie is unavailable
  }

  return null;
}

/**
 * Middleware that requires a valid authenticated session.
 * Rejects with 401 if missing, invalid, or user not found.
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
) {
  const token = extractAuthToken(c);

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
  }

  const secret = c.env?.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;
  let payload: JwtUserPayload;

  try {
    payload = await verifySessionToken(token, secret);
  } catch (err) {
    return c.json(
      {
        error: 'Unauthorized',
        message: err instanceof Error ? err.message : 'Invalid or expired session token',
      },
      401
    );
  }

  if (c.env?.DB) {
    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
    }

    c.set('user', user);
  }

  c.set('jwtPayload', payload);
  await next();
}

/**
 * Middleware that extracts user if valid session token is provided,
 * but proceeds without error if no token is present (useful for guest/public endpoints).
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  next: Next
) {
  const token = extractAuthToken(c);

  if (token) {
    const secret = c.env?.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;
    try {
      const payload = await verifySessionToken(token, secret);
      if (c.env?.DB) {
        const db = createDb(c.env.DB);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user) {
          c.set('user', user);
        }
      }
      c.set('jwtPayload', payload);
    } catch {
      // Ignore token verification error for optional auth and proceed as guest
    }
  }

  await next();
}
