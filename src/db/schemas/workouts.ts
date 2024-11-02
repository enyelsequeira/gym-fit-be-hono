import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema";

export const workouts = sqliteTable("workouts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().references(() => users.id),
  name: text("name").notNull(),
  date: integer("date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  duration: integer("duration").notNull(), // in minutes
  caloriesBurned: real("calories_burned"),
  notes: text("notes"),
  rating: integer("rating"), // User's rating of the workout (1-5)
  completed: integer("completed", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => ({
  userIdIdx: index("workouts_user_id_idx").on(table.userId),
  dateIdx: index("workouts_date_idx").on(table.date),
}));
