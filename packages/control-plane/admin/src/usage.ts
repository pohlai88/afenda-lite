import { listOrgMembers } from "@afenda/auth";
import {
	and,
	count,
	db,
	eq,
	gte,
	lt,
	platformRbacAudit,
	platformRoleAssignment,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

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
	if (!(error instanceof Error)) {
		return failFromUnknown(error, "Failed to load organization usage");
	}
	const probe = error.message.trim();
	if (/refuses organization other than the active session org/i.test(probe)) {
		return fail(
			"FORBIDDEN",
			"Usage metrics require the active session organization",
		);
	}
	if (/unauthor|forbidden|denied/i.test(probe)) {
		return fail("UNAUTHORIZED", "Not authorized for organization usage");
	}
	return failFromUnknown(error, "Failed to load organization usage");
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
		return fail("BAD_REQUEST", "Invalid organization usage input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const command: GetOrganizationUsageInput = parsed.data;
	const { start, end } = usagePeriodUtcBounds(command.period);

	try {
		// Session/active-org gate first (cheap Auth failure before DB work).
		const members = await listOrgMembers(command.orgId);

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
			db.select({ value: count() }).from(platformRbacAudit).where(auditWhere),
			db
				.select({ value: count() })
				.from(platformRoleAssignment)
				.where(assignmentWhere),
		]);

		return ok(
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
