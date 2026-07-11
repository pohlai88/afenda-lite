import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  uuidSchema,
} from "@/modules/platform/schemas/common";

/** Branded Neon Auth user id — construct only after uuidSchema / domain lookup. */
export type UserId = string & { readonly __brand: "UserId" };

export function asUserId(id: string): UserId {
  return id as UserId;
}

export const userIdSchema = uuidSchema.transform(asUserId);

export const neonAuthRoleSchema = z.enum(["user", "admin"]);

/** Max rows accepted by CSV/JSON import (client parse + Action Zod). */
export const ORGANIZATION_ADMIN_USERS_IMPORT_MAX = 50;

const organizationUserNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(200, "Name must be 200 characters or fewer.");

const organizationUserPasswordSchema = passwordSchema.min(
  8,
  "Password must be at least 8 characters.",
);

const importRoleSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .transform((value) => (value === "admin" ? "admin" : "user"))
  .pipe(neonAuthRoleSchema);

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

export const createOrganizationUserSchema = z.object({
  email: emailSchema,
  password: organizationUserPasswordSchema,
  name: organizationUserNameSchema,
  role: neonAuthRoleSchema.default("user"),
});

export const updateOrganizationUserSchema = z.object({
  userId: userIdSchema,
  name: organizationUserNameSchema,
  role: neonAuthRoleSchema.optional(),
});

export const setOrganizationUserPasswordSchema = z.object({
  userId: userIdSchema,
  newPassword: organizationUserPasswordSchema,
});

export const organizationUserIdsSchema = z.object({
  userIds: z
    .array(userIdSchema)
    .min(1, "Select at least one user.")
    .max(100, "Select 100 users or fewer."),
});

export const banOrganizationUsersSchema = organizationUserIdsSchema.extend({
  banReason: z.string().trim().max(500).optional(),
});

export const importOrganizationUserRowSchema = z.object({
  email: emailSchema,
  password: organizationUserPasswordSchema,
  name: organizationUserNameSchema,
  role: importRoleSchema.default("user"),
});

export const importOrganizationUsersSchema = z.object({
  users: z
    .array(importOrganizationUserRowSchema)
    .min(1, "Import at least one user.")
    .max(
      ORGANIZATION_ADMIN_USERS_IMPORT_MAX,
      `Import ${ORGANIZATION_ADMIN_USERS_IMPORT_MAX} users or fewer per file.`,
    ),
});
