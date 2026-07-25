import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
} from "../permissions";
import type { HumanResourcesAuthorizationPort } from "../shared/authorization-types";
import type { HumanResourcesStore } from "../store";
import {
	applyCaseFieldProjection,
	BASIC_CASE_FIELDS,
	caseProjectionFields,
	INVESTIGATOR_CASE_FIELDS,
	PARTICIPANT_CASE_FIELDS,
} from "./case-field-projection";
import type { EmployeeCase } from "./types";

export type CaseAccessType = "read" | "write" | "investigate" | "legal_hold";

export interface CaseAccessResult {
	allowed: boolean;
	projectedFields: string[];
	employeeCase: EmployeeCase;
	reason?: string;
}

export { applyCaseFieldProjection };

const INVESTIGATOR_FIELDS = caseProjectionFields(INVESTIGATOR_CASE_FIELDS);
const PARTICIPANT_FIELDS = caseProjectionFields(PARTICIPANT_CASE_FIELDS);
const BASIC_FIELDS = caseProjectionFields(BASIC_CASE_FIELDS);

export async function evaluateCaseReadAccess(
	store: HumanResourcesStore,
	authorization: HumanResourcesAuthorizationPort,
	input: {
		organizationId: string;
		actorUserId: string;
		actorEmployeeId: HumanResourcesEmployeeId;
		employeeCase: EmployeeCase;
		accessType: CaseAccessType;
	},
): Promise<Result<CaseAccessResult>> {
	const { employeeCase } = input;

	if (employeeCase.organizationId !== input.organizationId) {
		return fail(
			"FORBIDDEN",
			"No access to this employee relations case",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

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
			employeeId: input.actorEmployeeId,
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
		employeeId: input.actorEmployeeId,
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
		managerEmployeeId: input.actorEmployeeId,
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
	const currentDate = new Date().toISOString().slice(0, 10);

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
