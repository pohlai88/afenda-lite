/**
 * Pure Hot Sales RBAC guards (ADR-001 / Phase 2A).
 * Authorization uses permission codes only — never role display names.
 *
 * Unknown team/BU scope: deny (never broaden).
 */

import {
  type HotSalesScopeType,
  isSensitivePermission,
} from "@/lib/domain/trade/rbac-catalog";

export type HotSalesScopeContext = {
  /** Order owner / salesperson user id for `own` scope. */
  resourceOwnerUserId?: string | null;
  eventId?: string | null;
  /** Resolved team ids the actor belongs to. Missing/empty → team scope denies. */
  actorTeamIds?: readonly string[] | null;
  /** Resolved BU ids the actor belongs to. Missing/empty → bu scope denies. */
  actorBuIds?: readonly string[] | null;
  companyId?: string | null;
  /** Assignment company scope id when scope_type=company (optional match). */
  assignmentCompanyId?: string | null;
};

export type HotSalesRoleAssignment = {
  roleId: string;
  scopeType: HotSalesScopeType;
  scopeId: string | null;
  /** Permission codes granted by this role. */
  permissionCodes: readonly string[];
  active: boolean;
};

export type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
};

/**
 * Whether an assignment's scope covers the resource context.
 * Unknown / unresolved team or BU → deny.
 */
export function assignmentScopeMatches(
  assignment: Pick<HotSalesRoleAssignment, "scopeType" | "scopeId" | "active">,
  actorUserId: string,
  ctx: HotSalesScopeContext = {},
): PermissionCheckResult {
  if (!assignment.active) {
    return { allowed: false, reason: "assignment_inactive" };
  }

  switch (assignment.scopeType) {
    case "platform":
      return { allowed: true };
    case "company":
      // Company-wide within tenant; optional id match when both present.
      if (
        assignment.scopeId &&
        ctx.assignmentCompanyId &&
        assignment.scopeId !== ctx.assignmentCompanyId
      ) {
        return { allowed: false, reason: "company_scope_mismatch" };
      }
      return { allowed: true };
    case "own":
      if (!ctx.resourceOwnerUserId) {
        return { allowed: false, reason: "own_scope_requires_resource_owner" };
      }
      if (ctx.resourceOwnerUserId !== actorUserId) {
        return { allowed: false, reason: "own_scope_mismatch" };
      }
      return { allowed: true };
    case "event":
      if (!assignment.scopeId) {
        return { allowed: false, reason: "event_scope_id_required" };
      }
      if (!ctx.eventId) {
        return { allowed: false, reason: "event_scope_requires_event_id" };
      }
      if (assignment.scopeId !== ctx.eventId) {
        return { allowed: false, reason: "event_scope_mismatch" };
      }
      return { allowed: true };
    case "team": {
      if (!assignment.scopeId) {
        return { allowed: false, reason: "team_scope_id_required" };
      }
      const teams = ctx.actorTeamIds;
      if (!teams || teams.length === 0) {
        // Unknown / unresolved membership → deny (never broaden).
        return { allowed: false, reason: "team_scope_unresolved" };
      }
      if (!teams.includes(assignment.scopeId)) {
        return { allowed: false, reason: "team_scope_mismatch" };
      }
      return { allowed: true };
    }
    case "bu": {
      if (!assignment.scopeId) {
        return { allowed: false, reason: "bu_scope_id_required" };
      }
      const bus = ctx.actorBuIds;
      if (!bus || bus.length === 0) {
        return { allowed: false, reason: "bu_scope_unresolved" };
      }
      if (!bus.includes(assignment.scopeId)) {
        return { allowed: false, reason: "bu_scope_mismatch" };
      }
      return { allowed: true };
    }
    default:
      return { allowed: false, reason: "unknown_scope_type" };
  }
}

export function collectEffectivePermissionCodes(
  actorUserId: string,
  assignments: readonly HotSalesRoleAssignment[],
  ctx: HotSalesScopeContext = {},
): Set<string> {
  const codes = new Set<string>();
  for (const assignment of assignments) {
    const match = assignmentScopeMatches(assignment, actorUserId, ctx);
    if (!match.allowed) continue;
    for (const code of assignment.permissionCodes) {
      codes.add(code);
    }
  }
  return codes;
}

export function canPermission(
  actorUserId: string,
  permissionCode: string,
  assignments: readonly HotSalesRoleAssignment[],
  ctx: HotSalesScopeContext = {},
): PermissionCheckResult {
  const effective = collectEffectivePermissionCodes(
    actorUserId,
    assignments,
    ctx,
  );
  if (!effective.has(permissionCode)) {
    return {
      allowed: false,
      reason: isSensitivePermission(permissionCode)
        ? "missing_sensitive_permission"
        : "missing_permission",
    };
  }
  return { allowed: true };
}

/** Feature flag: unset/false → Phase 1 Admin + allowlist path. */
export function isHotSalesRbacEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.HOT_SALES_RBAC_ENABLED === "true";
}
