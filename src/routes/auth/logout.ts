import type { Context } from "hono";

import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { deleteCookie } from "hono/cookie";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { sessions } from "@/db/schema";
import { isUserAuthenticated } from "@/middlewares/auth-middleware";
import { COOKIE_OPTIONS, SESSION_COOKIE_NAME } from "@/session";

// Define response schemas
const successResponseSchema = z.object({
  message: z.string().describe("Success message"),
});

const errorResponseSchema = z.object({
  message: z.string().describe("Error description"),
  error: z.string().describe("Error type"),
});

// Helper function to invalidate sessions
async function invalidateAllUserSessions(c: Context, userId: number) {
  console.log("[Logout] Invalidating all sessions for user:", userId);

  const userSessions = await db.query.sessions.findMany({
    where: (sessions, { eq }) => eq(sessions.userId, userId),
  });

  console.log("[Logout] Found sessions to invalidate:", userSessions.length);

  // Delete all sessions from database
  if (userSessions.length > 0) {
    const deleteResult = await db.delete(sessions)
      .where(eq(sessions.userId, userId));
    console.log("[Logout] Sessions deletion result:", deleteResult);
  }

  // Clear the session cookie with full options
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: COOKIE_OPTIONS.path,
    secure: COOKIE_OPTIONS.secure,
    httpOnly: COOKIE_OPTIONS.httpOnly,
    sameSite: COOKIE_OPTIONS.sameSite,
    expires: new Date(0), // Force expire the cookie
    maxAge: 0, // Set maxAge to 0 as well
  });

  console.log("[Logout] Session cookie cleared");
}

const logout = createRoute({
  method: "post",
  path: `/logout/{userid}`,
  middleware: [isUserAuthenticated],
  request: {
    params: z.object({
      userid: z.string().describe("User ID to logout"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema,
      "Logout successful",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorResponseSchema,
      "Invalid request parameters",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorResponseSchema,
      "Unauthorized",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorResponseSchema,
      "Forbidden",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      errorResponseSchema,
      "Internal server error",
    ),
  },
});

const logoutHandler: AppRouteHandler<typeof logout> = async (c) => {
  console.log("[Logout] Starting logout process");

  try {
    const params = c.req.valid("param");
    console.log("[Logout] Request params:", {
      userid: params.userid,
      url: c.req.url,
      method: c.req.method,
      cookies: c.req.header("cookie"),
    });

    // Get the authenticated user from context
    const authenticatedUser = c.get("user");
    if (!authenticatedUser) {
      console.log("[Logout] No authenticated user found in context");
      return c.json({
        message: "Authentication required",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Parse the target user ID from the request params
    const targetUserId = Number.parseInt(params.userid, 10);
    if (isNaN(targetUserId)) {
      console.log("[Logout] Invalid user ID format");
      return c.json({
        message: "Invalid user ID format",
        error: "Bad Request",
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // Strict check: User can only logout themselves
    if (targetUserId !== authenticatedUser.id) {
      console.log("[Logout] Unauthorized logout attempt:", {
        authenticatedUserId: authenticatedUser.id,
        targetUserId,
      });
      return c.json({
        message: "You can only logout your own account",
        error: "Forbidden",
      }, HttpStatusCodes.FORBIDDEN);
    }

    // Find and invalidate the current user's sessions
    await invalidateAllUserSessions(c, authenticatedUser.id);

    console.log("[Logout] Logout process completed successfully");
    return c.json({
      message: "Logout successful",
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("[Logout] Error during logout process:", {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      message: "An error occurred during logout",
      error: error instanceof Error ? error.message : "Unknown error",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export { logout, logoutHandler };
