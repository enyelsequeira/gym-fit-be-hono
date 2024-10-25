import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { loginErrorSchema, loginResponseSchema, loginSchema } from "@/routes/auth/general";
import { verifyPassword } from "@/routes/users/user.routes";
import { createSession, generateSessionToken } from "@/session";

const login = createRoute({
  method: "post",
  path: "/login",
  request: {
    body: jsonContentRequired(
      loginSchema,
      "Login credentials",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      loginResponseSchema,
      "Login successful",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      loginErrorSchema,
      "Invalid credentials",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(loginSchema),
      "Validation error(s)",
    ),
  },
});

const loginHandler: AppRouteHandler<typeof login> = async (c) => {
  const { username, password } = c.req.valid("json");

  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });

    if (!user || !verifyPassword(user.password, password)) {
      return c.json(
        {
          message: "Invalid username or password",
          error: "Authentication failed",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // Generate session token
    const token = generateSessionToken();

    // Create session and set cookie (remove manual cookie setting)
    const session = await createSession(c, token, user.id);

    console.log("Session created:", session);
    console.log("Cookie being set:", token);

    const { password: _password, ...userWithoutPassword } = user;

    return c.json(
      {
        user: userWithoutPassword,
        message: "Login successful",
      },
      HttpStatusCodes.OK,
    );
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return c.json(
        createErrorSchema(loginSchema).parse(error),
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
      );
    }

    // For all other errors, return unauthorized
    return c.json(
      {
        message: "An error occurred during login",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }
};

export {
  login,
  loginHandler,
};
