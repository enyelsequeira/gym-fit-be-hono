import { createRouter } from "@/lib/create-app";
import { getAllFood, getAllFoodsHandler } from "@/routes/foods/get-all-foods";

const foodRouter = createRouter().openapi(
  getAllFood,
  getAllFoodsHandler,
);

export default foodRouter;
