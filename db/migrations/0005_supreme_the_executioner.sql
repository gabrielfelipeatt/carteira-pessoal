ALTER TABLE `transactions` ADD `installment_group_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `installment_number` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `installment_total` integer;--> statement-breakpoint
CREATE INDEX `transactions_installment_group_id_idx` ON `transactions` (`installment_group_id`);