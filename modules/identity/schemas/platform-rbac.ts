import { z } from "zod";
import { uuidSchema } from "@/modules/platform/schemas/common";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_SCOPE_TYPES,
} from "@/modules/identity/domain/platform-rbac-catalog";
import { userIdSchema } from "@/modules/identity/schemas/users";

export type PlatformRoleId = string & { readonly __brand: "PlatformRoleId" };
export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type PermissionCode = string & { readonly __brand: "PermissionCode" };

export function asPlatformRoleId(id: string): PlatformRoleId {
  return id as PlatformRoleId;
}

export function asOrganizationId(id: string): OrganizationId {
  return id as OrganizationId;
}

export function asPermissionCode(code: string): PermissionCode {
  return code as PermissionCode;
}

export const platformRoleIdSchema = uuidSchema.transform(asPlatformRoleId);

export const organizationIdSchema = z
  .string()
  .trim()
  .min(1, "Organization id is required.")
  .max(128)
  .transform(asOrganizationId);

const permissionCodeValues = PLATFORM_PERMISSION_CATALOG.map((p) => p.code) as [
  string,
  ...string[],
];

export const permissionCodeSchema = z
  .enum(permissionCodeValues)
  .transform(asPermissionCode);

export const platformScopeTypeSchema = z.enum(PLATFORM_SCOPE_TYPES);

export const createPlatformRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required.")
    .max(120, "Role name must be 120 characters or fewer."),
  description: z.string().trim().max(500).optional(),
  permissionCodes: z
    .array(permissionCodeSchema)
    .min(1, "Select at least one permission."),
});

export const updatePlatformRoleSchema = createPlatformRoleSchema.extend({
  roleId: platformRoleIdSchema,
});

export const deletePlatformRoleSchema = z.object({
  roleId: platformRoleIdSchema,
});

export const setPlatformRolePermissionSchema = z.object({
  roleId: platformRoleIdSchema,
  permissionCode: permissionCodeSchema,
  granted: z.boolean(),
});

export const assignPlatformRoleSchema = z.object({
  userId: userIdSchema,
  roleId: platformRoleIdSchema,
  scopeType: platformScopeTypeSchema.default("organization"),
});

export const revokePlatformRoleAssignmentSchema = z.object({
  assignmentId: uuidSchema,
});

/** M1 — switch Neon Auth session.activeOrganizationId (membership-gated). */
export const setActiveOrganizationSchema = z.object({
  organizationId: organizationIdSchema,
});

export type CreatePlatformRoleInput = z.infer<typeof createPlatformRoleSchema>;
export type UpdatePlatformRoleInput = z.infer<typeof updatePlatformRoleSchema>;
export type SetPlatformRolePermissionInput = z.infer<
  typeof setPlatformRolePermissionSchema
>;
export type AssignPlatformRoleInput = z.infer<typeof assignPlatformRoleSchema>;
export type SetActiveOrganizationInput = z.infer<
  typeof setActiveOrganizationSchema
>;
