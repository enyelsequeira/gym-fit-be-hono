// src/index.ts
import { createClerkClient } from "@clerk/backend";
import { env } from "hono/adapter";
var getAuth = (c) => {
  return c.get("clerkAuth");
};
var clerkMiddleware = (options) => {
  return async (c, next) => {
    const clerkEnv = env(c);
    const { secretKey, publishableKey, apiUrl, apiVersion, ...rest } = options || {
      secretKey: clerkEnv.CLERK_SECRET_KEY || "",
      publishableKey: clerkEnv.CLERK_PUBLISHABLE_KEY || "",
      apiUrl: clerkEnv.CLERK_API_URL,
      apiVersion: clerkEnv.CLERK_API_VERSION
    };
    if (!secretKey) {
      throw new Error("Missing Clerk Secret key");
    }
    if (!publishableKey) {
      throw new Error("Missing Clerk Publishable key");
    }
    const clerkClient = createClerkClient({
      ...rest,
      apiUrl,
      apiVersion,
      secretKey,
      publishableKey
    });
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      ...rest,
      secretKey,
      publishableKey
    });
    if (requestState.headers) {
      requestState.headers.forEach((value, key) => c.res.headers.append(key, value));
      const locationHeader = requestState.headers.get("location");
      if (locationHeader) {
        return c.redirect(locationHeader, 307);
      } else if (requestState.status === "handshake") {
        throw new Error("Clerk: unexpected handshake without redirect");
      }
    }
    c.set("clerkAuth", requestState.toAuth());
    c.set("clerk", clerkClient);
    await next();
  };
};
export {
  clerkMiddleware,
  getAuth
};
