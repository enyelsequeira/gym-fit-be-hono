CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category` text NOT NULL,
	`serving_size` real NOT NULL,
	`serving_unit` text NOT NULL,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`picture` text,
	`barcode` text,
	`verified` integer DEFAULT false,
	`created_by` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foods_barcode_unique` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `foods_name_idx` ON `foods` (`name`);--> statement-breakpoint
CREATE INDEX `foods_barcode_idx` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `foods_category_idx` ON `foods` (`category`);