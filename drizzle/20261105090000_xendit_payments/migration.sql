CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`provider` text DEFAULT 'xendit' NOT NULL,
	`reference_id` text NOT NULL,
	`provider_ref` text,
	`status` text DEFAULT 'creating' NOT NULL,
	`amount` integer NOT NULL,
	`qr_string` text,
	`expires_at` text,
	`paid_at` text,
	`failure_code` text,
	`raw_payload` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_reference_unique` ON `payments` (`reference_id`);--> statement-breakpoint
CREATE INDEX `payments_tenant_order_idx` ON `payments` (`tenant_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `payments_provider_ref_idx` ON `payments` (`provider`,`provider_ref`);
