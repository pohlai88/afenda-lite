import { and, clientAssignments, db, eq, sql, surveys } from "@afenda/db";

import type { ClientDeclarationGetResponse } from "@/modules/declarations/schemas/client";
import type { SurveyAnswers } from "@/modules/declarations/schemas/common";

/**
 * Declarations — owned client read under hard `organization_id` + email owner.
 * RSC → domain (adapter-map: no web-UI list/read REST).
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

export async function getClientDeclaration(input: {
	orgId: string;
	clientEmail: string;
	assignmentId: string;
}): Promise<ClientDeclarationGetResponse | null> {
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
			assignmentId: clientAssignments.id,
			surveyId: clientAssignments.surveyId,
			status: clientAssignments.status,
			confirmationCode: clientAssignments.confirmationCode,
			draftAnswers: clientAssignments.draftAnswers,
			draftStepIndex: clientAssignments.draftStepIndex,
			draftSavedAt: clientAssignments.draftSavedAt,
			dueDate: clientAssignments.dueDate,
			createdAt: clientAssignments.createdAt,
			title: surveys.title,
			slug: surveys.slug,
			question: surveys.question,
			referenceNumber: surveys.referenceNumber,
			caseNumber: surveys.caseNumber,
			effectiveDate: surveys.effectiveDate,
			submitBefore: surveys.submitBefore,
			surveyorName: surveys.surveyorName,
			surveyorOrg: surveys.surveyorOrg,
			surveyeeOrg: surveys.surveyeeOrg,
			purpose: surveys.purpose,
			categories: surveys.categories,
		})
		.from(clientAssignments)
		.innerJoin(surveys, eq(clientAssignments.surveyId, surveys.id))
		.where(
			and(
				eq(clientAssignments.id, assignmentId),
				eq(clientAssignments.organizationId, orgId),
				ownershipEmailPredicate(clientEmail),
				eq(surveys.organizationId, orgId),
			),
		)
		.limit(1);

	if (!row) {
		return null;
	}

	return {
		assignmentId: row.assignmentId,
		surveyId: row.surveyId,
		status: row.status,
		confirmationCode: row.confirmationCode,
		answers: asSurveyAnswers(row.draftAnswers),
		stepIndex: row.draftStepIndex ?? 0,
		draftSavedAt: row.draftSavedAt?.toISOString() ?? null,
		title: row.title,
		slug: row.slug,
		question: row.question,
		referenceNumber: row.referenceNumber,
		caseNumber: row.caseNumber,
		effectiveDate: row.effectiveDate == null ? null : String(row.effectiveDate),
		submitBefore: row.submitBefore?.toISOString() ?? null,
		dueDate: row.dueDate?.toISOString() ?? null,
		surveyorName: row.surveyorName,
		surveyorOrg: row.surveyorOrg,
		surveyeeOrg: row.surveyeeOrg,
		purpose: row.purpose,
		categories: row.categories ?? [],
		createdAt: row.createdAt.toISOString(),
	};
}
