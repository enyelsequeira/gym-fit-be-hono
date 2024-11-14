CREATE TABLE `weight_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`weight` real NOT NULL,
	`date` integer,
	`source` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `weight_history_user_date_idx` ON `weight_history` (`user_id`,`date`);