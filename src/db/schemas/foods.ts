import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "@/db/schema";

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
