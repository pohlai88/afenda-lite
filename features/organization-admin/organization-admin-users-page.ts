/**
 * Organization-admin Users List / View page data.
 * RSC adapter: Identity users + optional Declarations profile summaries.
 */

import "server-only";

import { cache } from "react";
import {
  listClientProfileSummariesByUserIds,
} from "@/modules/declarations/domain/clients";
import {
  getOrganizationUser,
  listOrganizationUsers,
} from "@/modules/identity/domain/organization-users";
import {
  listPlatformRoleAssignmentsForUser,
  listPlatformRoles,
  hasPlatformPermission,
} from "@/modules/identity/domain/platform-rbac";
import { neonAdminListUserSessions } from "@/modules/identity/auth/admin";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
import { bootstrapOrganizationAdminTenancy } from "@/features/organization-admin/organization-admin-tenancy";
import {
  mapOrganizationUserSessionRow,
  mapOrganizationUserToDisplay,
  type OrganizationAdminUserDisplay,
  type OrganizationAdminUserSessionDisplay,
} from "@/features/organization-admin/organization-admin-users-map";

export type {
  OrganizationAdminUserBilling,
  OrganizationAdminUserDisplay,
  OrganizationAdminUserPlan,
  OrganizationAdminUserRole,
  OrganizationAdminUserSessionDisplay,
  OrganizationAdminUserStatus,
} from "@/features/organization-admin/organization-admin-users-map";

export { mapOrganizationUserToDisplay } from "@/features/organization-admin/organization-admin-users-map";

export interface OrganizationAdminPlatformAssignmentDisplay {
  id: string;
  roleId: string;
  roleName: string;
  scopeType: string;
  permissionCodes: string[];
}

export interface OrganizationAdminPlatformRoleOption {
  id: string;
  name: string;
  isSystemTemplate: boolean;
}

export interface OrganizationAdminUsersPageData {
  users: OrganizationAdminUserDisplay[];
}

export interface OrganizationAdminUserViewPageData {
  user: OrganizationAdminUserDisplay | null;
  sessions: OrganizationAdminUserSessionDisplay[];
  platformAssignments: OrganizationAdminPlatformAssignmentDisplay[];
  platformRoleOptions: OrganizationAdminPlatformRoleOption[];
  canManagePlatformRoles: boolean;
}

export const loadOrganizationAdminUsersPage = cache(
  async (): Promise<OrganizationAdminUsersPageData> => {
    await bootstrapOrganizationAdminTenancy({
      anyOf: ["org.users.manage"],
    });
    const users = await listOrganizationUsers();
    const profiles = await listClientProfileSummariesByUserIds(
      users.map((user) => user.id),
    );

    return {
      users: users.map((user) =>
        mapOrganizationUserToDisplay(user, profiles.get(user.id) ?? null),
      ),
    };
  },
);

export const loadOrganizationAdminUserViewPage = cache(
  async (userId: string): Promise<OrganizationAdminUserViewPageData> => {
    const { org, session, isNeonAdmin } = await bootstrapOrganizationAdminTenancy({
      anyOf: ["org.users.manage"],
    });
    const rolesGate = await hasPlatformPermission({
      userId: session.user.id,
      organizationId: org.organizationId,
      code: "org.roles.manage",
      neonAdminBootstrap: isNeonAdmin,
    });
    const canManagePlatformRoles = rolesGate.allowed;

    const user = await getOrganizationUser(userId);
    if (!user) {
      return {
        user: null,
        sessions: [],
        platformAssignments: [],
        platformRoleOptions: [],
        canManagePlatformRoles,
      };
    }

    const [profiles, sessionsResult, assignments, roles] = await Promise.all([
      listClientProfileSummariesByUserIds([user.id]),
      neonAdminListUserSessions(user.id),
      listPlatformRoleAssignmentsForUser(user.id, org.organizationId),
      listPlatformRoles(org.organizationId),
    ]);

    const sessions =
      "error" in sessionsResult
        ? []
        : (sessionsResult.sessions ?? [])
            .map(mapOrganizationUserSessionRow)
            .filter((sessionRow): sessionRow is OrganizationAdminUserSessionDisplay =>
              Boolean(sessionRow),
            );

    return {
      user: mapOrganizationUserToDisplay(user, profiles.get(user.id) ?? null),
      sessions,
      platformAssignments: assignments.map((assignment) => ({
        id: assignment.id,
        roleId: assignment.roleId,
        roleName: assignment.roleName,
        scopeType: assignment.scopeType,
        permissionCodes: [...assignment.permissionCodes],
      })),
      platformRoleOptions: roles.map((role) => ({
        id: role.id,
        name: role.name,
        isSystemTemplate: role.isSystemTemplate,
      })),
      canManagePlatformRoles,
    };
  },
);

export const organizationAdminUsersPageMetadata = {
  title: `Users | ${PORTAL_NAME}`,
  description: "Manage organization users.",
};

export const organizationAdminUserViewPageMetadata = {
  title: `User details | ${PORTAL_NAME}`,
  description: "Review an organization user.",
};
