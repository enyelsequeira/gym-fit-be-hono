import { createRoute, z } from "@hono/zod-openapi";
import { and, like, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { createPaginatedQuerySchema, createPaginatedResponseSchema } from "@/common";
import db from "@/db";
import { foods, selectFoods } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";

export const foodsPaginationSchema = createPaginatedQuerySchema({
  name: z.string().optional(),
  category: z.string().optional(),
});

// Define error response schema
const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
});

const getAllFood = createRoute({
  method: "get",
  path: "/foods",
  tags: ["foods"],
  summary: "Get all foods",
  description: "Get paginated list of foods",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    query: foodsPaginationSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(selectFoods),
      "The paginated list of foods",
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
    console.log("[Foods] Fetching foods with pagination");

    // Get query parameters
    const { page, limit, name, category } = c.req.valid("query");
    const offset = (page - 1) * limit;

    // Build where conditions for filtering
    const whereConditions = [];

    if (name) {
      whereConditions.push(like(foods.name, `%${name}%`));
    }

    if (category) {
      whereConditions.push(like(foods.category, `%${category}%`));
    }

    // Combine conditions or provide default (true) if no filters
    const whereClause = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;

    // Get total count for pagination using Drizzle's count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods)
      .where(whereClause)
      .execute();

    const totalCount = Number(totalCountResult[0].count);

    // Get paginated foods
    const foodResults = await db
      .select()
      .from(foods)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(foods.createdAt)
      .execute();

    console.log("[Foods] Found foods:", foodResults.length);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      data: foodResults,
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
      message: "Error fetching foods",
      error: error instanceof Error ? error.message : "Unknown error",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { getAllFood, getAllFoodsHandler };
