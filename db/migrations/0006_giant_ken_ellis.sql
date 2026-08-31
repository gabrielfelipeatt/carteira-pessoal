CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`target_month` text,
	`color` text DEFAULT '#1B4DD1' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goals_user_id_idx` ON `goals` (`user_id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `goal_id` text REFERENCES goals(id);--> statement-breakpoint
CREATE INDEX `transactions_goal_id_idx` ON `transactions` (`goal_id`);