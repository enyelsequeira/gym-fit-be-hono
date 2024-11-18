DROP INDEX IF EXISTS `foods_barcode_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `foods_barcode_idx`;--> statement-breakpoint
ALTER TABLE `foods` DROP COLUMN `barcode`;