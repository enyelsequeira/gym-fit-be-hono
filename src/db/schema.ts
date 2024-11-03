// db/schema.ts
import type { InferSelectModel } from "drizzle-orm";

import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const UserType = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export const foods = sqliteTable("foods", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull(),
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  fat: real("fat").notNull(),
  carbs: real("carbs").notNull(),
  picture: text("picture"),
  barcode: text("barcode").unique(),
  verified: integer("verified", { mode: "boolean" }).default(false), // Admin-verified food
  createdBy: integer("created_by", { mode: "number" }).notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => ({
  nameIdx: index("foods_name_idx").on(table.name),
  barcodeIdx: index("foods_barcode_idx").on(table.barcode),
  categoryIdx: index("foods_category_idx").on(table.category),
}));

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
// export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

// Type for meal foods with relations
// export type MealFood = typeof mealFoods.$inferSelect;
export type NewMealFood = typeof mealFoods.$inferInsert;

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

// Users table
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" })
    .primaryKey({ autoIncrement: true }),
  username: text("username")
    .notNull()
    .unique(),
  name: text("name")
    .notNull(),
  lastName: text("lastName")
    .notNull(),
  password: text("password")
    .notNull(),
  type: text("type", { enum: ["ADMIN", "USER"] })
    .notNull()
    .default("USER"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
  email: text("email").notNull().unique(),
  height: real("height"), // in cm
  weight: real("weight"), // in kg
  targetWeight: real("target_weight"),
  dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
  gender: text("gender", { enum: ["MALE", "FEMALE", "OTHER"] }),
  activityLevel: text("activity_level", { enum: ["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE", "EXTREME"] }),

});

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

// Type definitions
export type User = InferSelectModel<typeof users>;

// Custom Zod schemas for different user scenarios
export const userSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50),
  name: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8),
  type: z.enum([UserType.ADMIN, UserType.USER]),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

// Update the select and insert schemas
export const selectUsersSchema = createSelectSchema(users);
export const selectFoods = createSelectSchema(foods);

export const insertUsersSchema = createInsertSchema(
  users,
  {
    username: schema => schema.username.min(3).max(50),
    name: schema => schema.name.min(1).max(100),
    lastName: schema => schema.lastName.min(1).max(100),
    password: schema => schema.password.min(8),
    type: schema => z.enum([UserType.ADMIN, UserType.USER]),
  },
).required({
  username: true,
  name: true,
  lastName: true,
  password: true,
  type: true,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFoodSchema = createInsertSchema(
  foods,
  {
    name: schema => schema.name.trim().min(1).max(100),
    brand: schema => schema.brand.trim().min(1).max(100),
    category: schema => schema.category.min(1).max(100),
    servingSize: schema => schema.servingSize.min(1),
    servingUnit: schema => schema.servingUnit,
    calories: schema => schema.calories.min(1),
    protein: schema => schema.protein.min(1),
    fat: schema => schema.fat.min(1),
    carbs: schema => schema.carbs.min(1),
    picture: schema => schema.picture.trim().min(1).max(1000),
    barcode: schema => schema.barcode.trim().min(1).max(1000),
  },
).required({
  name: true,
  brand: true,
  category: true,
  servingSize: true,
  servingUnit: true,
  calories: true,
  protein: true,
  fat: true,
  carbs: true,
  picture: true,
  barcode: true,

}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

// Session related schemas
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Relations configuration
export const usersRelations = relations(users, ({ many }) => ({
  workouts: many(workouts),
  diets: many(diets),
  createdFoods: many(foods, { relationName: "creator" }),
  progress: many(progress),
  exerciseTemplates: many(exerciseTemplates, { relationName: "templateCreator" }),
}));

export const foodsRelations = relations(foods, ({ one, many }) => ({
  creator: one(users, {
    fields: [foods.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  mealFoods: many(mealFoods),
}));

export const exerciseTemplatesRelations = relations(exerciseTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [exerciseTemplates.createdBy],
    references: [users.id],
    relationName: "templateCreator",
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
  exercises: many(exercises),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
}));

export const dietsRelations = relations(diets, ({ one, many }) => ({
  user: one(users, {
    fields: [diets.userId],
    references: [users.id],
  }),
  meals: many(meals),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  diet: one(diets, {
    fields: [meals.dietId],
    references: [diets.id],
  }),
  mealFoods: many(mealFoods),
}));

export const mealFoodsRelations = relations(mealFoods, ({ one }) => ({
  meal: one(meals, {
    fields: [mealFoods.mealId],
    references: [meals.id],
  }),
  food: one(foods, {
    fields: [mealFoods.foodId],
    references: [foods.id],
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, {
    fields: [progress.userId],
    references: [users.id],
  }),
}));

export type Session = InferSelectModel<typeof sessions>;

export type Workout = InferSelectModel<typeof workouts>;
export type Exercise = InferSelectModel<typeof exercises>;
export type ExerciseTemplate = InferSelectModel<typeof exerciseTemplates>;
export type Food = InferSelectModel<typeof foods>;
export type Diet = InferSelectModel<typeof diets>;
export type Meal = InferSelectModel<typeof meals>;
export type MealFood = InferSelectModel<typeof mealFoods>;
export type Progress = InferSelectModel<typeof progress>;
