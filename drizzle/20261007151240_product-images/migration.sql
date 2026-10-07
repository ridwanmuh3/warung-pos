ALTER TABLE `cart_items` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `order_items` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `products` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `cart_items` DROP COLUMN `emoji`;--> statement-breakpoint
ALTER TABLE `order_items` DROP COLUMN `emoji`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `emoji`;