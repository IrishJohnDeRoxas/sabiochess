import { sign, verify, decode } from 'hono/jwt';

export interface JwtUserPayload {
  userId: string;
  email: string;
  tier: string;
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

export interface SignTokenOptions {
  expiresInSeconds?: number;
}

export const DEFAULT_JWT_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days (persistent session)

/**
 * Creates and signs a session JWT for authenticated users using Web Crypto API.
 */
export async function signSessionToken(
  payload: Omit<JwtUserPayload, 'exp' | 'iat'> & { exp?: number; iat?: number },
  secret: string,
  options?: SignTokenOptions
): Promise<string> {
  if (!secret || typeof secret !== 'string') {
    throw new Error('JWT secret is required and must be a non-empty string');
  }

  if (!payload.userId || !payload.email || !payload.tier) {
    throw new Error('Missing required user payload fields (userId, email, tier)');
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_JWT_EXPIRY_SECONDS;
  const exp = payload.exp ?? nowInSeconds + expiresIn;
  const iat = payload.iat ?? nowInSeconds;

  const fullPayload = {
    ...payload,
    iat,
    exp,
  };

  return await sign(fullPayload, secret, 'HS256');
}

/**
 * Verifies and decodes a session JWT using the secret.
 * Validates expiration and required payload fields (userId, email, tier, exp).
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<JwtUserPayload> {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid token');
  }

  if (!secret || typeof secret !== 'string') {
    throw new Error('JWT secret is required');
  }

  try {
    const verified = (await verify(token, secret, 'HS256')) as unknown as JwtUserPayload;

    if (!verified || typeof verified !== 'object') {
      throw new Error('Invalid token payload');
    }

    if (!verified.userId || !verified.email || !verified.tier || typeof verified.exp !== 'number') {
      throw new Error('Token payload missing required claims (userId, email, tier, exp)');
    }

    return verified;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Token payload missing')) {
      throw error;
    }
    throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Invalid signature or expired'}`);
  }
}

/**
 * Decodes a JWT token without verifying its signature.
 */
export function decodeSessionToken(token: string): {
  header: Record<string, unknown>;
  payload: JwtUserPayload;
} {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing or invalid token');
  }

  const decoded = decode(token);
  return {
    header: decoded.header as unknown as Record<string, unknown>,
    payload: decoded.payload as unknown as JwtUserPayload,
  };
}
