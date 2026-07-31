import {
	database as afendaDatabase,
	and,
	eq,
	gte,
	hrReportingLine,
	hrUserEmployee,
	isNull,
	lte,
	or,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesEmployeeId } from "../../brands";
import type { HumanResourcesEmployeeIdentity } from "../../identity-resolver";
import { mapPersistenceFailure } from "../../shared/persistence-errors";
import type { HumanResourcesIdentityStore } from "../../store/identity";

export const drizzleIdentityMethods: HumanResourcesIdentityStore = {
	async getUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}): Promise<Result<HumanResourcesEmployeeIdentity | null>> {
		try {
			const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);

			const result = await afendaDatabase.client
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
				return errorResult.ok(null);
			}

			const mapping = result.at(0);
			if (!mapping) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				employeeId: mapping.employeeId as HumanResourcesEmployeeId,
				relationshipType: mapping.relationshipType as "self" | "proxy",
				effectiveFrom: mapping.effectiveFrom,
				effectiveUntil: mapping.effectiveUntil,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get user employee mapping",
			);
		}
	},

	async getManagerEmployeesForUser(input: {
		organizationId: string;
		userId: string;
		asOf?: string | undefined;
	}): Promise<Result<HumanResourcesEmployeeId[]>> {
		try {
			// First, get the employee ID for this user
			const userEmployeeResult = await this.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.userId,
				...(input.asOf === undefined ? {} : { asOf: input.asOf }),
			});

			if (!(userEmployeeResult.ok && userEmployeeResult.data)) {
				return errorResult.ok([]);
			}

			const managerEmployeeId = userEmployeeResult.data.employeeId;
			const queryDate = input.asOf ?? new Date().toISOString().slice(0, 10);

			// Find all employees that report to this manager (primary reporting lines)
			const result = await afendaDatabase.client
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

			const employeeIds = result.map(
				(r) => r.employeeId as HumanResourcesEmployeeId,
			);
			return errorResult.ok(employeeIds);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get manager employees for user",
			);
		}
	},

	async createUserEmployeeMapping(input: {
		organizationId: string;
		userId: string;
		employeeId: HumanResourcesEmployeeId;
		relationshipType: "self" | "proxy";
		effectiveFrom: string;
		effectiveUntil?: string | undefined;
		actorUserId: string;
	}): Promise<Result<{ id: string }>> {
		try {
			const result = await afendaDatabase.client
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

			const [created] = result;
			if (!created) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			return errorResult.ok({ id: created.id });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create user employee mapping",
			);
		}
	},
};
