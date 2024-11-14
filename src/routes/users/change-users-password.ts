import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import { basicErrorSchema, successResponseSchema } from "@/common/response-schemas";
import db from "@/db";
import { users } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { hashPassword, verifyPassword } from "@/routes/users/user.routes";

// Define all possible response schemas

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const changePassword = createRoute({
  method: "post",
  path: "/users/{userId}/change-password",
  middleware: [isUserAuthenticated],
  request: {
    params: z.object({
      userId: z.string(),
    }),
    body: jsonContentRequired(
      passwordChangeSchema,
      "Password change details",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema,
      "Password changed successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      basicErrorSchema,
      "Invalid current password or not authenticated",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      basicErrorSchema,
      "Not authorized to change this user's password",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      basicErrorSchema,
      "User not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(basicErrorSchema, "Internal server error"),
  },
});

const changePasswordHandler: AppRouteHandler<typeof changePassword> = async (c) => {
  try {
    const currentUser = c.get("user");
    const params = c.req.valid("param");
    const { currentPassword, newPassword } = c.req.valid("json");

    const targetUserId = Number(params.userId);

    // Security check: only the user themselves can change their password
    if (currentUser?.id !== targetUserId) {
      return c.json({
        success: false,
        error: {
          name: "ForbiddenError",
          message: "Not authorized to change this user's password",
        },
      }, HttpStatusCodes.FORBIDDEN);
    }

    // Get user with current password
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, targetUserId),
    });

    if (!user) {
      return c.json({
        success: false,
        error: {
          name: "NotFoundError",
          message: "User not found",
        },
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Verify current password using the stored salt:hash format
    const isCurrentPasswordValid = await verifyPassword(user.password, currentPassword);
    if (!isCurrentPasswordValid) {
      console.log("[Change Password] Invalid password attempt for user:", targetUserId);
      return c.json({
        success: false,
        error: {
          name: "UnauthorizedError",
          message: "Current password is incorrect",
        },
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Hash new password with a new salt
    const hashedNewPassword = hashPassword(newPassword);

    // Update password and firstLogin flag
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        firstLogin: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    return c.json({
      success: true,
      message: "Password changed successfully",
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Change Password] Error:", error);
    return c.json({
      success: false,
      error: {
        name: "InternalServerError",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { changePassword, changePasswordHandler };
