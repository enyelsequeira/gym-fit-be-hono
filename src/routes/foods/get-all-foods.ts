import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { selectFoods } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";

const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
});
const getAllFood = createRoute({
  method: "get",
  path: "/foods",
  tags: ["foods"],
  summary: "Get all foods",
  description: "Get all foods",
  middleware: [isUserAuthenticated, isAdmin],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectFoods), // Remove password from response
      "The list of users",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorResponseSchema,
      "Not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorResponseSchema,
      "Not authorized (non-admin user)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "Server error",
    ),
  },
});

const getAllFoodsHandler: AppRouteHandler<typeof getAllFood> = async (c) => {
  try {
    const allFoods = await db.query.foods.findMany();
    return c.json(allFoods, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Users] Error fetching users:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      message: "Error fetching users",
      error: error instanceof Error ? error.message : "Unknown error",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { getAllFood, getAllFoodsHandler };
