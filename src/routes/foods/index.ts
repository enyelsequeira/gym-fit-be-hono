import { createRouter } from "@/lib/create-app";
import { createFood, createFoodHandler } from "@/routes/foods/create-food";
import { getAllFood, getAllFoodsHandler } from "@/routes/foods/get-all-foods";

const foodRouter = createRouter().openapi(
  getAllFood,
  getAllFoodsHandler,
).openapi(
  createFood,
  createFoodHandler,
);

export default foodRouter;
