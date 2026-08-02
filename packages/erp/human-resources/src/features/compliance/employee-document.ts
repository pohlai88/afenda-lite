import { errorResult, type Result } from "@afenda/errors";
import type {
	DocumentRequirementListPage,
	EmployeeDocument,
	EmployeeDocumentListItem,
	EmployeeDocumentListPage,
	EmployeeDocumentSensitiveDetail,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type {
	DocumentReferencePort,
	ValidatedDocumentReference,
} from "../../kernel/execution/ports";
import { fingerprintEmployeeDocumentRegister } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_EXPIRING,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_MISSING_REQUIRED,
} from "../../kernel/operations/module-ids";
import { assertValidDocumentDateRange } from "./guards";
import {
	fingerprintDocumentIdentifier,
	last4DocumentIdentifier,
	toEmployeeDocumentListItem,
	toEmployeeDocumentSensitiveDetail,
} from "./privacy";
import {
	requireComplianceEmployeeReadScope,
	requireIdentityDocumentSensitiveRead,
	runComplianceCapabilityCommand,
	runComplianceEmployeeScopedCapabilityQuery,
} from "./run-operation";
import {
	employeeDocumentTransitionInputSchema,
	getEmployeeDocumentInputSchema,
	listEmployeeDocumentsInputSchema,
	listExpiringEmployeeDocumentsInputSchema,
	listMissingRequiredDocumentsInputSchema,
	registerEmployeeDocumentInputSchema,
	rejectEmployeeDocumentInputSchema,
	updateEmployeeDocumentMetadataInputSchema,
	verifyEmployeeDocumentInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_DOCUMENT =
	"employee_document" as const;
export type HumanResourcesEmployeeDocumentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_DOCUMENT;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_EXPIRING_WITHIN_DAYS = 30;

async function validateEmployeeDocumentRegistration(
	documentReference: DocumentReferencePort,
	input: {
		organizationId: string;
		documentRef: string;
		issuedOn: string;
		expiresOn: string | null;
	},
): Promise<Result<ValidatedDocumentReference>> {
	const reference = await documentReference.validateReference({
		organizationId: input.organizationId,
		reference: input.documentRef,
		allowedKinds: [
			"employee_document",
			"passport",
			"identity_document",
			"other",
		],
		requireImmutableVersion: true,
	});
	if (!reference.ok) {
		return reference;
	}
	const dateRange = assertValidDocumentDateRange({
		issuedOn: input.issuedOn,
		expiresOn: input.expiresOn,
	});
	return dateRange.ok ? reference : dateRange;
}

export function registerEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: registerEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document register input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
		storeMethods: [
			"findEmployeeDocumentByIdempotencyKey",
			"registerEmployeeDocument",
		],
		execute: async (data, { store, ports, documentReference }) => {
			const refCheck = await validateEmployeeDocumentRegistration(
				documentReference,
				{
					organizationId: data.organizationId,
					documentRef: data.documentRef,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
				},
			);
			if (!refCheck.ok) {
				return refCheck;
			}

			const requestFingerprint = fingerprintEmployeeDocumentRegister({
				employeeId: data.employeeId,
				requirementId: data.requirementId ?? null,
				documentType: data.documentType,
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
				documentRef: refCheck.data.reference,
			});

			const existingByKey = await store.findEmployeeDocumentByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.document);
			}

			const identifierLast4 =
				data.documentIdentifier === undefined
					? null
					: last4DocumentIdentifier(data.documentIdentifier);
			const identifierFingerprint =
				data.documentIdentifier === undefined
					? null
					: fingerprintDocumentIdentifier(data.documentIdentifier);

			return store.registerEmployeeDocument(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					requirementId: data.requirementId ?? null,
					documentType: data.documentType,
					issuingJurisdiction: data.issuingJurisdiction ?? null,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					documentRef: refCheck.data.reference,
					identifierLast4,
					identifierFingerprint,
					metadata: data.metadata ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
					idempotencyKey: data.idempotencyKey,
				}),
			);
		},
	});
}

