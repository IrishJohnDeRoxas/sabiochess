-- server/db/seeds/promo_codes.sql
-- Production & Local Seed Data for SabioChess Promo Codes

INSERT OR IGNORE INTO promo_codes (id, code, tier, max_uses, used_count, is_active, created_at, updated_at)
VALUES 
  ('promo_earlybird',     'EARLYBIRD',    'lifetime', 100, 0, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('promo_sabiopro',      'SABIOPRO',     'lifetime', NULL, 0, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('promo_beta_launch',   'BETA2026',     'lifetime', 100, 0, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('promo_streamer_vip',  'STREAMERPRO',  'lifetime', 50,  0, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('promo_vip_single_1',  'VIP-X9K2-7A',  'lifetime', 1,   0, 1, unixepoch() * 1000, unixepoch() * 1000);
