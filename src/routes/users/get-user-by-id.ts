import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { selectUsersSchema, users } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

const getUserById = createRoute({
  ...UserRoutesGeneral,
  path: "/users/{userId}/info",
  method: "get",
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUsersSchema.omit({ password: true }),
      "User details except password",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "Not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized (non-admin user)",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "User not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Server error",
    ),
  },
});

const getUserByIdHandler: AppRouteHandler<typeof getUserById> = async (c) => {
  try {
    const query = c.req.valid("param");
    const targetId = Number(query.userId);
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetId),
    });

    if (!user) {
      return c.json(
        { message: "User not found" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return c.json(
      userWithoutPassword,
      HttpStatusCodes.OK,
    );
  }
  catch (error) {
    console.error("[GetUserInfo] Error:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json(
      {
        success: false,
        error: {
          message: "Error retrieving user info",
          name: error instanceof Error ? error.message : "Unknown error",
        },

      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export { getUserById, getUserByIdHandler };
