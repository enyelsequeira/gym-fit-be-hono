// db/schema.ts
import type { InferSelectModel } from "drizzle-orm";

import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const UserType = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

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
});

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

export type Session = InferSelectModel<typeof sessions>;
