import { z } from "@hono/zod-openapi";
type Validator = "uuid" | "nanoid" | "cuid" | "cuid2" | "ulid";
export interface ParamsSchema {
    name?: string;
    validator?: Validator | undefined;
}
declare const getParamsSchema: ({ name, validator, }: ParamsSchema) => z.ZodObject<{
    [x: string]: z.ZodString;
}, "strip", z.ZodTypeAny, {
    [x: string]: string;
}, {
    [x: string]: string;
}>;
export default getParamsSchema;
