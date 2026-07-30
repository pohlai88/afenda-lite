import { fail, ok, type Result } from "@afenda/errors/result";
import type {
	HumanResourcesBulkExportDefinition,
	HumanResourcesBulkExportSource,
	HumanResourcesExportSourceRecord,
	HumanResourcesReadModelFact,
	HumanResourcesReportingFactKind,
	HumanResourcesReportingSourcePort,
	HumanResourcesStore,
} from "@afenda/human-resources";
// biome-ignore-all lint/performance/noAwaitInLoops: Export pages and dependent aggregates are read serially to preserve bounds and fail-fast ordering.
import {
	createDrizzleHumanResourcesReportingSource,
	createDrizzleHumanResourcesStore,
} from "@afenda/human-resources/adapters/drizzle";

export const HUMAN_RESOURCES_BULK_EXPORT_TYPES = [
	"employee",
	"assignment",
	"leave_entitlement",
	"attendance",
	"compensation",
	"learning_assignment",
] as const;

export type HumanResourcesBulkExportType =
	(typeof HUMAN_RESOURCES_BULK_EXPORT_TYPES)[number];

const MAXIMUM_EXPORT_ROWS = 5000;
const SOURCE_PAGE_SIZE = 200;

export const HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS = {
	employee: {
		exportType: "employee",
		requiredPermission: "human-resources.employee.read",
		allowedFields: ["employeeNumber", "legalName", "createdOn", "updatedOn"],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
	assignment: {
		exportType: "assignment",
		requiredPermission: "human-resources.assignment.read",
		allowedFields: [
			"employeeId",
			"employmentId",
			"positionId",
			"startsOn",
			"endsOn",
			"managerEmployeeId",
			"legalEntityKey",
			"businessUnitKey",
			"locationKey",
			"costCentreKey",
			"projectKey",
		],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
	leave_entitlement: {
		exportType: "leave_entitlement",
		requiredPermission: "human-resources.leave-entitlement.read",
		allowedFields: [
			"employeeId",
			"employmentId",
			"policyId",
			"periodStart",
			"periodEnd",
			"openingQuantity",
			"status",
		],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
	attendance: {
		exportType: "attendance",
		requiredPermission: "human-resources.time.attendance.read",
		allowedFields: [
			"employeeId",
			"workDate",
			"scheduledMinutes",
			"workedMinutes",
			"exceptionCount",
		],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
	compensation: {
		exportType: "compensation",
		requiredPermission: "human-resources.compensation.read",
		allowedFields: [
			"employeeId",
			"effectiveFrom",
			"effectiveTo",
			"currencyCode",
			"annualizedAmount",
		],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
	learning_assignment: {
		exportType: "learning_assignment",
		requiredPermission: "human-resources.learning.manage",
		allowedFields: [
			"employeeId",
			"assignedOn",
			"dueOn",
			"completedOn",
			"certificationExpiresOn",
		],
		maximumRows: MAXIMUM_EXPORT_ROWS,
	},
} as const satisfies Record<
	HumanResourcesBulkExportType,
	HumanResourcesBulkExportDefinition
>;

export function getHumanResourcesBulkExportDefinition(
	exportType: HumanResourcesBulkExportType,
): HumanResourcesBulkExportDefinition {
	return HUMAN_RESOURCES_BULK_EXPORT_DEFINITIONS[exportType];
}

function dateOnly(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function employeeSource(
	store: HumanResourcesStore,
): HumanResourcesBulkExportSource {
	return {
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Export pagination enforces bounded, typed projection for all HR sources.
		async list(input) {
			const records: HumanResourcesExportSourceRecord[] = [];
			let page = 1;
			while (records.length <= MAXIMUM_EXPORT_ROWS) {
				const listed = await store.listEmployees({
					organizationId: input.organizationId,
					page,
					pageSize: SOURCE_PAGE_SIZE,
				});
				if (!listed.ok) {
					return listed;
				}
				records.push(
					...listed.data.employees.map((employee) => ({
						organizationId: employee.organizationId,
						recordId: employee.id,
						effectiveFrom: null,
						effectiveTo: null,
						occurredOn: dateOnly(employee.createdAt),
						fields: {
							employeeNumber: employee.employeeNumber,
							legalName: employee.legalName,
							createdOn: dateOnly(employee.createdAt),
							updatedOn: dateOnly(employee.updatedAt),
						},
					})),
				);
				if (page * SOURCE_PAGE_SIZE >= listed.data.totalCount) {
					break;
				}
				page += 1;
			}
			return ok(records);
		},
	};
}

function assignmentSource(
	store: HumanResourcesStore,
): HumanResourcesBulkExportSource {
	return {
		async list(input) {
			const records: HumanResourcesExportSourceRecord[] = [];
			let page = 1;
			while (records.length <= MAXIMUM_EXPORT_ROWS) {
				const employees = await store.listEmployees({
					organizationId: input.organizationId,
					page,
					pageSize: SOURCE_PAGE_SIZE,
				});
				if (!employees.ok) {
					return employees;
				}
				for (const employee of employees.data.employees) {
					const employments = await store.listEmploymentsByEmployee({
						organizationId: input.organizationId,
						employeeId: employee.id,
					});
					if (!employments.ok) {
						return employments;
					}
					for (const employment of employments.data) {
						const assignments = await store.listAssignmentsByEmployment({
							organizationId: input.organizationId,
							employmentId: employment.id,
						});
						if (!assignments.ok) {
							return assignments;
						}
						for (const assignment of assignments.data) {
							const dimensions = assignment.organizationDimensions;
							records.push({
								organizationId: assignment.organizationId,
								recordId: assignment.id,
								effectiveFrom: assignment.startsOn,
								effectiveTo: assignment.endsOn,
								occurredOn: assignment.startsOn,
								fields: {
									employeeId: assignment.employeeId,
									employmentId: assignment.employmentId,
									positionId: assignment.positionId,
									startsOn: assignment.startsOn,
									endsOn: assignment.endsOn,
									managerEmployeeId: assignment.managerEmployeeIdSnapshot,
									legalEntityKey: dimensions?.legal_entity.key ?? null,
									businessUnitKey: dimensions?.business_unit.key ?? null,
									locationKey: dimensions?.location.key ?? null,
									costCentreKey: dimensions?.cost_centre.key ?? null,
									projectKey: dimensions?.project.key ?? null,
								},
							});
							if (records.length > MAXIMUM_EXPORT_ROWS) {
								return ok(records);
							}
						}
					}
				}
				if (page * SOURCE_PAGE_SIZE >= employees.data.totalCount) {
					break;
				}
				page += 1;
			}
			return ok(records);
		},
	};
}

function leaveEntitlementSource(
	store: HumanResourcesStore,
): HumanResourcesBulkExportSource {
	return {
		async list(input) {
			const records: HumanResourcesExportSourceRecord[] = [];
			let page = 1;
			while (records.length <= MAXIMUM_EXPORT_ROWS) {
				const listed = await store.listLeaveEntitlements({
					organizationId: input.organizationId,
					page,
					pageSize: SOURCE_PAGE_SIZE,
				});
				if (!listed.ok) {
					return listed;
				}
				records.push(
					...listed.data.entitlements.map((entitlement) => ({
						organizationId: entitlement.organizationId,
						recordId: entitlement.id,
						effectiveFrom: entitlement.periodStart,
						effectiveTo: entitlement.periodEnd,
						occurredOn: entitlement.periodStart,
						fields: {
							employeeId: entitlement.employeeId,
							employmentId: entitlement.employmentId,
							policyId: entitlement.policyId,
							periodStart: entitlement.periodStart,
							periodEnd: entitlement.periodEnd,
							openingQuantity: entitlement.openingQuantity,
							status: entitlement.status,
						},
					})),
				);
				if (page * SOURCE_PAGE_SIZE >= listed.data.totalCount) {
					break;
				}
				page += 1;
			}
			return ok(records);
		},
	};
}

function reportingRecord(
	fact: HumanResourcesReadModelFact,
): Result<HumanResourcesExportSourceRecord> {
	switch (fact.kind) {
		case "attendance":
			return ok({
				organizationId: fact.organizationId,
				recordId: fact.id,
				effectiveFrom: fact.workDate,
				effectiveTo: fact.workDate,
				occurredOn: fact.workDate,
				fields: {
					employeeId: fact.employeeId,
					workDate: fact.workDate,
					scheduledMinutes: fact.scheduledMinutes,
					workedMinutes: fact.workedMinutes,
					exceptionCount: fact.exceptionCount,
				},
			});
		case "compensation":
			return ok({
				organizationId: fact.organizationId,
				recordId: fact.id,
				effectiveFrom: fact.effectiveFrom,
				effectiveTo: fact.effectiveTo,
				occurredOn: fact.effectiveFrom,
				fields: {
					employeeId: fact.employeeId,
					effectiveFrom: fact.effectiveFrom,
					effectiveTo: fact.effectiveTo,
					currencyCode: fact.currencyCode,
					annualizedAmount: fact.annualizedAmount,
				},
			});
		case "learning":
			return ok({
				organizationId: fact.organizationId,
				recordId: fact.id,
				effectiveFrom: fact.assignedOn,
				effectiveTo: null,
				occurredOn: fact.assignedOn,
				fields: {
					employeeId: fact.employeeId,
					assignedOn: fact.assignedOn,
					dueOn: fact.dueOn,
					completedOn: fact.completedOn,
					certificationExpiresOn: fact.certificationExpiresOn,
				},
			});
		default:
			return fail("INTERNAL_ERROR", "Unsupported reporting export fact");
	}
}

function reportingSource(
	kind: Extract<
		HumanResourcesReportingFactKind,
		"attendance" | "compensation" | "learning"
	>,
	reporting: HumanResourcesReportingSourcePort,
): HumanResourcesBulkExportSource {
	return {
		async list(input) {
			const records: HumanResourcesExportSourceRecord[] = [];
			let page = 1;
			while (records.length <= MAXIMUM_EXPORT_ROWS) {
				const listed = await reporting.listFacts({
					organizationId: input.organizationId,
					kind,
					page,
					pageSize: SOURCE_PAGE_SIZE,
				});
				if (!listed.ok) {
					return listed;
				}
				for (const fact of listed.data.entries) {
					const record = reportingRecord(fact);
					if (!record.ok) {
						return record;
					}
					records.push(record.data);
				}
				if (page * SOURCE_PAGE_SIZE >= listed.data.total) {
					break;
				}
				page += 1;
			}
			return ok(records);
		},
	};
}

export function createHumanResourcesBulkExportSource(
	exportType: HumanResourcesBulkExportType,
	dependencies: {
		store?: HumanResourcesStore;
		reporting?: HumanResourcesReportingSourcePort;
	} = {},
): HumanResourcesBulkExportSource {
	const store = dependencies.store ?? createDrizzleHumanResourcesStore();
	const reporting =
		dependencies.reporting ?? createDrizzleHumanResourcesReportingSource();
	// biome-ignore lint/style/useDefaultSwitchClause: The export-type union is exhaustive so additions require an owned source.
	switch (exportType) {
		case "employee":
			return employeeSource(store);
		case "assignment":
			return assignmentSource(store);
		case "leave_entitlement":
			return leaveEntitlementSource(store);
		case "attendance":
			return reportingSource("attendance", reporting);
		case "compensation":
			return reportingSource("compensation", reporting);
		case "learning_assignment":
			return reportingSource("learning", reporting);
	}
}
