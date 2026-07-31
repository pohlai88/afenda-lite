import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesPermission } from "../permissions";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
} from "../permissions";
import type { HumanResourcesAuthorizationPort } from "../shared/authorization-types";
import type { HumanResourcesStore } from "../store";
import {
	BASIC_CASE_FIELDS,
	caseProjectionFields,
	INVESTIGATOR_CASE_FIELDS,
	PARTICIPANT_CASE_FIELDS,
} from "./case-field-projection";
import type { EmployeeCase } from "./types";

export type CaseAccessType = "read" | "write" | "investigate" | "legal_hold";

export interface CaseAccessResult {
	allowed: boolean;
	employeeCase: EmployeeCase;
	projectedFields: string[];
	reason?: string;
}

export { applyCaseFieldProjection } from "./case-field-projection";

const INVESTIGATOR_FIELDS = caseProjectionFields(INVESTIGATOR_CASE_FIELDS);
const PARTICIPANT_FIELDS = caseProjectionFields(PARTICIPANT_CASE_FIELDS);
const BASIC_FIELDS = caseProjectionFields(BASIC_CASE_FIELDS);

async function hasPermissionAtIndex(
	authorization: HumanResourcesAuthorizationPort,
	input: { organizationId: string; actorUserId: string },
	permissions: readonly HumanResourcesPermission[],
	index: number,
): Promise<boolean> {
	const permission = permissions[index];
	if (permission === undefined) {
		return false;
	}
	const allowed = await authorization.can({ ...input, permission });
	return allowed
		? true
		: hasPermissionAtIndex(authorization, input, permissions, index + 1);
}

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
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	const adminPermissions = [
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
		HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	] as const;

	const hasAdmin = await hasPermissionAtIndex(
		authorization,
		{ organizationId: input.organizationId, actorUserId: input.actorUserId },
		adminPermissions,
		0,
	);
	if (hasAdmin) {
		return errorResult.ok({
			allowed: true,
			projectedFields: INVESTIGATOR_FIELDS,
			employeeCase,
			reason: "Administrative access",
		});
	}

	if (input.accessType === "legal_hold") {
		const hasLegalHold = await authorization.can({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
		});
		if (hasLegalHold) {
			return errorResult.ok({
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
			return errorResult.ok({
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
			return errorResult.ok({
				allowed: true,
				projectedFields: PARTICIPANT_FIELDS,
				employeeCase,
				reason: "Case participant",
			});
		}
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	const managerAccess = await checkManagerCaseAccess(store, {
		organizationId: input.organizationId,
		employeeCase,
		managerEmployeeId: input.actorEmployeeId,
	});

	if (managerAccess.ok && managerAccess.data) {
		if (input.accessType === "read") {
			return errorResult.ok({
				allowed: true,
				projectedFields: BASIC_FIELDS,
				employeeCase,
				reason: "Manager of case participant",
			});
		}
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
	}

	return errorResult.fail("FORBIDDEN", {
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		),
	});
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
	if (!(ownerMapping.ok && ownerMapping.data)) {
		return errorResult.ok(false);
	}
	return errorResult.ok(ownerMapping.data.employeeId === input.employeeId);
}

async function checkCaseParticipantAccess(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeCase: EmployeeCase;
		employeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<boolean>> {
	const { employeeCase } = input;

	if (employeeCase.employeeId === input.employeeId) {
		return errorResult.ok(true);
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
			return errorResult.ok(true);
		}
	}

	if (Array.isArray(employeeCase.participants)) {
		return checkParticipantEmployeeAtIndex(
			store,
			input,
			employeeCase.participants,
			0,
		);
	}

	return errorResult.ok(false);
}

async function checkParticipantEmployeeAtIndex(
	store: HumanResourcesStore,
	input: { organizationId: string; employeeId: HumanResourcesEmployeeId },
	participants: EmployeeCase["participants"],
	index: number,
): Promise<Result<boolean>> {
	const participant = participants[index];
	if (participant === undefined) {
		return errorResult.ok(false);
	}
	if (participant.actorUserId) {
		const mapping = await store.getUserEmployeeMapping({
			organizationId: input.organizationId,
			userId: participant.actorUserId,
		});
		if (
			mapping.ok &&
			mapping.data &&
			mapping.data.employeeId === input.employeeId
		) {
			return errorResult.ok(true);
		}
	}
	return checkParticipantEmployeeAtIndex(store, input, participants, index + 1);
}

async function checkManagerCaseAccess(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeCase: EmployeeCase;
		managerEmployeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<boolean>> {
	const { employeeCase } = input;
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
		return errorResult.ok(true);
	}

	if (Array.isArray(employeeCase.participants)) {
		return checkParticipantManagerAtIndex(
			store,
			input,
			employeeCase.participants,
			currentDate,
			0,
		);
	}

	return errorResult.ok(false);
}

async function checkParticipantManagerAtIndex(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
	},
	participants: EmployeeCase["participants"],
	asOf: string,
	index: number,
): Promise<Result<boolean>> {
	const participant = participants[index];
	if (participant === undefined) {
		return errorResult.ok(false);
	}
	if (participant.actorUserId) {
		const mapping = await store.getUserEmployeeMapping({
			organizationId: input.organizationId,
			userId: participant.actorUserId,
			asOf,
		});
		if (mapping.ok && mapping.data) {
			const manager = await store.getPrimaryManagerForEmployee({
				organizationId: input.organizationId,
				employeeId: mapping.data.employeeId,
				asOf,
			});
			if (manager.ok && manager.data === input.managerEmployeeId) {
				return errorResult.ok(true);
			}
		}
	}
	return checkParticipantManagerAtIndex(
		store,
		input,
		participants,
		asOf,
		index + 1,
	);
}
