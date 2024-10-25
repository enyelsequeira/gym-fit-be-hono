import type { Context } from "hono";

import { createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, getSignedCookie } from "hono/cookie";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { sessions } from "@/db/schema";
import { COOKIE_OPTIONS, SESSION_COOKIE_NAME, SESSION_COOKIE_SECRET } from "@/session";

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
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorResponseSchema,
      "Unauthorized",
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
    // Log request parameters and cookies
    const params = c.req.valid("param");
    console.log("[Logout] Request params:", {
      userid: params.userid,
      url: c.req.url,
      method: c.req.method,
      cookies: c.req.header("cookie"),
    });

    // Step 1: Get raw cookie first to debug
    const rawCookie = getCookie(c, SESSION_COOKIE_NAME);
    console.log("[Logout] Raw cookie value:", rawCookie);

    // Step 2: Get signed cookie
    const sessionToken = await getSignedCookie(c, SESSION_COOKIE_NAME, SESSION_COOKIE_SECRET);
    console.log("[Logout] Session token retrieved:", {
      exists: !!sessionToken,
      token: sessionToken ? `${sessionToken.substring(0, 8)}...` : null,
    });

    // Even if we can't get the session token, we should still try to invalidate sessions
    // based on the user ID as a fallback
    const userId = Number.parseInt(params.userid, 10);
    if (isNaN(userId)) {
      console.log("[Logout] Invalid user ID format");
      return c.json({
        message: "Invalid user ID",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Find all sessions for this user
    const userSessions = await db.query.sessions.findMany({
      where: (sessions, { eq }) => eq(sessions.userId, userId),
      with: {
        user: true,
      },
    });

    console.log("[Logout] Found user sessions:", {
      count: userSessions.length,
      sessions: userSessions.map(s => ({
        id: `${s.id.substring(0, 8)}...`,
        expiresAt: s.expiresAt,
      })),
    });

    if (userSessions.length === 0) {
      console.log("[Logout] No active sessions found for user");
      // Still clear the cookie even if no sessions found
      await invalidateAllUserSessions(c, userId);
      return c.json({
        message: "No active sessions found",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Invalidate all sessions for this user
    await invalidateAllUserSessions(c, userId);

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
