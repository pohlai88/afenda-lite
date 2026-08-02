import { errorResult } from "@afenda/errors";
import type {
	HumanResourcesPrivacyPort,
	HumanResourcesPrivacySubjectRecord,
	HumanResourcesRetentionClassification,
} from "../../src/features/privacy/contract";
import type {
	EvaluateHumanResourcesAnonymizationInput,
	ExportHumanResourcesSubjectDataInput,
} from "../../src/features/privacy/operations";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createPerson } from "../../src/features/workforce-records/identity/person";
import { createWorker } from "../../src/features/workforce-records/identity/worker";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
} from "../../src/kernel/authorization/permissions";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import type { HumanResourcesEmployeeId } from "../../src/kernel/identity/brands";
import { createMemoryHumanResourcesStore } from "../../src/testing/index";
import { createTestHumanResourcesCommandOptions } from "./command-options";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { createMemoryMutationPorts } from "./memory-ports";

const PRIVACY_SEED_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_PERSON_MANAGE,
	HUMAN_RESOURCES_PERMISSION_WORKER_MANAGE,
] as const;

export async function seedPrivacySubjectEmployee(input: {
	organizationId: string;
	personId: HumanResourcesEmployeeId;
	employeeNumber?: string;
	legalName?: string;
	options?: HumanResourcesCommandOptions;
}) {
	const store = input.options?.store ?? createMemoryHumanResourcesStore();
	const ports = input.options?.ports ?? createMemoryMutationPorts();
	const commandOptions = createTestHumanResourcesCommandOptions({
		...input.options,
		store,
		ports,
		authorization: createGrantingHumanResourcesAuthorization([
			...PRIVACY_SEED_PERMISSIONS,
		]),
	});
	const legalName = input.legalName ?? "Privacy Subject";
	const person = await createPerson(
		{
			organizationId: input.organizationId,
			actorUserId: PRIVACY_TEST_ACTOR_USER_ID,
			correlationId: `${PRIVACY_TEST_CORRELATION_ID}-person`,
			idempotencyKey: `idem-person-${input.personId}`,
			legalName,
		},
		commandOptions,
	);
	if (!person.ok) {
		throw new Error(person.message);
	}
	const created = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: PRIVACY_TEST_ACTOR_USER_ID,
			correlationId: `${PRIVACY_TEST_CORRELATION_ID}-seed`,
			idempotencyKey: `idem-${input.personId}`,
			employeeNumber:
				input.employeeNumber ?? `EMP-${input.personId.slice(0, 8)}`,
			legalName,
		},
		commandOptions,
	);
	if (!created.ok) {
		throw new Error(created.message);
	}
	const worker = await createWorker(
		{
			organizationId: input.organizationId,
			actorUserId: PRIVACY_TEST_ACTOR_USER_ID,
			correlationId: `${PRIVACY_TEST_CORRELATION_ID}-worker`,
			idempotencyKey: `idem-worker-${input.personId}`,
			personId: person.data.id,
			workerType: "employee",
			employeeId: created.data.id,
			effectiveFrom: "2026-01-01",
		},
		commandOptions,
	);
	if (!worker.ok) {
		throw new Error(worker.message);
	}
	return {
		store,
		employee: created.data,
		person: person.data,
		worker: worker.data,
	};
}

export function createPrivacyTestOptionsWithSubject(
	base: Partial<HumanResourcesCommandOptions> & {
		store: NonNullable<HumanResourcesCommandOptions["store"]>;
	},
): HumanResourcesCommandOptions {
	return createHumanResourcesTestOptions(base);
}

const DEFAULT_PRIVACY_TEST_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_PRIVACY_EXPORT,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_RETENTION_EVALUATE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_LEGAL_HOLD_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PRIVACY_ANONYMIZE_EXECUTE,
] as const;

export const PRIVACY_TEST_ORG_A = "org-a";
export const PRIVACY_TEST_ORG_B = "org-b";
export const PRIVACY_TEST_PERSON_A =
	"550e8400-e29b-41d4-a716-446655440001" as HumanResourcesEmployeeId;
export const PRIVACY_TEST_PERSON_B =
	"550e8400-e29b-41d4-a716-446655440002" as HumanResourcesEmployeeId;
export const PRIVACY_TEST_ACTOR_USER_ID = "user-1";
export const PRIVACY_TEST_CORRELATION_ID = "corr-1";
export const PRIVACY_TEST_REQUESTED_AT = "2026-07-25T00:00:00.000Z";

export interface CreateHumanResourcesTestPrivacyPortInput {
	legalHold?: {
		active: boolean;
		reasonCode: string;
	};
	records?: readonly HumanResourcesPrivacySubjectRecord[];
}

