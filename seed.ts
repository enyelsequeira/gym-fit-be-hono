import { eq } from "drizzle-orm";

import db from "@/db";
import { foods, users } from "@/db/schema";

const foodDatabase = {
  // Proteínas
  "Vaca": { protein: 25, fat: 6, carbs: 0, baseUnit: "g", category: "protein" },
  "Claras": { protein: 10, fat: 0.3, carbs: 0, baseUnit: "g", category: "protein" },
  "Frango": { protein: 28, fat: 3.5, carbs: 0, baseUnit: "g", category: "protein" },
  "ISO FUJI": { protein: 86, fat: 0.3, carbs: 1.2, baseUnit: "g", category: "protein" },
  "Salmão": { protein: 24, fat: 7.6, carbs: 0.5, baseUnit: "g", category: "protein" },
  "Bife de atum": { protein: 23, fat: 0.9, carbs: 0, baseUnit: "g", category: "protein" },
  "Ovo": { protein: 7, fat: 6, carbs: 0.6, baseUnit: "unid", category: "protein", weight: 60 },
  "Skyr natural": { protein: 7.3, fat: 0, carbs: 4, baseUnit: "g", category: "protein" },
  "Yopro": { protein: 8.3, fat: 0.5, carbs: 5.3, baseUnit: "g", category: "protein" },
  "Peru": { protein: 29, fat: 3, carbs: 0, baseUnit: "g", category: "protein" },
  "Pescada": { protein: 20, fat: 3.5, carbs: 0, baseUnit: "g", category: "protein" },
  "Camarão cozido": { protein: 19, fat: 1, carbs: 0, baseUnit: "g", category: "protein" },
  "Iogurte grego 2% fat": { protein: 8, fat: 2, carbs: 5.5, baseUnit: "g", category: "protein" },
  "Seitan": { protein: 21, fat: 3.2, carbs: 4, baseUnit: "g", category: "protein" },
  "Tofu": { protein: 13, fat: 7, carbs: 2.5, baseUnit: "g", category: "protein" },
  "Lata de atum": { protein: 17, fat: 10, carbs: 0, baseUnit: "g", category: "protein" },
  "Hamburger salmao/pescada": { protein: 17.7, fat: 13.4, carbs: 1.7, baseUnit: "g", category: "protein" },
  "Iso HSN": { protein: 90, fat: 1, carbs: 2.4, baseUnit: "g", category: "protein" },
  "Iogurte Natural": { protein: 5, fat: 3.4, carbs: 3, baseUnit: "g", category: "protein" },
  "100% Real Whey protein": { protein: 74, fat: 5.2, carbs: 8.8, baseUnit: "g", category: "protein" },
  "Queijo Limiano -50% MG": { protein: 5.4, fat: 2.8, carbs: 0.5, baseUnit: "unid", category: "protein" },
  "Caseína Buil": { protein: 24, fat: 0.5, carbs: 3, baseUnit: "unid", category: "protein" },
  "Fiambre frango": { protein: 1.6, fat: 0.3, carbs: 0.6, baseUnit: "unid", category: "protein" },

  // Carboidratos
  "Arroz": { protein: 2.5, fat: 0.2, carbs: 28, baseUnit: "g", category: "carbs" },
  "Massa": { protein: 6, fat: 0.6, carbs: 29, baseUnit: "g", category: "carbs" },
  "Aveia": { protein: 13, fat: 6, carbs: 62, baseUnit: "g", category: "carbs" },
  "Batata": { protein: 1.6, fat: 0, carbs: 17, baseUnit: "g", category: "carbs" },
  "Banana": { protein: 0, fat: 0, carbs: 21.4, baseUnit: "g", category: "carbs" },
  "Maçã": { protein: 0, fat: 0, carbs: 12, baseUnit: "g", category: "carbs" },
  "Cuscus": { protein: 12, fat: 2, carbs: 67, baseUnit: "g", category: "carbs" },
  "Creme de arroz": { protein: 5, fat: 2, carbs: 83.5, baseUnit: "g", category: "carbs" },
  "Abacaxi": { protein: 0.5, fat: 0, carbs: 12, baseUnit: "g", category: "carbs" },
  "Manga": { protein: 0.8, fat: 0.4, carbs: 13, baseUnit: "g", category: "carbs" },
  "Mirtilos": { protein: 1, fat: 0, carbs: 7, baseUnit: "g", category: "carbs" },
  "Laranja": { protein: 0.9, fat: 0.1, carbs: 12, baseUnit: "g", category: "carbs" },
  "Pêra": { protein: 0.4, fat: 0.1, carbs: 15.5, baseUnit: "g", category: "carbs" },
  "Pão integral": { protein: 9, fat: 5, carbs: 42, baseUnit: "g", category: "carbs" },
  "Quinoa cozida": { protein: 5, fat: 2, carbs: 24, baseUnit: "g", category: "carbs" },
  "Morangos": { protein: 0.7, fat: 0.3, carbs: 6, baseUnit: "g", category: "carbs" },
  "Tortas de arroz": { protein: 0, fat: 0, carbs: 5, baseUnit: "unid", category: "carbs" },
  "Laranja média": { protein: 0, fat: 0, carbs: 9, baseUnit: "unid", category: "carbs" },
  "Pão chinês": { protein: 9.3, fat: 3.6, carbs: 54.1, baseUnit: "g", category: "carbs" },
  "Pão Centeio": { protein: 6.9, fat: 0.5, carbs: 56, baseUnit: "g", category: "carbs" },

  // Gorduras
  "Azeite": { protein: 0, fat: 99, carbs: 0, baseUnit: "g", category: "fat" },
  "Abacate": { protein: 2, fat: 15, carbs: 1.5, baseUnit: "g", category: "fat" },
  "Manteiga de amendoa": { protein: 25, fat: 56, carbs: 6.5, baseUnit: "g", category: "fat" },
  "Manteiga Amendoim": { protein: 30, fat: 46, carbs: 12, baseUnit: "g", category: "fat" },
  "Nozes": { protein: 0.61, fat: 2.61, carbs: 0.55, baseUnit: "unid", category: "fat" },
  "Chocolate negro 85%": { protein: 12, fat: 46, carbs: 7, baseUnit: "g", category: "fat" },
  "Côco ralado": { protein: 8, fat: 64, carbs: 13, baseUnit: "g", category: "fat" },
  "Caju": { protein: 18, fat: 43, carbs: 32, baseUnit: "g", category: "fat" },
};

