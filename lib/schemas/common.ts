import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export const passwordSchema = z.string().min(1).max(512);
export const slugSchema = z.string().trim().min(1).max(200);

export const surveyAnswersSchema = z.record(
  z.string().uuid(),
  z.union([z.boolean(), z.string().max(10000)]),
);

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
