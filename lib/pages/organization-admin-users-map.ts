import type { ClientProfileSummary } from "@/modules/declarations/domain/clients";
import type { OrganizationUserRecord } from "@/modules/identity/domain/organization-users";

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

export type OrganizationAdminUserSessionDisplay = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

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

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

export function mapOrganizationUserToDisplay(
  user: OrganizationUserRecord,
  profile?: ClientProfileSummary | null,
): OrganizationAdminUserDisplay {
  const email = user.email.trim();
  const name =
    user.name?.trim() || profile?.fullLegalName?.trim() || email;

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
    company: dash(profile?.entityName),
    country: dash(profile?.countryOfResidence),
    contact: dash(profile?.phone),
    joinedDate: user.createdAt.toISOString(),
    taxId: "—",
    language: "—",
  };
}

export function mapOrganizationUserSessionRow(
  raw: unknown,
): OrganizationAdminUserSessionDisplay | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) {
    return null;
  }

  const createdAtRaw = row.createdAt ?? row.created_at;
  const expiresAtRaw = row.expiresAt ?? row.expires_at;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : typeof createdAtRaw === "string"
        ? createdAtRaw
        : new Date(0).toISOString();
  const expiresAt =
    expiresAtRaw instanceof Date
      ? expiresAtRaw.toISOString()
      : typeof expiresAtRaw === "string"
        ? expiresAtRaw
        : null;

  return {
    id,
    createdAt,
    expiresAt,
    ipAddress:
      typeof row.ipAddress === "string"
        ? row.ipAddress
        : typeof row.ip_address === "string"
          ? row.ip_address
          : null,
    userAgent:
      typeof row.userAgent === "string"
        ? row.userAgent
        : typeof row.user_agent === "string"
          ? row.user_agent
          : null,
  };
}
