// middlewares/admin-middleware.ts
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { UserType } from "@/db/schema";

/**
 * Middleware to check if the authenticated user is an admin
 * Must be used after isUserAuthenticated middleware
 * Gives 403 Forbidden if user is not an admin
 */
export const isAdmin = createMiddleware(async (c, next) => {
  console.log("[Admin Check] Starting admin authorization check");

  try {
    // Get user from context (set by isUserAuthenticated middleware)
    const user = c.get("user");

    if (!user) {
      console.log("[Admin Check] No user found in context");
      return c.json({
        message: "Authentication required",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    console.log("[Admin Check] Checking user type:", {
      userId: user.id,
      username: user.username,
      userType: user.type,
    });

    // Check if user is admin
    if (user.type !== UserType.ADMIN) {
      console.log("[Admin Check] User is not an admin");
      return c.json({
        message: "Admin access required",
        error: "Forbidden",
      }, HttpStatusCodes.FORBIDDEN);
    }

    console.log("[Admin Check] Admin access granted");
    await next();
  }
  catch (error) {
    console.error("[Admin Check] Authorization error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      message: "Authorization error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
});
