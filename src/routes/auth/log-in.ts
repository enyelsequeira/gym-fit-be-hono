import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { loginResponseSchema, loginSchema } from "@/routes/auth/general";
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
      basicErrorSchema,
      "Invalid credentials",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      basicErrorSchema,
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
          success: false as const,
          error: {
            name: "AUTHENTICATION_FAILED",
            message: "Invalid username or password",
          },
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    // Generate session token
    const token = generateSessionToken();

    // Create session and set cookie
    const session = await createSession(c, token, user.id);

    console.log("[Login] Session created:", session);
    console.log("[Login] Cookie being set:", token);

    const { password: _password, ...userWithoutPassword } = user;

    return c.json(
      {
        success: true as const,
        message: "Login successful",
        user: userWithoutPassword,
      },
      HttpStatusCodes.OK,
    );
  }
  catch (error) {
    console.error("[Login] Error:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return c.json(
        {
          success: false as const,
          error: {
            name: "VALIDATION_ERROR",
            message: error.message || "Invalid input data",
          },
        },
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
      );
    }

    // For all other errors, return unauthorized
    return c.json(
      {
        success: false as const,
        error: {
          name: "LOGIN_ERROR",
          message: "An error occurred during login",
        },
      },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }
};

export {
  login,
  loginHandler,
};
