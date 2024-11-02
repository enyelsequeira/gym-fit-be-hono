import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema";

export const diets = sqliteTable("diets", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id", { mode: "number" }).notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["WEIGHT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "CUSTOM"] }).notNull(),
  calorieTarget: integer("calorie_target").notNull(),
  proteinTarget: real("protein_target"),
  carbTarget: real("carb_target"),
  fatTarget: real("fat_target"),
  startDate: integer("start_date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  endDate: integer("end_date", { mode: "timestamp" }),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => ({
  userIdIdx: index("diets_user_id_idx").on(table.userId),
  activeDietIdx: index("diets_active_idx").on(table.userId, table.active),
}));
