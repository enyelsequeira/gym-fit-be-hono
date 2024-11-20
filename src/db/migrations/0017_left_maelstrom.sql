/*
 SQLite does not support "Dropping foreign key" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
DROP INDEX IF EXISTS `exercises_workout_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `exercises_order_idx`;--> statement-breakpoint
ALTER TABLE `exercises` ADD `alternative` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `video` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `workout_id`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `sets`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `repetitions`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `weight`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `duration`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `distance`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `rest_time`;--> statement-breakpoint
ALTER TABLE `exercises` DROP COLUMN `order`;