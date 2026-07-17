import { and, clientAssignments, db, eq, sql } from "@afenda/db";

import { SUBMITTED_ASSIGNMENT_STATUS } from "@/modules/declarations/domain/assignment-status";
import type { SubmitClientDeclarationResponse } from "@/modules/declarations/schemas/client";
import type { SurveyAnswers } from "@/modules/declarations/schemas/common";

/**
 * Declarations — client finalize/submit under hard `organization_id` + email owner.
 * Idempotent: re-submit of an already-submitted assignment returns the same confirmation.
 */

export { SUBMITTED_ASSIGNMENT_STATUS };

export type SubmitClientDeclarationOutcome =
	| { ok: true; data: SubmitClientDeclarationResponse }
	| { ok: false; reason: "not_found" | "empty_answers" };

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

export function hasDeclarationAnswerContent(answers: SurveyAnswers): boolean {
	for (const value of Object.values(answers)) {
		if (typeof value === "boolean") {
			return true;
		}
		if (typeof value === "string" && value.trim().length > 0) {
			return true;
		}
	}
	return false;
}

export async function submitClientDeclaration(input: {
	orgId: string;
	clientEmail: string;
	assignmentId: string;
}): Promise<SubmitClientDeclarationOutcome> {
	const orgId = input.orgId.trim();
	const clientEmail = normalizeEmail(input.clientEmail);
	const assignmentId = input.assignmentId.trim();
	if (
		orgId.length === 0 ||
		clientEmail.length === 0 ||
		assignmentId.length === 0
	) {
		return { ok: false, reason: "not_found" };
	}

	const [existing] = await db
		.select({
			id: clientAssignments.id,
			status: clientAssignments.status,
			confirmationCode: clientAssignments.confirmationCode,
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
		return { ok: false, reason: "not_found" };
	}

	if (existing.status === SUBMITTED_ASSIGNMENT_STATUS) {
		const confirmationCode = existing.confirmationCode?.trim() ?? "";
		if (confirmationCode.length === 0) {
			return { ok: false, reason: "not_found" };
		}
		return {
			ok: true,
			data: {
				assignmentId: existing.id,
				status: SUBMITTED_ASSIGNMENT_STATUS,
				confirmationCode,
				idempotent: true,
			},
		};
	}

	const answers = asSurveyAnswers(existing.draftAnswers);
	if (!hasDeclarationAnswerContent(answers)) {
		return { ok: false, reason: "empty_answers" };
	}

	const confirmationCode = crypto.randomUUID();
	const savedAt = new Date();
	const [row] = await db
		.update(clientAssignments)
		.set({
			status: SUBMITTED_ASSIGNMENT_STATUS,
			confirmationCode,
			draftAnswers: answers,
			draftSavedAt: savedAt,
		})
		.where(
			and(
				eq(clientAssignments.id, assignmentId),
				eq(clientAssignments.organizationId, orgId),
				ownershipEmailPredicate(clientEmail),
				eq(clientAssignments.status, existing.status),
			),
		)
		.returning({
			id: clientAssignments.id,
			confirmationCode: clientAssignments.confirmationCode,
			status: clientAssignments.status,
		});

	if (!row?.confirmationCode || row.status !== SUBMITTED_ASSIGNMENT_STATUS) {
		// Concurrent submit race: re-read owned row for idempotent confirmation.
		const [again] = await db
			.select({
				id: clientAssignments.id,
				status: clientAssignments.status,
				confirmationCode: clientAssignments.confirmationCode,
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

		if (
			again?.status === SUBMITTED_ASSIGNMENT_STATUS &&
			again.confirmationCode
		) {
			return {
				ok: true,
				data: {
					assignmentId: again.id,
					status: SUBMITTED_ASSIGNMENT_STATUS,
					confirmationCode: again.confirmationCode,
					idempotent: true,
				},
			};
		}
		return { ok: false, reason: "not_found" };
	}

	return {
		ok: true,
		data: {
			assignmentId: row.id,
			status: SUBMITTED_ASSIGNMENT_STATUS,
			confirmationCode: row.confirmationCode,
			idempotent: false,
		},
	};
}
