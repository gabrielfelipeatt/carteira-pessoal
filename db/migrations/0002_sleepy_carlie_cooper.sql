ALTER TABLE `accounts` ADD `is_control_account` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_cards` ADD `control_account_id` text REFERENCES accounts(id);