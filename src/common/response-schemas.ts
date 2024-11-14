import { z } from "@hono/zod-openapi";

const basicErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string(),
    message: z.string(),
  }),
});
const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export { basicErrorSchema, successResponseSchema };
