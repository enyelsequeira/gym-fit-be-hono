import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { insertUsersSchema, users } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { isAdmin } from "@/middlewares/is-admin";
import { baseUserResponseSchema, hashPassword } from "@/routes/users/user.routes";

// Define schemas for different types of error responses
// Schema for validation errors
const errorResponseSchema = z.object({
  message: z.string(), // Human-readable error message
  error: z.string(), // Error code or type
  field: z.string(), // Field that caused the error
});

// Schema for conflict errors (e.g., duplicate username/email)
const conflictErrorSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string(),
});

// Schema for internal server errors
const internalErrorSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string(),
});

// Define the route configuration including OpenAPI documentation
const createUser = createRoute({
  path: "/users/create",
  tags: ["Users"],
  method: "post", // HTTP method
  middleware: [isUserAuthenticated, isAdmin],
  request: {
    body: jsonContentRequired( // Request body configuration
      insertUsersSchema, // Schema for validating incoming user data
      "user to be create", // Description for documentation
    ),
  },
  responses: {
    // Define possible response types and their schemas
    [HttpStatusCodes.OK]: jsonContent(
      baseUserResponseSchema,
      "The created user",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      conflictErrorSchema,
      "Resource already exists",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      errorResponseSchema,
      "The validation error(s)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      internalErrorSchema,
      "Internal server error",
    ),
  },
});

// Route handler implementation
const createUserHandler: AppRouteHandler<typeof createUser> = async (c) => {
  // Get validated request body
  const userData = c.req.valid("json");

  try {
    // Check for existing username to prevent duplicates
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, userData.username),
    });

    if (existingUser) {
      // Return conflict error if username exists
      return c.json(
        {
          message: "Username already exists",
          error: "DUPLICATE_USERNAME",
          field: "username",
        },
        HttpStatusCodes.CONFLICT,
      );
    }

    // Check for existing email to prevent duplicates
    const existingEmail = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, userData.email),
    });

    if (existingEmail) {
      // Return conflict error if email exists
      return c.json(
        {
          message: "Email already exists",
          error: "DUPLICATE_EMAIL",
          field: "email",
        },
        HttpStatusCodes.CONFLICT,
      );
    }

    // Hash the password before storing
    const hashedPassword = hashPassword(userData.password);

    // Insert the new user into the database
    const [insertedUser] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();

    // Remove password from response for security
    const { password: _password, ...userWithoutPassword } = insertedUser;
    return c.json(userWithoutPassword, HttpStatusCodes.OK);
  }
  catch (error) {
    // Log error for debugging
    console.error("User creation error:", error);

    if (error instanceof Error) {
      // Handle SQLite-specific constraint violations
      if (error.message.includes("SQLITE_CONSTRAINT")) {
        return c.json(
          {
            message: "Resource already exists",
            error: "CONSTRAINT_ERROR",
            // Determine which field caused the constraint violation
            field: error.message.includes("username") ? "username" : "email",
          },
          HttpStatusCodes.CONFLICT,
        );
      }

      // Handle general database errors
      return c.json(
        {
          message: "Failed to create user",
          error: "DATABASE_ERROR",
          field: "unknown",
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    // Handle unexpected error types
    return c.json(
      {
        message: "An unexpected error occurred",
        error: "UNKNOWN_ERROR",
        field: "unknown",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

// Export the route and handler
export { createUser, createUserHandler };
