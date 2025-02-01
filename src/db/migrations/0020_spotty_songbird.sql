CREATE TABLE `exercise_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`plan_day_id` integer NOT NULL,
	`weight` real NOT NULL,
	`week_start` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_day_id`) REFERENCES `workout_plan_days`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_weights_user_week_idx` ON `exercise_weights` (`user_id`,`week_start`);--> statement-breakpoint
CREATE INDEX `exercise_weights_plan_day_week_idx` ON `exercise_weights` (`plan_day_id`,`week_start`);