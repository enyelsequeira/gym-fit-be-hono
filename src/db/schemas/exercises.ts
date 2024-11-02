import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema";
import { workouts } from "@/db/schemas/workouts";

export const exercises = sqliteTable("exercises", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  workoutId: integer("workout_id", { mode: "number" }).notNull().references(() => workouts.id),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  repetitions: integer("repetitions").notNull(),
  weight: real("weight"),
  duration: integer("duration"), // in seconds, for cardio exercises
  distance: real("distance"), // for cardio exercises
  restTime: integer("rest_time"), // rest time between sets in seconds
  notes: text("notes"),
  order: integer("order").notNull(), // Exercise order in workout
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, table => ({
  workoutIdIdx: index("exercises_workout_id_idx").on(table.workoutId),
  exerciseOrderIdx: index("exercises_order_idx").on(table.workoutId, table.order),
}));

// Exercise Templates for quick workout creation
export const exerciseTemplates = sqliteTable("exercise_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  muscleGroups: text("muscle_groups").notNull(), // Comma-separated list of muscle groups
  equipment: text("equipment"), // Required equipment
  videoUrl: text("video_url"), // Tutorial video URL
  createdBy: integer("created_by", { mode: "number" }).references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
