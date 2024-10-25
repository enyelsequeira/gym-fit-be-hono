import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { insertUsersSchema, users } from "@/db/schema";
import {
  baseUserResponseSchema,
  conflictErrorSchema,
  hashPassword,
  UserRoutesGeneral,
} from "@/routes/users/user.routes";

const createUser = createRoute({
  ...UserRoutesGeneral,
  method: "post",
  request: {
    body: jsonContentRequired(
      insertUsersSchema,
      "user to be create",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      baseUserResponseSchema,
      "The created user",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      conflictErrorSchema,
      "Resource already exists",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertUsersSchema),
      "The validation error(s)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Internal server error",
    ),
  },
});

const createUserHandler: AppRouteHandler<typeof createUser> = async (c) => {
  const userData = c.req.valid("json");

  try {
    const hashedPassword = hashPassword(userData.password);

    const [insertedUser] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();

    const { password: _password, ...userWithoutPassword } = insertedUser;
    return c.json(userWithoutPassword, HttpStatusCodes.OK);
  }
  catch (error) {
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.username")) {
      return c.json(
        {
          message: "Username already exists",
          error: "Duplicate username",
          field: "username",
        },
        HttpStatusCodes.CONFLICT,
      );
    }

    // Handle other database errors
    if (error instanceof Error) {
      return c.json(
        {
          message: "Failed to create user",
          error: "Database error",
          field: "unknown",
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    // Handle unexpected errors
    return c.json(
      {
        message: "An unexpected error occurred",
        error: "Unknown error",
        field: "unknown",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
export { createUser, createUserHandler };
