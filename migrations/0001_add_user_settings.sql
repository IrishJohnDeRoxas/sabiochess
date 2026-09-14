ALTER TABLE `users` ADD `app_theme` text DEFAULT 'dark' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `board_theme` text DEFAULT 'green' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `move_sounds` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `analysis_depth` integer DEFAULT 12 NOT NULL;
