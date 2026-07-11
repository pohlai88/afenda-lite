import { z } from "zod";

/** Shared Zod primitives — Platform-owned so Identity / Declarations / Trade never cross-import product schemas. */

export const uuidSchema = z.string().uuid();
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(320, "Email must be 320 characters or fewer.");
export const passwordSchema = z.string().min(1).max(512);
export const slugSchema = z.string().trim().min(1).max(200);

export function parseSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
