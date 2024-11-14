import { z } from "@hono/zod-openapi";

import { baseUserResponseSchema } from "@/routes/users/user.routes";

export const AuthGeneral = {
  path: "/login",
  tags: ["auth"],

};

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});
export const loginErrorSchema = z.object({
  message: z.string(),
  error: z.string(),
});

// Then define response schemas
export const loginResponseSchema = z.object({
  user: baseUserResponseSchema,
  message: z.string(),
});
