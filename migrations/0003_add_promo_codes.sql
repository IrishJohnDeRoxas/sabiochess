CREATE TABLE IF NOT EXISTS `promo_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL UNIQUE,
	`tier` text DEFAULT 'lifetime' NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `promo_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`promo_code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`redeemed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `promo_redemptions_code_user_idx` ON `promo_redemptions` (`promo_code_id`, `user_id`);
