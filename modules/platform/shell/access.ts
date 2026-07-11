import "server-only";

import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { isFftRbacEnabled } from "@/modules/platform/env/accessors";
import { isSalesMemberActive } from "@/modules/fft/domain/access";
import {
  listRoleAssignmentsForUser,
  listSalesMembers,
} from "@/modules/fft/domain/store";

/** SaaS product modules on the shared AdminCN platform (not separate apps). */
export type ShellModuleId = "declarations" | "fft";

export type ShellNavKind = "module" | "admin";

export type ShellAccess = {
  /** Modules the session may see in the sidebar and enter. */
  modules: ShellModuleId[];
  /** Organization admin — admin-route nav/pages only, not Declarations. */
  isOrgAdmin: boolean;
};

/**
 * Feed Farm Trade module entry — allowlist or RBAC assignment.
 * Organization admin alone does **not** grant Feed Farm Trade.
 */
export async function hasFftModuleAccess(input: {
  userId: string;
  email: string;
}): Promise<boolean> {
  const members = await listSalesMembers();
  if (isSalesMemberActive(members, input.email)) {
    return true;
  }

  if (!isFftRbacEnabled()) {
    return false;
  }

  const assignments = await listRoleAssignmentsForUser(input.userId);
  return assignments.length > 0;
}

/** Resolve sidebar entitlements for the shared shell (no redirects). */
export async function resolveShellAccess(): Promise<ShellAccess | null> {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return null;
  }

  const modules: ShellModuleId[] = ["declarations"];
  if (await hasFftModuleAccess({ userId: user.id, email: user.email })) {
    modules.push("fft");
  }

  return {
    modules,
    isOrgAdmin: isAdminSession(session),
  };
}