export function updateEmployeeDocumentMetadata(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: updateEmployeeDocumentMetadataInputSchema,
		invalidMessage: "Invalid employee document metadata update input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
		storeMethods: ["getEmployeeDocumentById", "updateEmployeeDocumentMetadata"],
		execute: async (data, { store, ports }) => {
			if (data.expiresOn !== undefined && data.expiresOn !== null) {
				const existing = await store.getEmployeeDocumentById({
					organizationId: data.organizationId,
					documentId: data.documentId,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				const dateRange = assertValidDocumentDateRange({
					issuedOn: existing.data.issuedOn,
					expiresOn: data.expiresOn,
				});
				if (!dateRange.ok) {
					return dateRange;
				}
			}

			return store.updateEmployeeDocumentMetadata(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					issuingJurisdiction: data.issuingJurisdiction,
					expiresOn: data.expiresOn,
					metadata: data.metadata,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
				}),
			);
		},
	});
}

export function verifyEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: verifyEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document verify input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
		storeMethods: ["verifyEmployeeDocument"],
		execute: (data, { store, ports }) =>
			store.verifyEmployeeDocument(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					evidenceDate: data.evidenceDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
				}),
			),
	});
}

export function rejectEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: rejectEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document reject input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
		storeMethods: ["rejectEmployeeDocument"],
		execute: (data, { store, ports }) =>
			store.rejectEmployeeDocument(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					rejectionReason: data.rejectionReason,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
				}),
			),
	});
}

export function revokeEmployeeDocumentVerification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: employeeDocumentTransitionInputSchema,
		invalidMessage: "Invalid employee document revoke verification input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
		storeMethods: ["revokeEmployeeDocumentVerification"],
		execute: (data, { store, ports }) =>
			store.revokeEmployeeDocumentVerification(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
				}),
			),
	});
}

export function markEmployeeDocumentExpired(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCapabilityCommand(input, options, {
		schema: employeeDocumentTransitionInputSchema,
		invalidMessage: "Invalid employee document mark expired input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
		storeMethods: ["markEmployeeDocumentExpired"],
		execute: (data, { store, ports }) =>
			store.markEmployeeDocumentExpired(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
				}),
			),
	});
}

export function getEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail>> {
	return runComplianceEmployeeScopedCapabilityQuery(input, options, {
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
		storeMethods: ["getEmployeeDocumentById"],
		schema: getEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document get input",
		execute: async (data, { store, identityResolver }) => {
			const documentResult = await store.getEmployeeDocumentById({
				organizationId: data.organizationId,
				documentId: data.documentId,
			});
			if (!documentResult.ok) {
				return documentResult;
			}
			if (documentResult.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}

			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const scope = await requireComplianceEmployeeReadScope(
				identityResolver,
				options,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					employeeId: documentResult.data.employeeId,
				},
			);
			if (!scope.ok) {
				return scope;
			}

			const sensitive = await requireIdentityDocumentSensitiveRead(options, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			});
			if (sensitive.ok) {
				return errorResult.ok(
					toEmployeeDocumentSensitiveDetail(documentResult.data),
				);
			}

			return errorResult.ok(toEmployeeDocumentListItem(documentResult.data));
		},
	});
}

export function listEmployeeDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListPage>> {
	return runComplianceEmployeeScopedCapabilityQuery(input, options, {
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST,
		storeMethods: ["listEmployeeDocuments"],
		schema: listEmployeeDocumentsInputSchema,
		invalidMessage: "Invalid employee document list input",
		execute: async (data, { store }) =>
			store.listEmployeeDocuments({
				organizationId: data.organizationId,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
				verificationStatus: data.verificationStatus,
			}),
	});
}

export function listMissingRequiredDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirementListPage>> {
	return runComplianceEmployeeScopedCapabilityQuery(input, options, {
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_MISSING_REQUIRED,
		storeMethods: ["listMissingRequiredDocuments"],
		schema: listMissingRequiredDocumentsInputSchema,
		invalidMessage: "Invalid missing required documents list input",
		execute: async (data, { store }) =>
			store.listMissingRequiredDocuments({
				organizationId: data.organizationId,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
			}),
	});
}

export function listExpiringEmployeeDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListPage>> {
	return runComplianceEmployeeScopedCapabilityQuery(input, options, {
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_EXPIRING,
		storeMethods: ["listExpiringEmployeeDocuments"],
		schema: listExpiringEmployeeDocumentsInputSchema,
		invalidMessage: "Invalid expiring employee documents list input",
		execute: async (data, { store }) =>
			store.listExpiringEmployeeDocuments({
				organizationId: data.organizationId,
				asOf: data.asOf,
				withinDays: data.withinDays ?? DEFAULT_EXPIRING_WITHIN_DAYS,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
			}),
	});
}
