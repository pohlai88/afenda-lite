"use server";

import {
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@afenda/admin/audit";
import {
	buildJoinUrl,
	canInviteMember,
	inviteOrgMember,
	requireRole,
} from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { inviteOrgMemberCommandSchema } from "@/modules/identity/schemas/invite-org-member";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface InviteOrgMemberActionData {
	auditId: string;
	email: string;
	/** Relative `/join?invitationId=…` when Neon returned an invitation id. */
	joinUrl: string | null;
}

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type InviteOrgMemberActionState =
	ActionResult<InviteOrgMemberActionData> | null;

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember` + Tier-2 `clients.invite` via `hasPermission`.
 *
 * Neon Auth invite is cross-system (no shared DB transaction with
 * `platform_rbac_audit`). Durable privileged attribution is closed by writing
 * the org-scoped audit row **before** calling Neon — invite never runs without
 * actor·org·time·correlation on disk (ARCH-023 · GUIDE-018 I5.1 / I5.3).
 */
export async function inviteOrgMemberAction(
	_prev: InviteOrgMemberActionState,
	formData: FormData,
): Promise<InviteOrgMemberActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(inviteOrgMemberCommandSchema, {
		email: formData.get("email"),
		role: formData.get("role"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid email and membership role.",
		});
	}

	if (!canInviteMember(session.role, parsed.data.role)) {
		return errorResult.fail("FORBIDDEN");
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"clients.invite",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	let auditId: string;
	try {
		const attribution = await readRequestAttribution();
		const audit = await recordRbacAudit({
			orgId: session.orgId,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: session.userId,
			correlationId,
			targetType: "membership",
			targetId: parsed.data.email,
			newValue: {
				email: parsed.data.email,
				role: parsed.data.role,
				stage: "requested",
			},
			ipAddress: attribution.ipAddress,
			userAgent: attribution.userAgent,
		});
		if (!audit.ok) {
			logProductEvent({
				level: "error",
				event: "action.internal_error",
				correlationId,
				orgId: session.orgId,
				actorUserId: session.userId,
				path: "inviteOrgMemberAction.audit",
				code: audit.code,
			});
			return errorResult.fail("INTERNAL_ERROR", { correlationId });
		}
		auditId = audit.data.id;
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction.audit",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	const invited = await inviteOrgMember({
		email: parsed.data.email,
		orgId: session.orgId,
		role: parsed.data.role,
	});
	if (!invited.ok) {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction",
			code: invited.code,
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
	const { invitationId } = invited.data;

	logProductEvent({
		level: "info",
		event: "member.invite",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "inviteOrgMemberAction",
	});

	revalidatePath("/admin");

	return errorResult.ok({
		email: parsed.data.email,
		auditId,
		joinUrl: invitationId ? buildJoinUrl({ invitationId }) : null,
	});
}
