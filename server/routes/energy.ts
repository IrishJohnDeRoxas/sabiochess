import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { Env, AppVariables } from '../types';
import { createDb } from '../db';
import { users, guestSessions } from '../db/schema';
import { calculateEnergyStatus, consumeEnergy } from '../utils/energy';
import { optionalAuthMiddleware } from '../middleware/auth';

const energy = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * GET /api/energy/status
 * Returns current energy balance and refill countdown for authenticated user or guest.
 */
energy.get('/status', optionalAuthMiddleware, async (c) => {
  const user = c.get('user');

  if (user) {
    const status = calculateEnergyStatus(user);

    if (status.needsDbUpdate && c.env?.DB) {
      const db = createDb(c.env.DB);
      await db
        .update(users)
        .set({
          energy: status.energy,
          lastEnergyRefillAt: status.lastEnergyRefillAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      user.energy = status.energy;
      user.lastEnergyRefillAt = status.lastEnergyRefillAt;
    }

    return c.json({
      energy: status.energy,
      maxEnergy: status.maxEnergy,
      isUnlimited: status.isUnlimited,
      isGuest: false,
      nextRefillAt: status.nextRefillAt ? status.nextRefillAt.toISOString() : null,
    });
  }

  // Guest Handling via X-Visitor-Id header
  const visitorId = c.req.header('x-visitor-id')?.trim();
  if (!visitorId) {
    return c.json({ error: 'Unauthorized', message: 'Authentication or visitor ID required' }, 401);
  }

  if (c.env?.DB) {
    const db = createDb(c.env.DB);
    let [guest] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.fingerprint, visitorId))
      .limit(1);

    if (!guest) {
      const id = 'guest_' + visitorId.slice(0, 36);
      const now = new Date();
      await db.insert(guestSessions).values({
        id,
        fingerprint: visitorId,
        energy: 5,
        createdAt: now,
        updatedAt: now,
      });
      [guest] = await db
        .select()
        .from(guestSessions)
        .where(eq(guestSessions.fingerprint, visitorId))
        .limit(1);
    }

    return c.json({
      energy: guest ? guest.energy : 5,
      maxEnergy: 5,
      isUnlimited: false,
      isGuest: true,
      nextRefillAt: null,
    });
  }

  return c.json({
    energy: 5,
    maxEnergy: 5,
    isUnlimited: false,
    isGuest: true,
    nextRefillAt: null,
  });
});

/**
 * POST /api/energy/consume
 * Deducts energy for authenticated users or guests (rejects with 429 when depleted).
 */
energy.post('/consume', optionalAuthMiddleware, async (c) => {
  const user = c.get('user');

  const body = await c.req
    .json<{ amount?: number }>()
    .catch(() => ({} as { amount?: number }));
  const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 1;

  if (user) {
    const result = consumeEnergy(user, amount);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error || 'Insufficient energy',
          energy: result.energy,
          maxEnergy: result.maxEnergy,
          isUnlimited: result.isUnlimited,
          isGuest: false,
          nextRefillAt: result.nextRefillAt ? result.nextRefillAt.toISOString() : null,
        },
        429
      );
    }

    if (result.needsDbUpdate && c.env?.DB) {
      const db = createDb(c.env.DB);
      await db
        .update(users)
        .set({
          energy: result.energy,
          lastEnergyRefillAt: result.lastEnergyRefillAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      user.energy = result.energy;
      user.lastEnergyRefillAt = result.lastEnergyRefillAt;
    }

    return c.json({
      success: true,
      energy: result.energy,
      maxEnergy: result.maxEnergy,
      isUnlimited: result.isUnlimited,
      isGuest: false,
      nextRefillAt: result.nextRefillAt ? result.nextRefillAt.toISOString() : null,
    });
  }

  // Guest Handling via X-Visitor-Id header
  const visitorId = c.req.header('x-visitor-id')?.trim();
  if (!visitorId) {
    return c.json({ error: 'Unauthorized', message: 'Authentication or visitor ID required' }, 401);
  }

  if (c.env?.DB) {
    const db = createDb(c.env.DB);
    let [guest] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.fingerprint, visitorId))
      .limit(1);

    if (!guest) {
      const id = 'guest_' + visitorId.slice(0, 36);
      const now = new Date();
      await db.insert(guestSessions).values({
        id,
        fingerprint: visitorId,
        energy: 5,
        createdAt: now,
        updatedAt: now,
      });
      guest = {
        id,
        fingerprint: visitorId,
        energy: 5,
        createdAt: now,
        updatedAt: now,
      };
    }

    if (guest.energy < amount) {
      return c.json(
        {
          success: false,
          error: 'guest_energy_depleted',
          message: 'You have used all 5 free guest analyses. Sign in with Google to continue!',
          energy: guest.energy,
          maxEnergy: 5,
          isUnlimited: false,
          isGuest: true,
          nextRefillAt: null,
        },
        429
      );
    }

    const newEnergy = Math.max(0, guest.energy - amount);
    await db
      .update(guestSessions)
      .set({
        energy: newEnergy,
        updatedAt: new Date(),
      })
      .where(eq(guestSessions.id, guest.id));

    return c.json({
      success: true,
      energy: newEnergy,
      maxEnergy: 5,
      isUnlimited: false,
      isGuest: true,
      nextRefillAt: null,
    });
  }

  return c.json({
    success: true,
    energy: Math.max(0, 5 - amount),
    maxEnergy: 5,
    isUnlimited: false,
    isGuest: true,
    nextRefillAt: null,
  });
});

export default energy;
