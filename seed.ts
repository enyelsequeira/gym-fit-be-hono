import { eq } from "drizzle-orm";

import db from "@/db";
import { users } from "@/db/schema";
import { foods } from "@/db/schemas/foods";

import foodsData from "./food.json";

async function seed() {
  try {
    console.log("Starting seed process...");

    // First, let's create a default admin user if it doesn't exist
    console.log("Creating default admin user...");
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, "admin"),
    });

    let adminId: number;

    if (!existingAdmin) {
      const [adminUser] = await db.insert(users)
        .values({
          username: "admin",
          name: "Admin",
          lastName: "User",
          email: "admin@example.com",
          password: "adminpassword",
          type: "ADMIN",
        })
        .returning();
      adminId = adminUser.id;
      console.log("Admin user created with ID:", adminId);
    }
    else {
      adminId = existingAdmin.id;
      console.log("Using existing admin with ID:", adminId);
    }

    console.log("Seeding foods...");

    // Prepare foods data with proper barcode handling
    const foodsWithAdmin = foodsData.foods.map((food, index) => ({
      ...food,
      barcode: food.barcode || null, // Convert empty string to null
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert foods one by one to handle potential conflicts
    let insertedCount = 0;
    for (const food of foodsWithAdmin) {
      try {
        await db.insert(foods)
          .values(food)
          .onConflictDoNothing(); // Skip if there's a conflict
        insertedCount++;
        if (insertedCount % 10 === 0) {
          console.log(`Inserted ${insertedCount} foods...`);
        }
      }
      catch (error) {
        console.error(`Failed to insert food: ${food.name}`, error);
        continue; // Continue with next food even if one fails
      }
    }

    console.log(`Successfully seeded ${insertedCount} foods`);

    // Verify the insertion
    const foodCount = await db.query.foods.findMany();
    console.log(`Total foods in database: ${foodCount.length}`);
  }
  catch (error) {
    console.error("Error seeding database:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

// Helper function to generate a unique barcode (if needed)
function generateUniqueBarcode(index: number): string {
  return `GEN${String(index).padStart(8, "0")}`;
}

seed()
  .catch((err) => {
    console.error("Fatal error during seeding:", err);
    process.exit(1);
  });
