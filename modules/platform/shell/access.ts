import "server-only";

import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { isHotSalesRbacEnabled } from "@/modules/platform/env/accessors";
import { isSalesMemberActive } from "@/modules/trade/domain/access";
import {
  listRoleAssignmentsForUser,
  listSalesMembers,
} from "@/modules/trade/domain/store";

/** Product modules hosted in the shared AdminCN shell. */
export type ShellModuleId = "declarations" | "feed-farm-trade";

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
export async function hasHotSalesModuleAccess(input: {
  userId: string;
  email: string;
}): Promise<boolean> {
  const members = await listSalesMembers();
  if (isSalesMemberActive(members, input.email)) {
    return true;
  }

  if (!isHotSalesRbacEnabled()) {
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
  if (await hasHotSalesModuleAccess({ userId: user.id, email: user.email })) {
    modules.push("feed-farm-trade");
  }

  return {
    modules,
    isOrgAdmin: isAdminSession(session),
  };
}
