import { and, db, eq, gte, hrReportingLine, hrUserEmployee, isNull, lte, or } from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../../brands";
import type { HumanResourcesEmployeeIdentity } from "../../identity-resolver";
import type { HumanResourcesIdentityStore } from "../../store/identity";

export const drizzleIdentityMethods: HumanResourcesIdentityStore = {
	async getUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
		try {
			const queryDate =
				input.asOf ?? new Date().toISOString().slice(0, 10);

			const result = await db
				.select({
					employeeId: hrUserEmployee.employeeId,
					relationshipType: hrUserEmployee.relationshipType,
					effectiveFrom: hrUserEmployee.effectiveFrom,
					effectiveUntil: hrUserEmployee.effectiveUntil,
				})
				.from(hrUserEmployee)
				.where(
					and(
						eq(hrUserEmployee.organizationId, input.organizationId),
						eq(hrUserEmployee.userId, input.userId),
						lte(hrUserEmployee.effectiveFrom, queryDate),
						or(
							isNull(hrUserEmployee.effectiveUntil),
							gte(hrUserEmployee.effectiveUntil, queryDate),
						),
					),
				)
				.limit(1);

			if (result.length === 0) {
				return ok(null);
			}

			const mapping = result[0]!;
			return ok({
				employeeId: mapping.employeeId as HumanResourcesEmployeeId,
				relationshipType: mapping.relationshipType as "self" | "proxy",
				effectiveFrom: mapping.effectiveFrom,
				effectiveUntil: mapping.effectiveUntil,
			});
		} catch (error) {
			return fail(
				"INTERNAL_ERROR",
				"Failed to get user employee mapping",
				{ cause: error },
			);
		}
	},

	async getManagerEmployeesForUser(input: {
		organizationId: string;
		userId: string;
		asOf?: string;
	}): Promise<Result<HumanResourcesEmployeeId[]>> {
		try {
			// First, get the employee ID for this user
			const userEmployeeResult = await this.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.userId,
				asOf: input.asOf,
			});

			if (!userEmployeeResult.ok || !userEmployeeResult.data) {
				return ok([]);
			}

			const managerEmployeeId = userEmployeeResult.data.employeeId;
			const queryDate =
				input.asOf ?? new Date().toISOString().slice(0, 10);

			// Find all employees that report to this manager (primary reporting lines)
			const result = await db
				.select({
					employeeId: hrReportingLine.employeeId,
				})
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.managerEmployeeId, managerEmployeeId),
						eq(hrReportingLine.relationshipKind, "primary"),
						lte(hrReportingLine.startsOn, queryDate),
						or(
							isNull(hrReportingLine.endsOn),
							gte(hrReportingLine.endsOn, queryDate),
						),
					),
				);

			const employeeIds = result.map(r => r.employeeId as HumanResourcesEmployeeId);
			return ok(employeeIds);
		} catch (error) {
			return fail(
				"INTERNAL_ERROR",
				"Failed to get manager employees for user",
				{ cause: error },
			);
		}
	},

	async createUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		relationshipType: "self" | "proxy";
		effectiveFrom: string;
		effectiveUntil?: string;
		actorUserId: string;
	}): Promise<Result<{ id: string }>> {
		try {
			const result = await db
				.insert(hrUserEmployee)
				.values({
					organizationId: input.organizationId,
					userId: input.userId,
					employeeId: input.employeeId,
					relationshipType: input.relationshipType,
					effectiveFrom: input.effectiveFrom,
					effectiveUntil: input.effectiveUntil || null,
					createdBy: input.actorUserId,
				})
				.returning({ id: hrUserEmployee.id });

			return ok({ id: result[0]!.id });
		} catch (error) {
			return fail(
				"INTERNAL_ERROR",
				"Failed to create user employee mapping",
				{ cause: error },
			);
		}
	},
};