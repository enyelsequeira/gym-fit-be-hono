CREATE TABLE `workout_plan_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`day` text NOT NULL,
	`order` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets` text NOT NULL,
	`reps` text NOT NULL,
	`notes` text,
	`rest_time` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `workout_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_plan_days_plan_day_idx` ON `workout_plan_days` (`plan_id`,`day`);--> statement-breakpoint
CREATE INDEX `workout_plan_days_order_idx` ON `workout_plan_days` (`plan_id`,`day`,`order`);--> statement-breakpoint
CREATE INDEX `workout_plans_user_id_idx` ON `workout_plans` (`user_id`);--> statement-breakpoint
CREATE INDEX `workout_plans_date_range_idx` ON `workout_plans` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `workout_plans_active_idx` ON `workout_plans` (`user_id`,`is_active`);