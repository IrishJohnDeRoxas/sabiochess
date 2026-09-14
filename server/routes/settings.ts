import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { Env, AppVariables } from '../types';
import { createDb } from '../db';
import { users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import {
  extractUserSettings,
  validateAndSanitizeSettings,
} from '../utils/settings';

const settings = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * GET /api/settings
 * Return settings for the authenticated user (fallback to defaults if not set).
 */
settings.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
  }

  const userSettings = extractUserSettings(user);

  return c.json({
    settings: userSettings,
  });
});

/**
 * PUT /api/settings or PATCH /api/settings
 * Validate and update user settings in D1.
 */
const handleUpdateSettings = async (c: any) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const validation = validateAndSanitizeSettings(user, body);

  if (!validation.valid) {
    return c.json({ error: validation.error }, validation.statusCode);
  }

  if (Object.keys(validation.settings).length > 0 && c.env?.DB) {
    const db = createDb(c.env.DB);
    await db
      .update(users)
      .set({
        ...validation.settings,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    Object.assign(user, validation.settings);
  }

  return c.json({
    success: true,
    settings: extractUserSettings(user),
  });
};

settings.put('/', authMiddleware, handleUpdateSettings);
settings.patch('/', authMiddleware, handleUpdateSettings);

export default settings;
