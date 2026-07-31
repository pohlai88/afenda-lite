import { admin, type UsagePeriod } from "@afenda/admin";
import { rbacAudit } from "@afenda/admin/audit";
import { adminHealth } from "@afenda/admin/health";

const period: UsagePeriod = "2026-08";

export const organizations = admin.organizations.list();
export const usage = admin.usage.get({ orgId: "org-1", period });
export const audit = rbacAudit.record({
	action: rbacAudit.actions.memberInvite,
	actorUserId: "user-1",
	correlationId: "correlation-1",
	orgId: "org-1",
});
export const liveness = adminHealth.liveness();

// @ts-expect-error standalone operations were deleted in the final cutover
admin.listOrganizations();

// @ts-expect-error general activity audit does not belong to RBAC audit
rbacAudit.general.record({ module: "sales", entity: "order" });

// @ts-expect-error health isolation does not expose organization administration
adminHealth.organizations.list();
