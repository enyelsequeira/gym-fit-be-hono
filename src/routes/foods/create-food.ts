import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { foods, insertFoodSchema, selectFoods } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";

const createFood = createRoute({
  method: "post",
  path: "/foods",
  tags: ["foods"],
  summary: "Create a new food",
  description: "Create a new food",
  middleware: [isUserAuthenticated],
  request: {
    body: jsonContentRequired(
      insertFoodSchema,
      "Food to be created",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFoods,
      "The food has been created",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      basicErrorSchema,
      "Resource already exists",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      basicErrorSchema,
      "The validation error(s)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Internal server error",
    ),
  },
});

const createFoodHandler: AppRouteHandler<typeof createFood> = async (ctx) => {
  const foodData = ctx.req.valid("json");
  const contextUser = ctx.get("user");

  try {
    const existingProduct = await db.query.foods.findFirst({
      where: (foods, { eq }) => eq(foods.name, foodData.name),
    });
    if (existingProduct) {
      return ctx.json({
        success: false as const,
        error: {
          name: "DUPLICATE_RESOURCE",
          message: "A food item with this name already exists",
        },
      }, HttpStatusCodes.CONFLICT);
    }

    const [insertFood] = await db.insert(foods).values({
      ...foodData,
      createdBy: Number(contextUser?.id),
    }).returning();

    return ctx.json(insertFood, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Create Food] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("SQLITE_CONSTRAINT")) {
        return ctx.json({
          success: false as const,
          error: {
            name: "CONSTRAINT_ERROR",
            message: "This food item conflicts with an existing entry",
          },
        }, HttpStatusCodes.CONFLICT);
      }

      return ctx.json({
        success: false as const,
        error: {
          name: "DATABASE_ERROR",
          message: "Failed to create food item",
        },
      }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    return ctx.json({
      success: false as const,
      error: {
        name: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { createFood, createFoodHandler };
