import { and, clientAssignments, clientProfiles, db, eq, sql } from "@afenda/db";

import type {
	DeclarationDraftGetResponse,
	DeclarationDraftWriteResponse,
	SaveClientDeclarationDraft,
} from "@/modules/declarations/schemas/client";
import type { SurveyAnswers } from "@/modules/declarations/schemas/common";

/**
 * Declarations — client draft get/save under hard `organization_id` + email owner.
 */

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
}): Promise<DeclarationDraftWriteResponse | null> {
	const orgId = input.orgId.trim();
	const clientEmail = normalizeEmail(input.clientEmail);
	const assignmentId = input.draft.assignmentId.trim();
	if (
		orgId.length === 0 ||
		clientEmail.length === 0 ||
		assignmentId.length === 0
	) {
		return null;
	}

	const [existing] = await db
		.select({
			draftAnswers: clientAssignments.draftAnswers,
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
		return null;
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
			),
		)
		.returning({
			draftSavedAt: clientAssignments.draftSavedAt,
		});

	if (!row?.draftSavedAt) {
		return null;
	}

	return { savedAt: row.draftSavedAt.toISOString() };
}
