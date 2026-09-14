import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  googleId: text('google_id').unique(),
  tier: text('tier', { enum: ['free', 'pro', 'lifetime'] }).notNull().default('free'),
  energy: integer('energy').default(5),
  lastEnergyRefillAt: integer('last_energy_refill_at', { mode: 'timestamp_ms' }),
  appTheme: text('app_theme', { enum: ['dark', 'light'] }).notNull().default('dark'),
  boardTheme: text('board_theme', {
    enum: ['green', 'wood', 'slate', 'dark', 'ocean', 'coral'],
  }).notNull().default('green'),
  moveSounds: integer('move_sounds', { mode: 'boolean' }).notNull().default(true),
  analysisDepth: integer('analysis_depth').notNull().default(12),
  chesscomUsername: text('chesscom_username'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const promoCodes = sqliteTable('promo_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  tier: text('tier', { enum: ['lifetime'] }).notNull().default('lifetime'),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export const promoRedemptions = sqliteTable('promo_redemptions', {
  id: text('id').primaryKey(),
  promoCodeId: text('promo_code_id')
    .notNull()
    .references(() => promoCodes.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  redeemedAt: integer('redeemed_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type NewPromoRedemption = typeof promoRedemptions.$inferInsert;

export const guestSessions = sqliteTable('guest_sessions', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull().unique(),
  energy: integer('energy').notNull().default(5),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type GuestSession = typeof guestSessions.$inferSelect;
export type NewGuestSession = typeof guestSessions.$inferInsert;

export interface UserSettings {
  appTheme: 'dark' | 'light';
  boardTheme: 'green' | 'wood' | 'slate' | 'dark' | 'ocean' | 'coral';
  moveSounds: boolean;
  analysisDepth: number;
  chesscomUsername?: string | null;
}
