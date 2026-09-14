import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { createDb } from '../db';
import { promoCodes, promoRedemptions, User, users } from '../db/schema';
import { authMiddleware, DEFAULT_DEV_JWT_SECRET } from '../middleware/auth';
import { AppVariables, Env } from '../types';
import { calculateEnergyStatus } from '../utils/energy';
import { DEFAULT_JWT_EXPIRY_SECONDS, signSessionToken } from '../utils/jwt';

const promo = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * POST /api/promo/redeem
 * Authenticated endpoint to redeem a promo code and upgrade user tier.
 */
promo.post('/redeem', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
  }

  const body = await c.req
    .json<{ code?: string }>()
    .catch(() => ({}) as { code?: string });

  const rawCode = body?.code;
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return c.json({ error: 'Invalid promo code', message: 'Please enter a valid promo code.' }, 400);
  }

  const normalizedCode = rawCode.trim().toUpperCase();

  // If user is already lifetime Pro
  if (user.tier === 'lifetime') {
    return c.json(
      {
        error: 'Already Lifetime Pro',
        message: 'Your account already has Lifetime Pro access!',
      },
      400,
    );
  }

  if (!c.env?.DB) {
    return c.json({ error: 'Database unavailable' }, 500);
  }

  const db = createDb(c.env.DB);

  // Look up promo code in database
  const [promoRecord] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, normalizedCode))
    .limit(1);

  if (!promoRecord || !promoRecord.isActive) {
    return c.json(
      {
        error: 'Invalid Code',
        message: 'The promo code you entered is invalid or inactive.',
      },
      404,
    );
  }

  // Check expiration if set
  if (promoRecord.expiresAt && promoRecord.expiresAt.getTime() <= Date.now()) {
    return c.json(
      {
        error: 'Code Expired',
        message: 'This promo code has expired.',
      },
      400,
    );
  }

  // Check max uses limit if set
  if (promoRecord.maxUses !== null && promoRecord.usedCount >= promoRecord.maxUses) {
    return c.json(
      {
        error: 'Code Limit Reached',
        message: 'This promo code has reached its maximum redemption limit.',
      },
      400,
    );
  }

  // Check if user has already redeemed this promo code
  const [existingRedemption] = await db
    .select()
    .from(promoRedemptions)
    .where(
      and(
        eq(promoRedemptions.promoCodeId, promoRecord.id),
        eq(promoRedemptions.userId, user.id),
      ),
    )
    .limit(1);

  if (existingRedemption) {
    return c.json(
      {
        error: 'Already Redeemed',
        message: 'You have already redeemed this promo code.',
      },
      400,
    );
  }

  // Record redemption and upgrade user
  const redemptionId = crypto.randomUUID();
  const now = new Date();

  await db.insert(promoRedemptions).values({
    id: redemptionId,
    promoCodeId: promoRecord.id,
    userId: user.id,
    redeemedAt: now,
  });

  await db
    .update(promoCodes)
    .set({
      usedCount: sql`${promoCodes.usedCount} + 1`,
      updatedAt: now,
    })
    .where(eq(promoCodes.id, promoRecord.id));

  const targetTier = promoRecord.tier || 'lifetime';
  await db
    .update(users)
    .set({
      tier: targetTier,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  // Update in-memory user instance
  user.tier = targetTier;
  user.updatedAt = now;

  const energyStatus = calculateEnergyStatus(user);

  // Issue new session JWT token reflecting updated tier
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
    success: true,
    message: 'Promo code applied successfully! Welcome to Lifetime Pro.',
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

export default promo;
