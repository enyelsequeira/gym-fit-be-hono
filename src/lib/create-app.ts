import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { pinoLogger } from "@/middlewares/pino-logger";

import type { AppBindings } from "./types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use(serveEmojiFavicon("📝"));
  app.use(pinoLogger());
  app.use(cors({
    origin: "*", // For development. In production, set to your frontend domain
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE", "PUT"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    credentials: true, // Important for cookies
    maxAge: 600,
  }));

  app.notFound(notFound);
  app.onError(onError);
  return app;
}
