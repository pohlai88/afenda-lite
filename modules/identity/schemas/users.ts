import { z } from "zod";
import { uuidSchema } from "@/modules/platform/schemas/common";

/** Branded Neon Auth user id — construct only after uuidSchema / domain lookup. */
export type UserId = string & { readonly __brand: "UserId" };

export function asUserId(id: string): UserId {
  return id as UserId;
}

export const userIdSchema = uuidSchema.transform(asUserId);

export const neonAuthRoleSchema = z.enum(["user", "admin"]);

export const setOrganizationUserRoleSchema = z.object({
  userId: userIdSchema,
  role: neonAuthRoleSchema,
});

export const organizationUserIdSchema = z.object({
  userId: userIdSchema,
});

export const banOrganizationUserSchema = z.object({
  userId: userIdSchema,
  banReason: z.string().trim().max(500).optional(),
});
