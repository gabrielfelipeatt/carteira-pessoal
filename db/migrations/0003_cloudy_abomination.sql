CREATE TABLE `fixed_expense_skips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fixed_expense_id` text NOT NULL,
	`competencia` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fixed_expense_id`) REFERENCES `fixed_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fixed_expense_skips_fixed_expense_id_competencia_unique` ON `fixed_expense_skips` (`fixed_expense_id`,`competencia`);--> statement-breakpoint
CREATE TABLE `fixed_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`description` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`day_of_month` integer NOT NULL,
	`payment_method_id` text NOT NULL,
	`credit_card_id` text,
	`account_id` text,
	`start_month` text NOT NULL,
	`end_month` text,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`credit_card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `fixed_expenses_user_id_idx` ON `fixed_expenses` (`user_id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `fixed_expense_id` text REFERENCES fixed_expenses(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `competencia` text;--> statement-breakpoint
CREATE INDEX `transactions_fixed_expense_id_idx` ON `transactions` (`fixed_expense_id`);