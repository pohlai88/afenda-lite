import {
	and,
	clientAssignments,
	clientProfiles,
	db,
	eq,
	ne,
	sql,
} from "@afenda/db";

import { SUBMITTED_ASSIGNMENT_STATUS } from "@/modules/declarations/domain/assignment-status";
import type {
	DeclarationDraftGetResponse,
	SaveClientDeclarationDraft,
} from "@/modules/declarations/schemas/client";
import type { SurveyAnswers } from "@/modules/declarations/schemas/common";

/**
 * Declarations — client draft get/save under hard `organization_id` + email owner.
 * Draft writes are locked after finalize (`status === submitted`).
 * UPDATE WHERE excludes submitted so concurrent finalize cannot be overwritten.
 */

export type SaveClientDeclarationDraftOutcome =
	| { ok: true; savedAt: string }
	| { ok: false; reason: "not_found" | "locked" };

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function ownershipEmailPredicate(clientEmail: string) {
	return eq(sql`lower(${clientAssignments.clientEmail})`, clientEmail);
}

function asSurveyAnswers(value: unknown): SurveyAnswers {
	if (value === null || value === undefined) {
		return {};
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as SurveyAnswers;
}

export async function isClientOnboardingComplete(input: {
	orgId: string;
	userId: string;
}): Promise<boolean> {
	const orgId = input.orgId.trim();
	const userId = input.userId.trim();
	if (orgId.length === 0 || userId.length === 0) {
		return false;
	}

	const [row] = await db
		.select({ onboardingComplete: clientProfiles.onboardingComplete })
		.from(clientProfiles)
		.where(
			and(
				eq(clientProfiles.userId, userId),
				eq(clientProfiles.organizationId, orgId),
			),
		)
		.limit(1);

	return row?.onboardingComplete === true;
}

export async function getClientDeclarationDraft(input: {
	orgId: string;
	clientEmail: string;
	assignmentId: string;
}): Promise<DeclarationDraftGetResponse | null> {
	const orgId = input.orgId.trim();
	const clientEmail = normalizeEmail(input.clientEmail);
	const assignmentId = input.assignmentId.trim();
	if (
		orgId.length === 0 ||
		clientEmail.length === 0 ||
		assignmentId.length === 0
	) {
		return null;
	}

	const [row] = await db
		.select({
			id: clientAssignments.id,
			draftAnswers: clientAssignments.draftAnswers,
			draftStepIndex: clientAssignments.draftStepIndex,
			draftSavedAt: clientAssignments.draftSavedAt,
		})
		.from(clientAssignments)
		.where(
			and(
				eq(clientAssignments.id, assignmentId),
				eq(clientAssignments.organizationId, orgId),
				ownershipEmailPredicate(clientEmail),
			),
		)
		.limit(1);

	if (!row) {
		return null;
	}

	return {
		assignmentId: row.id,
		answers: asSurveyAnswers(row.draftAnswers),
		stepIndex: row.draftStepIndex ?? 0,
		savedAt: row.draftSavedAt?.toISOString() ?? null,
	};
}

export async function saveClientDeclarationDraft(input: {
	orgId: string;
	clientEmail: string;
	draft: SaveClientDeclarationDraft;
}): Promise<SaveClientDeclarationDraftOutcome> {
	const orgId = input.orgId.trim();
	const clientEmail = normalizeEmail(input.clientEmail);
	const assignmentId = input.draft.assignmentId.trim();
	if (
		orgId.length === 0 ||
		clientEmail.length === 0 ||
		assignmentId.length === 0
	) {
		return { ok: false, reason: "not_found" };
	}

	const [existing] = await db
		.select({
			draftAnswers: clientAssignments.draftAnswers,
			status: clientAssignments.status,
		})
		.from(clientAssignments)
		.where(
			and(
				eq(clientAssignments.id, assignmentId),
				eq(clientAssignments.organizationId, orgId),
				ownershipEmailPredicate(clientEmail),
			),
		)
		.limit(1);

	if (!existing) {
		return { ok: false, reason: "not_found" };
	}

	if (existing.status === SUBMITTED_ASSIGNMENT_STATUS) {
		return { ok: false, reason: "locked" };
	}

	const mergedAnswers: SurveyAnswers = {
		...asSurveyAnswers(existing.draftAnswers),
		...input.draft.answers,
	};

	const savedAt = new Date();
	const [row] = await db
		.update(clientAssignments)
		.set({
			draftAnswers: mergedAnswers,
			draftStepIndex: input.draft.stepIndex,
			draftSavedAt: savedAt,
		})
		.where(
			and(
				eq(clientAssignments.id, assignmentId),
				eq(clientAssignments.organizationId, orgId),
				ownershipEmailPredicate(clientEmail),
				ne(clientAssignments.status, SUBMITTED_ASSIGNMENT_STATUS),
			),
		)
		.returning({
			draftSavedAt: clientAssignments.draftSavedAt,
		});

	if (!row?.draftSavedAt) {
		const [again] = await db
			.select({ status: clientAssignments.status })
			.from(clientAssignments)
			.where(
				and(
					eq(clientAssignments.id, assignmentId),
					eq(clientAssignments.organizationId, orgId),
					ownershipEmailPredicate(clientEmail),
				),
			)
			.limit(1);
		if (again?.status === SUBMITTED_ASSIGNMENT_STATUS) {
			return { ok: false, reason: "locked" };
		}
		return { ok: false, reason: "not_found" };
	}

	return { ok: true, savedAt: row.draftSavedAt.toISOString() };
}
