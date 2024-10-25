import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

import type { Session, User } from "@/db/schema";

export interface AuthContext {
  user: Pick<User, "id" | "username" | "type">;
  session: Session;
}

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    user?: AuthContext["user"];
    session?: AuthContext["session"];
  };
};

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
