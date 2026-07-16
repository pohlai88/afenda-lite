import { and, clientAssignments, db, eq, surveys } from "@afenda/db";

/**
 * Declarations — client assignment list under hard org + email ownership.
 * Joins surveys for display fields (ARCH-024 domain → `@afenda/db`).
 */

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export type ClientAssignmentListItem = {
	assignmentId: string;
	surveyId: string;
	status: string;
	dueDate: Date | null;
	draftSavedAt: Date | null;
	createdAt: Date;
	title: string;
	slug: string;
	question: string;
	referenceNumber: string | null;
	caseNumber: string | null;
	effectiveDate: string | null;
	submitBefore: Date | null;
	surveyorName: string | null;
	surveyorOrg: string | null;
	surveyeeOrg: string | null;
	purpose: string | null;
	categories: string[];
};

export async function listClientAssignments(input: {
	orgId: string;
	clientEmail: string;
}): Promise<ClientAssignmentListItem[]> {
	const orgId = input.orgId.trim();
	const clientEmail = normalizeEmail(input.clientEmail);
	if (orgId.length === 0 || clientEmail.length === 0) {
		return [];
	}

	const rows = await db
		.select({
			assignmentId: clientAssignments.id,
			surveyId: clientAssignments.surveyId,
			status: clientAssignments.status,
			dueDate: clientAssignments.dueDate,
			draftSavedAt: clientAssignments.draftSavedAt,
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
				eq(clientAssignments.organizationId, orgId),
				eq(clientAssignments.clientEmail, clientEmail),
				eq(surveys.organizationId, orgId),
			),
		);

	return rows.map((row) => ({
		...row,
		effectiveDate: row.effectiveDate == null ? null : String(row.effectiveDate),
		categories: row.categories ?? [],
	}));
}
