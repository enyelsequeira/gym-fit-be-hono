-- Save this as a .sql file, e.g., 'migrate_exercises.sql'
BEGIN TRANSACTION;

-- First drop the indexes if they exist
DROP INDEX IF EXISTS `exercises_workout_id_idx`;
DROP INDEX IF EXISTS `exercises_order_idx`;

-- Create new table with desired structure
CREATE TABLE `new_exercises` (
                                 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                                 `name` text NOT NULL,
                                 `notes` text,
                                 `alternative` text,
                                 `video` text,
                                 `created_at` integer DEFAULT (unixepoch('now')),
                                 `updated_at` integer
);

-- Copy existing data (only the columns that exist in both tables)
INSERT INTO `new_exercises` (id, name, notes, created_at)
SELECT id, name, notes, created_at
FROM exercises;

-- Drop old table
DROP TABLE `exercises`;

-- Rename new table to original name
ALTER TABLE `new_exercises` RENAME TO `exercises`;

COMMIT;
