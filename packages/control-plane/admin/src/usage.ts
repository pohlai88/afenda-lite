import { authServer } from "@afenda/auth";
import {
	database as afendaDatabase,
	and,
	count,
	eq,
	gte,
	lt,
	platformRbacAudit,
	platformRoleAssignment,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import {
	type GetOrganizationUsageInput,
	getOrganizationUsageInputSchema,
	type OrganizationUsageMetrics,
} from "./schemas/usage";
import { buildUsagePosition } from "./usage-position";

const PERIOD_YEAR_MONTH_SEPARATOR = "-" as const;
const MONTH_INDEX_OFFSET = 1;
const UTC_MONTH_START_DAY = 1;

/**
 * UTC half-open bounds for a `YYYY-MM` period: `[start, end)`.
 */
export function usagePeriodUtcBounds(period: string): {
	start: Date;
	end: Date;
} {
	const [yearText, monthText] = period.split(PERIOD_YEAR_MONTH_SEPARATOR);
	const year = Number(yearText);
	const month = Number(monthText);
	const start = new Date(
		Date.UTC(year, month - MONTH_INDEX_OFFSET, UTC_MONTH_START_DAY),
	);
	const end = new Date(
		Date.UTC(year, month - MONTH_INDEX_OFFSET + 1, UTC_MONTH_START_DAY),
	);
	return { start, end };
}

function mapUsageFailure(error: unknown): Result<never> {
	const normalized = errorIngress.unknown(error, {
		operation: "admin.usage",
	});
	if (normalized === error) {
		return errorProject.result(normalized);
	}
	return errorProject.result(
		errorIngress.postgres(error, { operation: "admin.usage.persistence" }),
	);
}

/**
 * Real org-console usage position for a UTC calendar month.
 * Members via Neon Auth; audit events + active assignments via Drizzle counts;
 * bands/alerts via pure `buildUsagePosition`.
 */
export async function getOrganizationUsageMetrics(
	input: unknown,
): Promise<Result<OrganizationUsageMetrics>> {
	const parsed = getOrganizationUsageInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid organization usage input",
		});
	}

	const command: GetOrganizationUsageInput = parsed.data;
	const { start, end } = usagePeriodUtcBounds(command.period);

	try {
		// Session/active-org gate first (cheap Auth failure before DB work).
		const members = await authServer.members.list(command.orgId);

		const auditWhere = and(
			eq(platformRbacAudit.organizationId, command.orgId),
			gte(platformRbacAudit.createdAt, start),
			lt(platformRbacAudit.createdAt, end),
		);
		if (auditWhere === undefined) {
			throw new Error("@afenda/admin: usage audit where clause is required");
		}

		const assignmentWhere = and(
			eq(platformRoleAssignment.organizationId, command.orgId),
			eq(platformRoleAssignment.active, true),
		);
		if (assignmentWhere === undefined) {
			throw new Error(
				"@afenda/admin: usage assignment where clause is required",
			);
		}

		const [[auditCountRow], [assignmentCountRow]] = await Promise.all([
			afendaDatabase.client
				.select({ value: count() })
				.from(platformRbacAudit)
				.where(auditWhere),
			afendaDatabase.client
				.select({ value: count() })
				.from(platformRoleAssignment)
				.where(assignmentWhere),
		]);

		return errorResult.ok(
			buildUsagePosition({
				orgId: command.orgId,
				period: command.period,
				counts: {
					activeMembers: members.length,
					rbacAuditEvents: Number(auditCountRow?.value ?? 0),
					activeRoleAssignments: Number(assignmentCountRow?.value ?? 0),
				},
			}),
		);
	} catch (error) {
		return mapUsageFailure(error);
	}
}
