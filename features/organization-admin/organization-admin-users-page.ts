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
import { neonAdminListUserSessions } from "@/modules/identity/auth/admin";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
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

export interface OrganizationAdminUsersPageData {
  users: OrganizationAdminUserDisplay[];
}

export interface OrganizationAdminUserViewPageData {
  user: OrganizationAdminUserDisplay | null;
  sessions: OrganizationAdminUserSessionDisplay[];
}

export const loadOrganizationAdminUsersPage = cache(
  async (): Promise<OrganizationAdminUsersPageData> => {
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
    const user = await getOrganizationUser(userId);
    if (!user) {
      return { user: null, sessions: [] };
    }

    const [profiles, sessionsResult] = await Promise.all([
      listClientProfileSummariesByUserIds([user.id]),
      neonAdminListUserSessions(user.id),
    ]);

    const sessions =
      "error" in sessionsResult
        ? []
        : (sessionsResult.sessions ?? [])
            .map(mapOrganizationUserSessionRow)
            .filter((session): session is OrganizationAdminUserSessionDisplay =>
              Boolean(session),
            );

    return {
      user: mapOrganizationUserToDisplay(user, profiles.get(user.id) ?? null),
      sessions,
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
