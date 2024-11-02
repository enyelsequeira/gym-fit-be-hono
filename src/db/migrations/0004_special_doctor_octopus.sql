CREATE TABLE `diets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`calorie_target` integer NOT NULL,
	`protein_target` real,
	`carb_target` real,
	`fat_target` real,
	`start_date` integer,
	`end_date` integer,
	`active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercise_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`muscle_groups` text NOT NULL,
	`equipment` text,
	`video_url` text,
	`created_by` integer,
	`created_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`name` text NOT NULL,
	`sets` integer NOT NULL,
	`repetitions` integer NOT NULL,
	`weight` real,
	`duration` integer,
	`distance` real,
	`rest_time` integer,
	`notes` text,
	`order` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `meal_foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`notes` text,
	`order` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`diet_id` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`target_calories` integer,
	`time` integer NOT NULL,
	`duration` integer,
	`notes` text,
	`completed` integer DEFAULT false,
	`created_at` integer,
	FOREIGN KEY (`diet_id`) REFERENCES `diets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` integer NOT NULL,
	`weight` real,
	`body_fat` real,
	`muscle_weight` real,
	`waist_circumference` real,
	`chest_circumference` real,
	`arm_circumference` real,
	`thigh_circumference` real,
	`notes` text,
	`picture` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`date` integer,
	`duration` integer NOT NULL,
	`calories_burned` real,
	`notes` text,
	`rating` integer,
	`completed` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `email` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `height` real;--> statement-breakpoint
ALTER TABLE `users` ADD `weight` real;--> statement-breakpoint
ALTER TABLE `users` ADD `target_weight` real;--> statement-breakpoint
ALTER TABLE `users` ADD `date_of_birth` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `users` ADD `activity_level` text;--> statement-breakpoint
CREATE INDEX `diets_user_id_idx` ON `diets` (`user_id`);--> statement-breakpoint
CREATE INDEX `diets_active_idx` ON `diets` (`user_id`,`active`);--> statement-breakpoint
CREATE INDEX `exercises_workout_id_idx` ON `exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `exercises_order_idx` ON `exercises` (`workout_id`,`order`);--> statement-breakpoint
CREATE UNIQUE INDEX `foods_barcode_unique` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `foods_name_idx` ON `foods` (`name`);--> statement-breakpoint
CREATE INDEX `foods_barcode_idx` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `foods_category_idx` ON `foods` (`category`);--> statement-breakpoint
CREATE INDEX `meal_foods_meal_id_idx` ON `meal_foods` (`meal_id`);--> statement-breakpoint
CREATE INDEX `meal_foods_order_idx` ON `meal_foods` (`meal_id`,`order`);--> statement-breakpoint
CREATE INDEX `meals_diet_id_idx` ON `meals` (`diet_id`);--> statement-breakpoint
CREATE INDEX `meals_time_idx` ON `meals` (`time`);--> statement-breakpoint
CREATE INDEX `progress_user_date_idx` ON `progress` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `workouts_user_id_idx` ON `workouts` (`user_id`);--> statement-breakpoint
CREATE INDEX `workouts_date_idx` ON `workouts` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);