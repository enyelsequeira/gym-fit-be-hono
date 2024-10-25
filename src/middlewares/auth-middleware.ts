// middleware/auth-middleware.ts
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AuthContext } from "@/lib/types";

import db from "@/db";
import { SESSION_COOKIE_NAME, validateSessionToken } from "@/session";

/**
 * Authentication middleware that:
 * 1. Validates the session cookie
 * 2. Retrieves the user's session from database
 * 3. Sets user info in request context
 */
export const isUserAuthenticated = createMiddleware(async (c, next) => {
  console.log("\n[Auth] Starting authentication check");

  try {
    // Step 1: Check for cookie existence
    const rawCookie = getCookie(c, SESSION_COOKIE_NAME);
    if (!rawCookie) {
      console.log("[Auth] No session cookie found");
      return c.json({
        message: "Not authenticated",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Step 2: Extract token from cookie
    const [token] = rawCookie.split(".");
    console.log("[Auth] Found session token:", `${token.substring(0, 8)}...`);

    // Step 3: Validate cookie signature
    const isValid = await validateSessionToken(c);
    if (!isValid) {
      console.log("[Auth] Invalid session signature");
      return c.json({
        message: "Not authenticated",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    // Step 4: Get session from database
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const session = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, sessionId),
      with: {
        user: true,
      },
    });

    if (!session) {
      console.log("[Auth] No valid session found in database");
      return c.json({
        message: "Invalid session",
        error: "Unauthorized",
      }, HttpStatusCodes.UNAUTHORIZED);
    }

    console.log("[Auth] Found valid session:", {
      sessionId: `${session.id.substring(0, 8)}...`,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });

    // Step 5: Set user context for downstream handlers
    const authContext: AuthContext = {
      user: {
        id: session.user.id,
        username: session.user.username,
        type: session.user.type,
      },
      session,
    };

    c.set("user", authContext.user);
    c.set("session", authContext.session);

    console.log("[Auth] Successfully authenticated user:", {
      userId: authContext.user.id,
      username: authContext.user.username,
    });

    await next();
  }
  catch (error) {
    console.error("[Auth] Authentication error:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return c.json({
      message: "Authentication error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, HttpStatusCodes.UNAUTHORIZED);
  }
});
