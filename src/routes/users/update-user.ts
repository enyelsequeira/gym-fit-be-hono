import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema } from "@/common/response-schemas";
import db from "@/db";
import { selectUsersSchema, users, UserType, weightHistory } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { UserRoutesGeneral } from "@/routes/users/user.routes";

// Define what fields can be updated (excluding sensitive/system fields)
const updateUserSchema = selectUsersSchema
  .omit({
    password: true,
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    dateOfBirth: z.coerce.date().nullable(),
    height: z.coerce.string().nullable(),
    weight: z.coerce.string().nullable(),
    targetWeight: z.coerce.string().nullable(),
  })
  .partial();

// Success response won't include password
const successResponseSchema = selectUsersSchema.omit({ password: true });

const updateUser = createRoute({
  ...UserRoutesGeneral,
  method: "patch",
  path: "/users/{userId}",
  middleware: [isUserAuthenticated],
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: jsonContentRequired(
      updateUserSchema,
      "User fields to update",
    ),
  },
  responses: {
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
      createErrorSchema(updateUserSchema),
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
        success: false as const,
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
        success: false as const,
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
        success: false as const,
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

    try {
      // Start a transaction for atomic updates
      const result = await db.transaction(async (tx) => {
        // Handle weight update with proper type conversion
        if (sanitizedUpdate.weight !== undefined && sanitizedUpdate.weight !== null) {
          const newWeight = Number(sanitizedUpdate.weight);
          const currentWeight = existingUser.weight ? Number(existingUser.weight) : null;

          if (!Number.isNaN(newWeight) && newWeight > 0 && newWeight !== currentWeight) {
            await tx.insert(weightHistory).values({
              userId: targetUserId,
              weight: newWeight,
              date: new Date(),
              source: "PROFILE_UPDATE",
              notes: `Weight updated from ${currentWeight || "unset"} to ${newWeight}`,
            });

            console.log("[Update User] Created weight history entry:", {
              userId: targetUserId,
              oldWeight: currentWeight,
              newWeight,
            });
          }
          else if (Number.isNaN(newWeight) || newWeight <= 0) {
            throw new Error("Invalid weight value");
          }
        }

        const [updatedUser] = await tx
          .update(users)
          .set({
            ...sanitizedUpdate,
            updatedAt: new Date(),
          })
          .where(eq(users.id, targetUserId))
          .returning();

        return updatedUser;
      });

      console.log("[Update User] Successfully updated user:", targetUserId);

      const { password: _, ...userWithoutPassword } = result;
      return c.json(userWithoutPassword, HttpStatusCodes.OK);
    }
    catch (txError) {
      console.error("[Update User] Transaction error:", txError);
      throw txError;
    }
  }
  catch (error) {
    console.error("[Update User] Error:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      return c.json({
        success: false as const,
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

    if (error instanceof Error && error.message === "Invalid weight value") {
      return c.json({
        success: false as const,
        error: {
          name: "ValidationError",
          issues: [{
            code: "invalid_weight",
            path: ["weight"],
            message: "Weight must be a positive number",
          }],
        },
      }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    return c.json({
      success: false as const,
      error: {
        name: "InternalServerError",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { updateUser, updateUserHandler };
