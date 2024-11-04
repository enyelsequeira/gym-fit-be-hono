import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { selectUsersSchema, users, UserType } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

/**
 * We use PATCH (not PUT) because:
 * - PATCH is for partial updates (only updating some fields)
 * - PUT is for complete resource replacement (would require ALL fields)
 * - PATCH matches our business logic of allowing specific field updates
 *
 * HTTP Method differences:
 * - PUT: Replace entire resource (need all fields)
 * - PATCH: Modify parts of resource (only send fields to change)
 * - POST: Create new resource
 */

// Define what fields can be updated (excluding sensitive/system fields)
const updateUserSchema = selectUsersSchema
  .omit({
    password: true, // Can't update password through this endpoint
    id: true, // Can't change ID
    createdAt: true, // System managed
    updatedAt: true, // System managed
  })
  .extend({
    dateOfBirth: z.coerce.date().nullable(),
    height: z.coerce.string().nullable(),
    weight: z.coerce.string().nullable(),
    targetWeight: z.coerce.string().nullable(),
  })
  .partial(); // Make all fields optional since it's a PATCH

// Success response won't include password
const successResponseSchema = selectUsersSchema.omit({ password: true });

// Standard error response structure
const basicErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string(),
    message: z.string(),
  }),
});

// Validation error includes more detailed issues array
const validationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string(),
    issues: z.array(
      z.object({
        code: z.string(),
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string().optional(),
      }),
    ),
  }),
});

// Route definition with OpenAPI metadata
const updateUser = createRoute({
  ...UserRoutesGeneral,
  method: "patch", // Using PATCH for partial updates
  path: "/users/{userId}", // RESTful path pattern
  middleware: [isUserAuthenticated], // Must be logged in
  request: {
    params: z.object({
      userId: z.string(), // URL parameter for user ID
    }),
    body: jsonContentRequired(
      updateUserSchema,
      "User fields to update",
    ),
  },
  responses: {
    // Define all possible response types for OpenAPI
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema,
      "Updated user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "Not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized to update this user",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      basicErrorSchema,
      "User not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      validationErrorSchema,
      "Validation error(s)",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      basicErrorSchema,
      "Internal server error",
    ),
  },
});

const updateUserHandler: AppRouteHandler<typeof updateUser> = async (c) => {
  try {
    const currentUser = c.get("user");
    const params = c.req.valid("param");
    const updateData = c.req.valid("json");

    const targetUserId = Number(params.userId);

    console.log("[Update User] Request details:", {
      currentUserId: currentUser?.id,
      targetUserId,
      updateData,
      userType: currentUser?.type,
    });

    // Security check: only admins or the user themselves can update
    const isAdmin = currentUser?.type === UserType.ADMIN;
    const isOwnUser = currentUser?.id === targetUserId;

    if (!isAdmin && !isOwnUser) {
      console.log("[Update User] Unauthorized update attempt");
      return c.json({
        success: false,
        error: {
          name: "ForbiddenError",
          message: "Not authorized to update this user",
        },
      }, HttpStatusCodes.FORBIDDEN);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, targetUserId),
    });

    if (!existingUser) {
      console.log("[Update User] User not found:", targetUserId);
      return c.json({
        success: false,
        error: {
          name: "NotFoundError",
          message: "User not found",
        },
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Ensure no protected fields are being updated
    const protectedFields = ["password", "id", "createdAt", "updatedAt", "type"];
    const sanitizedUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => !protectedFields.includes(key)),
    );

    if (Object.keys(sanitizedUpdate).length === 0) {
      return c.json({
        success: false,
        error: {
          name: "ValidationError",
          issues: [{
            code: "invalid_update",
            path: [],
            message: "No valid fields to update",
          }],
        },
      }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    // Perform the database update
    const [updatedUser] = await db
      .update(users)
      .set({
        ...sanitizedUpdate,
        updatedAt: new Date(), // Automatically update timestamp
      })
      .where(eq(users.id, targetUserId))
      .returning();

    console.log("[Update User] Successfully updated user:", targetUserId);

    // Remove password from response data
    const { password: _, ...userWithoutPassword } = updatedUser;
    return c.json(userWithoutPassword, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Update User] Error:", error);

    // Handle validation errors specially
    if (error instanceof Error && error.name === "ValidationError") {
      return c.json({
        success: false,
        error: {
          name: "ValidationError",
          issues: [{
            code: "validation_failed",
            path: [],
            message: error.message,
          }],
        },
      }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    // Generic error handler
    return c.json({
      success: false,
      error: {
        name: "InternalServerError",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { updateUser, updateUserHandler };
