import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { foods, insertFoodSchema, selectFoods } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";

const errorResponseSchema = z.object({
  message: z.string(), // Human-readable error message
  error: z.string(), // Error code or type
});

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
    // Define possible response types and their schemas
    [HttpStatusCodes.OK]: jsonContent(
      selectFoods,
      "The food has been created",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorResponseSchema,
      "Resource already exists",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      errorResponseSchema,
      "The validation error(s)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
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
      // Return conflict error if username exists
      return ctx.json(
        {
          message: "Resource already exists",
          error: "DUPLICATE_RESOURCE",
        },
        HttpStatusCodes.CONFLICT,
      );
    }
    const [insertFood] = await db.insert(foods).values({
      ...foodData,
      createdBy: Number(contextUser?.id),
    }).returning();

    return ctx.json(insertFood, HttpStatusCodes.OK);
  }
  catch (error) {
    console.log(error);

    if (error instanceof Error) {
      // Handle SQLite-specific constraint violations
      if (error.message.includes("SQLITE_CONSTRAINT")) {
        return ctx.json(
          {
            message: "Resource already exists",
            error: "CONSTRAINT_ERROR",
          },
          HttpStatusCodes.CONFLICT,
        );
      }
      console.log({
        ERROR: error,
      });
      // Handle general database errors
      return ctx.json(
        {
          message: "Failed to create user",
          error: "DATABASE_ERROR",
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    // Handle unexpected error types
    return ctx.json(
      {
        message: "An unexpected error occurred",
        error: "UNKNOWN_ERROR",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export { createFood, createFoodHandler };
