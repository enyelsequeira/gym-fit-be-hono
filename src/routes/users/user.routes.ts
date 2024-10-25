import { z } from "@hono/zod-openapi";
import { randomBytes, scryptSync } from "node:crypto";

import { selectUsersSchema } from "@/db/schema";

// First, define the base schemas
export const baseUserResponseSchema = selectUsersSchema.omit({ password: true });

export const conflictErrorSchema = z.object({
  message: z.string(),
  error: z.string(),
  field: z.string(),
});

// Route configuration
export const UserRoutesGeneral = {
  path: "/users",
  tags: ["Users"],
};

export function hashPassword(password: string) {
  // Generate a random salt
  const salt = randomBytes(16).toString("hex");
  // Hash the password with the salt
  const hash = scryptSync(password, salt, 64).toString("hex");
  // Return the salt and hash combined
  return `${salt}:${hash}`;
}

export function verifyPassword(storedPassword: string, inputPassword: string): boolean {
  const [salt, hash] = storedPassword.split(":");
  const inputHash = scryptSync(inputPassword, salt, 64).toString("hex");
  return hash === inputHash;
}
