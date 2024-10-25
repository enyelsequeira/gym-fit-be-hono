import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { selectUsersSchema } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

// Define error response schema
const errorResponseSchema = z.object({
  message: z.string(),
  error: z.string(),
});

const listUser = createRoute({
  ...UserRoutesGeneral,
  method: "get",
  middleware: [isUserAuthenticated, isAdmin], // Add both middlewares in correct order
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectUsersSchema.omit({ password: true })), // Remove password from response
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

const userListHandler: AppRouteHandler<typeof listUser> = async (c) => {
  try {
    console.log("[Users] Fetching all users");

    const users = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    console.log("[Users] Found users:", users.length);

    // Remove sensitive data before sending response
    const sanitizedUsers = users.map(({ password: _, ...user }) => user);

    return c.json(sanitizedUsers, HttpStatusCodes.OK);
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

export { listUser, userListHandler };
