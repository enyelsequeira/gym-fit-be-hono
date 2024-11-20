import { createRoute, z } from "@hono/zod-openapi";
import { and, like, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { createPaginatedQuerySchema, createPaginatedResponseSchema } from "@/common";
import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { exercises, selectExercise } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";

export const ExcercisePaginationSchema = createPaginatedQuerySchema({
  name: z.string().optional(),
});

const getAllExercises = createRoute({
  method: "get",
  path: "/exercises",
  tags: ["exercises"],
  summary: "Get all exercises",
  description: "Get paginated list of exercises",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    query: ExcercisePaginationSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(selectExercise),
      "The paginated list of exercises",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "Not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized (non-admin user)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Server error",
    ),
  },
});

const getAllExercisesHandler: AppRouteHandler<typeof getAllExercises> = async (c) => {
  try {
    console.log("[Exercises] Fetching foods with pagination");

    // Get query parameters
    const { page, limit, name } = c.req.valid("query");
    const offset = (page - 1) * limit;

    // Build where conditions for filtering
    const whereConditions = [];

    if (name) {
      whereConditions.push(like(exercises.name, `%${name}%`));
    }

    // Combine conditions or provide default (true) if no filters
    const whereClause = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;

    // Get total count for pagination using Drizzle's count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(exercises)
      .where(whereClause)
      .execute();

    const totalCount = Number(totalCountResult[0].count);

    // Get paginated foods
    const exercisesData = await db
      .select()
      .from(exercises)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(exercises.createdAt)
      .execute();

    console.log("[exercises] Found exercises:", exercisesData.length);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      data: exercisesData,
      page: {
        size: limit,
        totalElements: totalCount,
        totalPages,
        number: page - 1, // 0-based page number for consistency
      },
    };

    return c.json(response, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Foods] Error fetching foods:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      success: false,
      error: {
        message: "Error fetching foods",
        name: error instanceof Error ? error.message : "Unknown error",
      },

    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { getAllExercises, getAllExercisesHandler };
