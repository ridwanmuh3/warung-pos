CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY,
	`cart_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '📦' NOT NULL,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`qty` integer NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`label` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_carts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT `counters_pk` PRIMARY KEY(`tenant_id`, `key`),
	CONSTRAINT `fk_counters_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_memberships_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '📦' NOT NULL,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`qty` integer NOT NULL,
	CONSTRAINT `fk_order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`order_number` text NOT NULL,
	`created_at` text NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`cost_total` integer DEFAULT 0 NOT NULL,
	`profit` integer DEFAULT 0 NOT NULL,
	`payment_method` text NOT NULL,
	`amount_paid` integer,
	`change` integer,
	`status` text DEFAULT 'paid' NOT NULL,
	`channel` text DEFAULT 'dine-in' NOT NULL,
	`cashier` text,
	`shift_id` text,
	`voided_at` text,
	`void_reason` text,
	`user_id` text,
	`import_batch_id` text,
	CONSTRAINT `fk_orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`category` text NOT NULL,
	`emoji` text DEFAULT '📦' NOT NULL,
	`stock` integer,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`sku` text,
	`barcode` text,
	`import_batch_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_products_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`opening_cash` integer NOT NULL,
	`closing_cash` integer,
	`expected_cash` integer,
	`variance` integer,
	`note` text,
	`user_id` text,
	`import_batch_id` text,
	CONSTRAINT `fk_shifts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_shifts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`product_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`at` text NOT NULL,
	`order_id` text,
	`import_batch_id` text,
	CONSTRAINT `fk_stock_movements_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cart_items_cart_idx` ON `cart_items` (`cart_id`);--> statement-breakpoint
CREATE INDEX `carts_tenant_user_idx` ON `carts` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `carts_status_idx` ON `carts` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_tenant_user_unique` ON `memberships` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tenant_number_unique` ON `orders` (`tenant_id`,`order_number`);--> statement-breakpoint
CREATE INDEX `orders_tenant_idx` ON `orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `products_tenant_idx` ON `products` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_sku_unique` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_barcode_unique` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `shifts_tenant_idx` ON `shifts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_tenant_idx` ON `stock_movements` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);