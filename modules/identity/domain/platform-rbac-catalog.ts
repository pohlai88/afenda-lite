/**
 * Platform RBAC permission catalog + default role templates (ADR-002).
 * Authorization must use permission codes — never role display names / template_key.
 */

export const PLATFORM_SCOPE_TYPES = ["organization", "platform"] as const;

export type PlatformScopeType = (typeof PLATFORM_SCOPE_TYPES)[number];

export type PlatformPermissionDef = {
  code: string;
  module: "org" | "declarations" | "account" | "fft";
  description: string;
  sensitive: boolean;
};

/**
 * Fixed product-owned permission catalog (ADR-002).
 * Module entry codes (e.g. fft.access) live here; FFT domain codes stay in modules/fft.
 */
export const PLATFORM_PERMISSION_CATALOG: readonly PlatformPermissionDef[] = [
  {
    code: "org.users.manage",
    module: "org",
    description: "Create, update, ban, and remove organization users",
    sensitive: true,
  },
  {
    code: "org.roles.manage",
    module: "org",
    description: "Manage platform roles and assignments",
    sensitive: true,
  },
  {
    code: "declarations.manage",
    module: "declarations",
    description: "Create and manage declarations",
    sensitive: false,
  },
  {
    code: "declarations.read",
    module: "declarations",
    description: "View declarations",
    sensitive: false,
  },
  {
    code: "clients.invite",
    module: "declarations",
    description: "Invite clients to declarations",
    sensitive: false,
  },
  {
    code: "account.self",
    module: "account",
    description: "Manage own account settings",
    sensitive: false,
  },
  {
    code: "fft.access",
    module: "fft",
    description: "Enter Feed Farm Trade module and see FFT nav",
    sensitive: false,
  },
] as const;

export type PlatformPermissionCode =
  (typeof PLATFORM_PERMISSION_CATALOG)[number]["code"];

export const PLATFORM_SENSITIVE_PERMISSION_CODES: ReadonlySet<string> = new Set(
  PLATFORM_PERMISSION_CATALOG.filter((p) => p.sensitive).map((p) => p.code),
);

export function isPlatformSensitivePermission(code: string): boolean {
  return PLATFORM_SENSITIVE_PERMISSION_CODES.has(code);
}

export function isPlatformPermissionCode(
  code: string,
): code is PlatformPermissionCode {
  return PLATFORM_PERMISSION_CATALOG.some((p) => p.code === code);
}

export type PlatformRoleTemplateDef = {
  templateKey: string;
  name: string;
  description: string;
  permissionCodes: readonly PlatformPermissionCode[];
};

const ALL_CODES = PLATFORM_PERMISSION_CATALOG.map(
  (p) => p.code,
) as PlatformPermissionCode[];

export const PLATFORM_ROLE_TEMPLATES: readonly PlatformRoleTemplateDef[] = [
  {
    templateKey: "org_admin",
    name: "Org Admin",
    description:
      "Full organization administration including Feed Farm Trade module entry",
    permissionCodes: ALL_CODES,
  },
  {
    templateKey: "editor",
    name: "Editor",
    description: "Manage declarations and invite clients",
    permissionCodes: [
      "declarations.manage",
      "declarations.read",
      "clients.invite",
      "account.self",
    ],
  },
  {
    templateKey: "viewer",
    name: "Viewer",
    description: "Read declarations and manage own account",
    permissionCodes: ["declarations.read", "account.self"],
  },
  {
    templateKey: "fft_member",
    name: "FFT Member",
    description: "Enter Feed Farm Trade module (platform control plane)",
    permissionCodes: ["fft.access", "account.self"],
  },
] as const;
