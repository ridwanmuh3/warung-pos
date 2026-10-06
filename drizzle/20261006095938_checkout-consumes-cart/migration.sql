ALTER TABLE `carts` ADD `checked_out_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `cart_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_cart_unique` ON `orders` (`cart_id`);