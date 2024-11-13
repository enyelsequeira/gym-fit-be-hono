import { createRoute, z } from "@hono/zod-openapi";
import { and, like, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { createPaginatedQuerySchema, createPaginatedResponseSchema } from "@/common";
import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { selectUsersSchema, users } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

const usersPaginationSchema = createPaginatedQuerySchema({
  username: z.string().optional(),
});

// Define the complete response schema
const listUsersResponseSchema = createPaginatedResponseSchema(selectUsersSchema.omit({ password: true }));

// Define error response schema

const listUser = createRoute({
  ...UserRoutesGeneral,
  method: "get",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    query: usersPaginationSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      listUsersResponseSchema,
      "The paginated list of users",
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

const userListHandler: AppRouteHandler<typeof listUser> = async (c) => {
  try {
    console.log("[Users] Fetching users with pagination");

    // Get query parameters
    const { page, limit, username } = c.req.valid("query");
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (username) {
      whereConditions.push(like(users.username, `%${username}%`));
    }

    // Get total count for pagination using Drizzle's count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(...whereConditions))
      .execute();

    const totalCount = Number(totalCountResult[0].count);

    // Get paginated users
    const userResults = await db
      .select()
      .from(users)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt)
      .execute();

    console.log("[Users] Found users:", userResults.length);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    // Remove sensitive data and prepare response
    const sanitizedUsers = userResults.map(({ password: _, ...user }) => user);

    const response = {
      data: sanitizedUsers,
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
    console.error("[Users] Error fetching users:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      success: false,
      error: {
        name: "InternalServerError",
        message: error instanceof Error ? error.message : "An unexpected error occurred while fetching users",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { listUser, userListHandler };
