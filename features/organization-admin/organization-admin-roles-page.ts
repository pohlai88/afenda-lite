/**
 * Organization-admin Roles / Permissions page data (RSC).
 */

import "server-only";

import { cache } from "react";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
import {
  listPlatformPermissionCatalog,
  listPlatformRoles,
  type PlatformRoleRow,
} from "@/modules/identity/domain/platform-rbac";
import type { PlatformPermissionDef } from "@/modules/identity/domain/platform-rbac-catalog";
import { bootstrapOrganizationAdminTenancy } from "@/features/organization-admin/organization-admin-tenancy";

export type OrganizationAdminRoleDisplay = {
  id: string;
  name: string;
  description: string | null;
  isSystemTemplate: boolean;
  templateKey: string | null;
  permissionCodes: string[];
};

export type OrganizationAdminRolesPageData = {
  organizationId: string;
  organizationName: string;
  roles: OrganizationAdminRoleDisplay[];
  permissions: PlatformPermissionDef[];
};

function mapRole(role: PlatformRoleRow): OrganizationAdminRoleDisplay {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystemTemplate: role.isSystemTemplate,
    templateKey: role.templateKey,
    permissionCodes: [...role.permissionCodes],
  };
}

export const loadOrganizationAdminRolesPage = cache(
  async (): Promise<OrganizationAdminRolesPageData> => {
    const { org } = await bootstrapOrganizationAdminTenancy({
      anyOf: ["org.roles.manage"],
    });
    const [roles, permissions] = await Promise.all([
      listPlatformRoles(org.organizationId),
      Promise.resolve(listPlatformPermissionCatalog()),
    ]);

    return {
      organizationId: org.organizationId,
      organizationName: org.organizationName,
      roles: roles.map(mapRole),
      permissions: [...permissions],
    };
  },
);

export const loadOrganizationAdminPermissionsPage = loadOrganizationAdminRolesPage;

export const organizationAdminRolesPageMetadata = {
  title: `Roles | ${PORTAL_NAME}`,
  description: "Manage organization roles and permissions.",
};

export const organizationAdminPermissionsPageMetadata = {
  title: `Permissions | ${PORTAL_NAME}`,
  description: "Overview of role permission grants.",
};
