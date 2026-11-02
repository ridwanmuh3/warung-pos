ALTER TABLE `orders` ADD `customer_name` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `settlement_status` text DEFAULT 'settled' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `settled_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `settled_payment_method` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `settled_in_shift_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `settled_by_user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `orders_settlement_idx` ON `orders` (`tenant_id`,`settlement_status`);--> statement-breakpoint
CREATE INDEX `orders_credit_customer_idx` ON `orders` (`tenant_id`,`customer_name`);