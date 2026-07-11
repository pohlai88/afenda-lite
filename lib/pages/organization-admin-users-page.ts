/**
 * Organization-admin Users List / View page data.
 * RSC adapter: Identity `listOrganizationUsers` / `getOrganizationUser` → display DTO.
 */

import "server-only";

import { cache } from "react";
import {
  getOrganizationUser,
  listOrganizationUsers,
  type OrganizationUserRecord,
} from "@/modules/identity/domain/organization-users";
import { PORTAL_NAME } from "@/modules/declarations/copy/portal-copy";

export type OrganizationAdminUserRole =
  | "Admin"
  | "Editor"
  | "Subscriber"
  | "Maintainer"
  | "Guest";

export type OrganizationAdminUserPlan = "Basic" | "Team" | "Enterprise";

export type OrganizationAdminUserStatus =
  | "Active"
  | "Pending"
  | "Suspended"
  | "Inactive";

export type OrganizationAdminUserBilling =
  | "Auto Debit"
  | "Manual"
  | "Credit Card";

/** Display DTO for List / View. Route param is `userId` (UserId brand at domain edge). */
export interface OrganizationAdminUserDisplay {
  id: string;
  name: string;
  email: string;
  username: string;
  role: OrganizationAdminUserRole;
  plan: OrganizationAdminUserPlan;
  billing: OrganizationAdminUserBilling;
  status: OrganizationAdminUserStatus;
  company: string;
  country: string;
  contact: string;
  joinedDate: string;
  taxId: string;
  language: string;
}

export interface OrganizationAdminUsersPageData {
  users: OrganizationAdminUserDisplay[];
  isPlaceholder: false;
}

export interface OrganizationAdminUserViewPageData {
  user: OrganizationAdminUserDisplay | null;
  isPlaceholder: false;
}

function mapAuthRole(role: string | null): OrganizationAdminUserRole {
  return role === "admin" ? "Admin" : "Guest";
}

function mapAuthStatus(
  user: Pick<OrganizationUserRecord, "banned" | "emailVerified">,
): OrganizationAdminUserStatus {
  if (user.banned) {
    return "Suspended";
  }
  if (!user.emailVerified) {
    return "Pending";
  }
  return "Active";
}

function usernameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : email;
}

/** @internal Exported for unit tests — maps Neon Auth user → List/View DTO. */
export function mapOrganizationUserToDisplay(
  user: OrganizationUserRecord,
): OrganizationAdminUserDisplay {
  const email = user.email.trim();
  const name = user.name?.trim() || email;

  return {
    id: user.id,
    name,
    email,
    username: usernameFromEmail(email),
    role: mapAuthRole(user.role),
    // SaaS plan/billing columns are AdminCN chrome — not product fields yet.
    plan: "Basic",
    billing: "Manual",
    status: mapAuthStatus(user),
    company: "—",
    country: "—",
    contact: "—",
    joinedDate: user.createdAt.toISOString(),
    taxId: "—",
    language: "—",
  };
}

export const loadOrganizationAdminUsersPage = cache(
  async (): Promise<OrganizationAdminUsersPageData> => {
    const users = await listOrganizationUsers();
    return {
      users: users.map(mapOrganizationUserToDisplay),
      isPlaceholder: false,
    };
  },
);

export const loadOrganizationAdminUserViewPage = cache(
  async (userId: string): Promise<OrganizationAdminUserViewPageData> => {
    const user = await getOrganizationUser(userId);
    return {
      user: user ? mapOrganizationUserToDisplay(user) : null,
      isPlaceholder: false,
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
