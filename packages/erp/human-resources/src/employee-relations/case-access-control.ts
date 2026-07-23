import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesAuthorizationPort } from "../authorization";
import type {
	HumanResourcesEmployeeCaseId,
	HumanResourcesEmployeeId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesIdentityResolverPort } from "../identity-resolver";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
} from "../permissions";
import type { HumanResourcesStore } from "../store";
import type { EmployeeCase } from "./types";

export type CaseAccessType = "read" | "write" | "investigate" | "legal_hold";

export interface CaseAccessResult {
	allowed: boolean;
	projectedFields: string[];
	employeeCase: EmployeeCase;
	reason?: string;
}

const INVESTIGATOR_FIELDS = [
	"id",
	"caseNumber",
	"status",
	"priority",
	"category",
	"subcategory",
	"summary",
	"description",
	"events",
	"actions",
	"evidence",
	"witnessStatements",
	"outcomes",
	"employeeId",
	"employmentId",
	"ownerActorUserId",
	"subjectActorUserId",
	"participants",
	"findingCode",
	"outcomeCode",
	"classificationCode",
	"version",
	"createdAt",
	"updatedAt",
];

const PARTICIPANT_FIELDS = [
	"id",
	"caseNumber",
	"status",
	"priority",
	"category",
	"subcategory",
	"summary",
	"events",
	"outcomes",
	"employeeId",
	"version",
];

const BASIC_FIELDS = [
	"id",
	"caseNumber",
	"status",
	"category",
	"summary",
	"employeeId",
	"version",
];

