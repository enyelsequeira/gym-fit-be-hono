"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  clerkMiddleware: () => clerkMiddleware,
  getAuth: () => getAuth
});
module.exports = __toCommonJS(src_exports);
var import_backend = require("@clerk/backend");
var import_adapter = require("hono/adapter");
var getAuth = (c) => {
  return c.get("clerkAuth");
};
var clerkMiddleware = (options) => {
  return async (c, next) => {
    const clerkEnv = (0, import_adapter.env)(c);
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
    const clerkClient = (0, import_backend.createClerkClient)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clerkMiddleware,
  getAuth
});
