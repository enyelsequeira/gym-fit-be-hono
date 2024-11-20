import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { exercises, insertExercise, selectExercise } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";

const createExercise = createRoute({
  method: "post",
  path: "/exercises",
  tags: ["exercises"],
  summary: "Creates a new exercise",
  description: "Creates a new exercise",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    body: jsonContentRequired(
      insertExercise,
      "Food to be created",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectExercise,
      "The resource has been created",
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

const createExerciseHandler: AppRouteHandler<typeof createExercise> = async (ctx) => {
  const exerciseData = ctx.req.valid("json");
  try {
    const existingItem = await db.query.exercises.findFirst({
      where: (exercise, { eq }) => eq(exercise.name, exerciseData.name),
    });
    if (existingItem) {
      return ctx.json({
        success: false as const,
        error: {
          name: "DUPLICATE_RESOURCE",
          message: "A resource with this name already exists",
        },
      }, HttpStatusCodes.CONFLICT);
    }

    const [insertedExercises] = await db.insert(exercises).values({
      ...exerciseData,
    }).returning();

    return ctx.json(insertedExercises, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Create exercise] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("SQLITE_CONSTRAINT")) {
        return ctx.json({
          success: false as const,
          error: {
            name: "CONSTRAINT_ERROR",
            message: "This  item conflicts with an existing entry",
          },
        }, HttpStatusCodes.CONFLICT);
      }

      return ctx.json({
        success: false as const,
        error: {
          name: "DATABASE_ERROR",
          message: "Failed to create  item",
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

export {
  createExercise,
  createExerciseHandler,
};
