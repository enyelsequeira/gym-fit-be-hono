import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, gte, lte } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { UserType, weightHistory } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

// Use drizzle-zod to create schemas directly from our table definitions
const weightHistorySelectSchema = createSelectSchema(weightHistory);

// Define query parameters schema for filtering
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  source: weightHistorySelectSchema.shape.source.optional(),
});

const getUserWeights = createRoute({
  ...UserRoutesGeneral,
  path: "/users/{userId}/weights",
  method: "get",
  middleware: [isUserAuthenticated],
  request: {
    params: z.object({
      userId: z.string(),
    }),
    query: querySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(weightHistorySelectSchema),
      "User weight history",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "User not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized to view this user's weight history",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      basicErrorSchema,
      "User not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Internal server error",
    ),
  },
});

const getUserWeightsHandler: AppRouteHandler<typeof getUserWeights> = async (c) => {
  try {
    const currentUser = c.get("user");
    const params = c.req.valid("param");
    const query = c.req.valid("query");

    const targetUserId = Number(params.userId);

    console.log("[GetUserWeights] Request details:", {
      currentUserId: currentUser?.id,
      targetUserId,
      query,
    });

    // Security check: only admins or the user themselves can view weight history
    const isAdmin = currentUser?.type === UserType.ADMIN;
    const isOwnUser = currentUser?.id === targetUserId;

    if (!isAdmin && !isOwnUser) {
      console.log("[GetUserWeights] Unauthorized access attempt");
      return c.json(
        {
          success: false,
          error: {
            message: "Not authorized to view this user's weight history",
            name: "Forbidden",
          },
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }

    // Build query conditions
    const conditions = [eq(weightHistory.userId, targetUserId)];

    if (query.startDate) {
      conditions.push(gte(weightHistory.date, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(weightHistory.date, new Date(query.endDate)));
    }

    if (query.source) {
      conditions.push(eq(weightHistory.source, query.source));
    }

    // Fetch weight history
    const weights = await db.query.weightHistory.findMany({
      where: and(...conditions),
      orderBy: (weightHistory, { desc }) => [desc(weightHistory.date)],
      limit: query.limit ? Number(query.limit) : undefined,
    });

    console.log("[GetUserWeights] Successfully retrieved weight history:", {
      userId: targetUserId,
      recordCount: weights.length,
    });

    // Return raw data without any transformations
    return c.json(weights, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[GetUserWeights] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json(
      {
        success: false,
        error: {
          message: "Error retrieving weight history",
          name: error instanceof Error ? error.message : "Unknown error",
        },

      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export { getUserWeights, getUserWeightsHandler };
