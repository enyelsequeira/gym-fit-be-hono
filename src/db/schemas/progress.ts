// Progress tracking table
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema";

export const progress = sqliteTable("progress", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().references(() => users.id),
  date: integer("date", { mode: "timestamp" }).notNull(),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  muscleWeight: real("muscle_weight"),
  waistCircumference: real("waist_circumference"),
  chestCircumference: real("chest_circumference"),
  armCircumference: real("arm_circumference"),
  thighCircumference: real("thigh_circumference"),
  notes: text("notes"),
  picture: text("picture"), // Progress picture URL
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, table => ({
  userDateIdx: index("progress_user_date_idx").on(table.userId, table.date),
}));
