import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { diets } from "@/db/schemas/diets";
import { foods } from "@/db/schemas/foods";

// Define meal types as string literals instead of an object
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "MORNING_SNACK" | "AFTERNOON_SNACK" | "EVENING_SNACK";

// Create an array of valid meal types for the enum
const MEAL_TYPES = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "MORNING_SNACK",
  "AFTERNOON_SNACK",
  "EVENING_SNACK",
] as const;

export const meals = sqliteTable("meals", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  dietId: integer("diet_id", { mode: "number" }).notNull().references(() => diets.id),
  // Use the string array directly for the enum
  type: text("type", { enum: MEAL_TYPES }).notNull(),
  name: text("name").notNull(),
  targetCalories: integer("target_calories"),
  time: integer("time", { mode: "timestamp" }).notNull(),
  duration: integer("duration"), // Expected meal duration in minutes
  notes: text("notes"),
  completed: integer("completed", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, table => ({
  dietIdIdx: index("meals_diet_id_idx").on(table.dietId),
  mealTimeIdx: index("meals_time_idx").on(table.time),
}));

export const mealFoods = sqliteTable("meal_foods", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  mealId: integer("meal_id", { mode: "number" }).notNull().references(() => meals.id),
  foodId: integer("food_id", { mode: "number" }).notNull().references(() => foods.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  notes: text("notes"),
  order: integer("order").notNull(), // Order of foods in the meal
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, table => ({
  mealIdIdx: index("meal_foods_meal_id_idx").on(table.mealId),
  foodOrderIdx: index("meal_foods_order_idx").on(table.mealId, table.order),
}));

// Helper functions for meal types
export function isMealType(value: string): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

// Type for meal with relations
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

// Type for meal foods with relations
export type MealFood = typeof mealFoods.$inferSelect;
export type NewMealFood = typeof mealFoods.$inferInsert;
