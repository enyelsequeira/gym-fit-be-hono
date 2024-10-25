import { z } from "@hono/zod-openapi";
declare const createMessageObjectSchema: (exampleMessage?: string) => z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export = createMessageObjectSchema;
