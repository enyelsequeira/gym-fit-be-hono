import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { selectUsersSchema } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

const getMe = createRoute({
  ...UserRoutesGeneral,
  path: "/users/me",
  method: "get",
  middleware: [isUserAuthenticated],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUsersSchema.omit({ password: true }),
      "Currently authenticated user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "User not authenticated",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Internal server error",
    ),
  },
});

const getMeHandler: AppRouteHandler<typeof getMe> = async (c) => {
  try {
    // Get user from context (set by isUserAuthenticated middleware)
    const contextUser = c.get("user");

    if (!contextUser) {
      console.log("[GetMe] No user found in context");
      // This shouldn't happen if middleware is working correctly
      return c.json(
        {
          success: false,
          error: {
            message: "User not authenticated",
            name: "Unauthorized",
          },
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    console.log("[GetMe] Getting user details for:", {
      userId: contextUser.id,
      username: contextUser.username,
    });

    // Get fresh user data from database
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, contextUser.id),
    });

    if (!user) {
      console.log("[GetMe] User not found in database");
      return c.json(
        {
          success: false,
          error: {
            message: "User not found",
            name: "Unauthorized",
          },
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log("[GetMe] Successfully retrieved user details");

    return c.json(
      userWithoutPassword,
      HttpStatusCodes.OK,
    );
  }
  catch (error) {
    console.error("[GetMe] Error getting user details:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json(
      {
        success: false,
        error: {
          message: "Error retrieving user details",
          name: error instanceof Error ? error.message : "Unknown error",
        },
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export { getMe, getMeHandler };