function mapCategory(category: string): string {
  switch (category.toLowerCase()) {
    case "protein":
      return "PROTEIN_RICH";
    case "carbs":
      return "CARB_RICH";
    case "fat":
      return "FAT_RICH";
    default:
      return "OTHER";
  }
}

function determineServingUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  if (normalized === "g")
    return "GRAMS";
  if (normalized === "unid")
    return "UNIT";
  return "GRAMS";
}

async function seed() {
  try {
    console.log("Starting seed process...");

    // Get admin user
    console.log("Finding admin user...");
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, "admin"),
    });

    if (!existingAdmin) {
      throw new Error("Admin user not found. Please create an admin user first.");
    }

    console.log("Seeding foods...");

    // Transform foodDatabase into the format needed for insertion
    const foodsToInsert = Object.entries(foodDatabase).map(([name, data]) => ({
      name,
      brand: null,
      category: mapCategory(data.category),
      servingSize: 100, // All entries are per 100g unless unit is 'unid'
      servingUnit: determineServingUnit(data.baseUnit),
      calories: (data.protein * 4) + (data.fat * 9) + (data.carbs * 4),
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      picture: null,
      verified: true,
      createdBy: existingAdmin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert foods
    let insertedCount = 0;
    for (const food of foodsToInsert) {
      try {
        await db.insert(foods)
          .values(food)
          .onConflictDoNothing();
        insertedCount++;
        console.log(`Inserted food: ${food.name}`);
      }
      catch (error) {
        console.error(`Failed to insert food: ${food.name}`, error);
      }
    }

    console.log(`Successfully seeded ${insertedCount} foods`);

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

seed()
  .catch((err) => {
    console.error("Fatal error during seeding:", err);
    process.exit(1);
  });
