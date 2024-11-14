import { z } from "@hono/zod-openapi";

// Base pagination schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const paginationResponseSchema = z.object({
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(),
});

/**
 * Creates a pagination query schema with additional search/filter fields
 * @param additionalFields - Extra fields to add to the pagination schema
 */
export function createPaginatedQuerySchema<T extends z.ZodRawShape>(additionalFields: T) {
  return paginationQuerySchema.extend(additionalFields);
}

/**
 * Creates a paginated response schema for a specific data type
 * @param dataSchema - Schema for the data array items
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    page: paginationResponseSchema,
  });
}