export function createHumanResourcesTestPrivacyPort(
	input: CreateHumanResourcesTestPrivacyPortInput = {},
): HumanResourcesPrivacyPort {
	const records = input.records ?? [];
	const { legalHold } = input;

	return {
		async exportSubject(context) {
			const tenantRecords = records.filter(
				(record) => record.organizationId === context.organizationId,
			);
			return await errorResult.ok({
				exportReference: `test://organizations/${context.organizationId}/exports/subject`,
				recordCount: tenantRecords.length,
				records: tenantRecords,
			});
		},
		async evaluateAnonymization(_context) {
			if (legalHold?.active === true) {
				return await errorResult.ok({
					allowed: false,
					reasonCode: legalHold.reasonCode,
				});
			}
			return await errorResult.ok({ allowed: true });
		},
		async rectifySubject() {
			return await errorResult.ok({ rectifiedRecordCount: 0 });
		},
		async anonymizeSubject(context) {
			if (legalHold?.active === true) {
				return await errorResult.ok({ anonymizedRecordCount: 0 });
			}
			const tenantRecords = records.filter(
				(record) => record.organizationId === context.organizationId,
			);
			return await errorResult.ok({
				anonymizedRecordCount: tenantRecords.length,
			});
		},
		async placeLegalHold() {
			return await errorResult.ok({ legalHoldId: "test-hold" });
		},
		async releaseLegalHold() {
			return await errorResult.ok(undefined);
		},
		async redactDownstream() {
			return await errorResult.ok({ redactedSystemCount: 0 });
		},
		async getSubjectPrivacyCase(context) {
			return await errorResult.ok({
				organizationId: context.organizationId,
				subjectEmployeeId: context.subjectEmployeeId,
				exports: [],
				activeLegalHolds:
					legalHold?.active === true
						? [
								{
									legalHoldId: "test-hold",
									holdReference: legalHold.reasonCode,
									classifications: ["employee_relations_and_legal"],
									placedAt: context.requestedAt,
								},
							]
						: [],
				recentOperations: [],
			});
		},
	};
}

/** Plan-facing alias for `createTestHumanResourcesCommandOptions`. */
export function createHumanResourcesTestOptions(
	base: Partial<HumanResourcesCommandOptions> = {},
): HumanResourcesCommandOptions {
	return createTestHumanResourcesCommandOptions({
		authorization:
			base.authorization ??
			createGrantingHumanResourcesAuthorization([
				...DEFAULT_PRIVACY_TEST_PERMISSIONS,
			]),
		...base,
	});
}

export function seedPrivacySubjectRecord(input: {
	organizationId: string;
	personId: HumanResourcesEmployeeId;
	entity?: string;
}): HumanResourcesPrivacySubjectRecord {
	return {
		recordId: input.personId,
		entity: input.entity ?? "hr_employee",
		organizationId: input.organizationId,
	};
}

export function createDualTenantPrivacyRecords(): readonly HumanResourcesPrivacySubjectRecord[] {
	return [
		seedPrivacySubjectRecord({
			organizationId: PRIVACY_TEST_ORG_A,
			personId: PRIVACY_TEST_PERSON_A,
		}),
		seedPrivacySubjectRecord({
			organizationId: PRIVACY_TEST_ORG_B,
			personId: PRIVACY_TEST_PERSON_B,
		}),
	];
}

export function createValidPrivacyExportInput(
	overrides: Partial<ExportHumanResourcesSubjectDataInput> = {},
): ExportHumanResourcesSubjectDataInput {
	return {
		organizationId: PRIVACY_TEST_ORG_A,
		actorUserId: PRIVACY_TEST_ACTOR_USER_ID,
		correlationId: PRIVACY_TEST_CORRELATION_ID,
		personId: PRIVACY_TEST_PERSON_A,
		requestedAt: PRIVACY_TEST_REQUESTED_AT,
		legalBasis: "data_subject_request",
		...overrides,
	};
}

export function createValidPrivacyAnonymizeInput(
	overrides: Partial<EvaluateHumanResourcesAnonymizationInput> = {},
): EvaluateHumanResourcesAnonymizationInput {
	return {
		organizationId: PRIVACY_TEST_ORG_A,
		actorUserId: PRIVACY_TEST_ACTOR_USER_ID,
		correlationId: PRIVACY_TEST_CORRELATION_ID,
		personId: PRIVACY_TEST_PERSON_A,
		requestedAt: PRIVACY_TEST_REQUESTED_AT,
		legalBasis: "anonymization_request",
		...overrides,
	};
}

export const DEFAULT_PRIVACY_CLASSIFICATIONS = [
	"workforce_core",
] as const satisfies readonly HumanResourcesRetentionClassification[];