export async function requireCaseAccess(
	identityResolver: HumanResourcesIdentityResolverPort,
	store: HumanResourcesStore,
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		caseId: HumanResourcesEmployeeCaseId;
		accessType: CaseAccessType;
	},
): Promise<Result<CaseAccessResult>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
		);
	}

	const caseResult = await store.findEmployeeCaseInOrganization({
		organizationId: input.organizationId,
		caseId: input.caseId,
	});
	if (!caseResult.ok) return caseResult;
	if (!caseResult.data) {
		return fail(
			"NOT_FOUND",
			"Employee case not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const employeeCase = caseResult.data;

	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
	});
	if (!identity.ok) return identity;
	if (!identity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	const actorEmployeeId = identity.data.employeeId;

	const adminPermissions = [
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
		HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	] as const;

	for (const permission of adminPermissions) {
		const hasAdmin = await authorization.can({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission,
		});
		if (hasAdmin) {
			return ok({
				allowed: true,
				projectedFields: INVESTIGATOR_FIELDS,
				employeeCase,
				reason: "Administrative access",
			});
		}
	}

	if (input.accessType === "legal_hold") {
		const hasLegalHold = await authorization.can({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
		});
		if (hasLegalHold) {
			return ok({
				allowed: true,
				projectedFields: INVESTIGATOR_FIELDS,
				employeeCase,
				reason: "Legal hold access",
			});
		}
	}

	const hasInvestigatorAccess = await authorization.can({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	});

	if (hasInvestigatorAccess) {
		const isInvestigator = await checkCaseInvestigatorAccess(store, {
			organizationId: input.organizationId,
			employeeCase,
			employeeId: actorEmployeeId,
		});
		if (isInvestigator.ok && isInvestigator.data) {
			return ok({
				allowed: true,
				projectedFields: INVESTIGATOR_FIELDS,
				employeeCase,
				reason: "Assigned investigator",
			});
		}
	}

	const participantAccess = await checkCaseParticipantAccess(store, {
		organizationId: input.organizationId,
		employeeCase,
		employeeId: actorEmployeeId,
	});

	if (participantAccess.ok && participantAccess.data) {
		if (input.accessType === "read") {
			return ok({
				allowed: true,
				projectedFields: PARTICIPANT_FIELDS,
				employeeCase,
				reason: "Case participant",
			});
		}
		return fail(
			"FORBIDDEN",
			"Participants can only read case information",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	const managerAccess = await checkManagerCaseAccess(store, {
		organizationId: input.organizationId,
		employeeCase,
		managerEmployeeId: actorEmployeeId,
	});

	if (managerAccess.ok && managerAccess.data) {
		if (input.accessType === "read") {
			return ok({
				allowed: true,
				projectedFields: BASIC_FIELDS,
				employeeCase,
				reason: "Manager of case participant",
			});
		}
		return fail(
			"FORBIDDEN",
			"Managers can only read basic case information",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	return fail(
		"FORBIDDEN",
		"No access to this employee relations case",
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
	);
}

async function checkCaseInvestigatorAccess(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeCase: EmployeeCase;
		employeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<boolean>> {
	const ownerMapping = await store.getUserEmployeeMapping({
		organizationId: input.organizationId,
		userId: input.employeeCase.ownerActorUserId,
	});
	if (!ownerMapping.ok || !ownerMapping.data) {
		return ok(false);
	}
	return ok(ownerMapping.data.employeeId === input.employeeId);
}

async function checkCaseParticipantAccess(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeCase: EmployeeCase;
		employeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<boolean>> {
	const employeeCase = input.employeeCase;

	if (employeeCase.employeeId === input.employeeId) {
		return ok(true);
	}

	if (employeeCase.subjectActorUserId) {
		const subjectMapping = await store.getUserEmployeeMapping({
			organizationId: input.organizationId,
			userId: employeeCase.subjectActorUserId,
		});
		if (
			subjectMapping.ok &&
			subjectMapping.data &&
			subjectMapping.data.employeeId === input.employeeId
		) {
			return ok(true);
		}
	}

	if (Array.isArray(employeeCase.participants)) {
		for (const participant of employeeCase.participants) {
			if (
				typeof participant === "object" &&
				participant !== null &&
				participant.actorUserId
			) {
				const participantMapping = await store.getUserEmployeeMapping({
					organizationId: input.organizationId,
					userId: participant.actorUserId,
				});
				if (
					participantMapping.ok &&
					participantMapping.data &&
					participantMapping.data.employeeId === input.employeeId
				) {
					return ok(true);
				}
			}
		}
	}

	return ok(false);
}

async function checkManagerCaseAccess(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeCase: EmployeeCase;
		managerEmployeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<boolean>> {
	const employeeCase = input.employeeCase;
	const currentDate = new Date().toISOString().split("T")[0]!;

	const isPrimaryManager = await store.getPrimaryManagerForEmployee({
		organizationId: input.organizationId,
		employeeId: employeeCase.employeeId,
		asOf: currentDate,
	});

	if (
		isPrimaryManager.ok &&
		isPrimaryManager.data === input.managerEmployeeId
	) {
		return ok(true);
	}

	if (Array.isArray(employeeCase.participants)) {
		for (const participant of employeeCase.participants) {
			if (
				typeof participant === "object" &&
				participant !== null &&
				participant.actorUserId
			) {
				const participantMapping = await store.getUserEmployeeMapping({
					organizationId: input.organizationId,
					userId: participant.actorUserId,
					asOf: currentDate,
				});

				if (participantMapping.ok && participantMapping.data) {
					const participantManager = await store.getPrimaryManagerForEmployee({
						organizationId: input.organizationId,
						employeeId: participantMapping.data.employeeId,
						asOf: currentDate,
					});

					if (
						participantManager.ok &&
						participantManager.data === input.managerEmployeeId
					) {
						return ok(true);
					}
				}
			}
		}
	}

	return ok(false);
}

export async function applyCaseFieldProjection<
	T extends Record<string, unknown>,
>(data: T, allowedFields: string[]): Promise<Partial<T>> {
	const result: Partial<T> = {};

	for (const field of allowedFields) {
		if (field in data) {
			result[field as keyof T] = data[field as keyof T];
		}
	}

	return result;
}
