// session/index.ts
import type { Context } from "hono";

import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32NoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { getCookie, setCookie } from "hono/cookie";

import type { Session } from "@/db/schema";

import db from "@/db";
import { sessions } from "@/db/schema";
import env from "@/env";

// Ensure session secret is set in environment
if (!env.SESSION_COOKIE_SECRET) {
  throw new Error("SESSION_COOKIE_SECRET must be set in environment");
}

// Constants for cookie configuration
export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_SECRET = env.SESSION_COOKIE_SECRET;
export const COOKIE_OPTIONS = {
  path: "/",
  secure: false, // Set to true in production
  httpOnly: true, // Prevent JavaScript access
  sameSite: "Lax" as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

/**
 * Creates a signature for a session token using SHA-256
 * Combines the token with our secret key for added security
 */
function generateSignature(token: string): string {
  const data = new TextEncoder().encode(token + SESSION_COOKIE_SECRET);
  return encodeHexLowerCase(sha256(data));
}

/**
 * Generates a random session token using crypto API
 * Returns a base32 encoded string for URL safety
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32NoPadding(bytes);
}

/**
 * Creates a new session for a user
 * 1. Generates a session ID from the token
 * 2. Stores the session in database
 * 3. Sets a signed cookie in the response
 */
export async function createSession(
  c: Context,
  token: string,
  userId: number,
): Promise<Session> {
  // Create a hash of the token to use as session ID
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  console.log("[Session] Creating new session:", {
    tokenPreview: `${token.substring(0, 8)}...`,
    sessionIdPreview: `${sessionId.substring(0, 8)}...`,
    userId,
  });

  // Store session in database
  const [session] = await db.insert(sessions)
    .values({
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + COOKIE_OPTIONS.maxAge * 1000),
    })
    .returning();
  console.log("[Session] Stored in database:", {
    sessionId: `${sessionId.substring(0, 8)}...`,
    expiresAt: session.expiresAt,
  });

  // Create signed cookie value
  const signature = generateSignature(token);
  const cookieValue = `${token}.${signature}`;

  // Set the cookie in response
  setCookie(c, SESSION_COOKIE_NAME, cookieValue, COOKIE_OPTIONS);
  console.log("[Session] Cookie set with signature");

  return session;
}

/**
 * Validates a session token from a cookie
 * 1. Extracts token and signature from cookie
 * 2. Regenerates signature and compares
 */
export async function validateSessionToken(c: Context): Promise<boolean> {
  try {
    // Get cookie value
    const rawCookie = getCookie(c, SESSION_COOKIE_NAME);
    if (!rawCookie) {
      console.log("[Session] No cookie found");
      return false;
    }

    // Split into token and signature
    const [token, signature] = rawCookie.split(".");
    if (!token || !signature) {
      console.log("[Session] Invalid cookie format");
      return false;
    }

    // Validate signature
    const expectedSignature = generateSignature(token);
    const isValid = signature === expectedSignature;

    console.log("[Session] Validation result:", {
      token: `${token.substring(0, 8)}...`,
      signatureMatch: isValid,
    });

    return isValid;
  }
  catch (error) {
    console.error("[Session] Validation error:", error);
    return false;
  }
}
