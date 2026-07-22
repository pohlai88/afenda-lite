import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
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
} from "../module-ids";
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
} from "../schemas-compliance";
import {
	requireComplianceEmployeeReadScope,
	requireIdentityDocumentSensitiveRead,
	runComplianceCommand,
	runComplianceEmployeeScopedQuery,
	runComplianceQuery,
} from "../shared/compliance-command";
import { assertValidDocumentDateRange } from "../shared/compliance-guards";
import {
	fingerprintDocumentIdentifier,
	last4DocumentIdentifier,
	toEmployeeDocumentListItem,
	toEmployeeDocumentSensitiveDetail,
} from "../shared/compliance-privacy";
import { fingerprintEmployeeDocumentRegister } from "../shared/fingerprint";
import type {
	DocumentRequirementListPage,
	EmployeeDocument,
	EmployeeDocumentListItem,
	EmployeeDocumentListPage,
	EmployeeDocumentSensitiveDetail,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_DOCUMENT =
	"employee_document" as const;
export type HumanResourcesEmployeeDocumentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_DOCUMENT;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_EXPIRING_WITHIN_DAYS = 30;

export async function registerEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: registerEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document register input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
		execute: async (data, { store, ports, documentReference }) => {
			const refCheck = await documentReference.assertAcceptableRef(
				data.documentRef,
			);
			if (!refCheck.ok) {
				return refCheck;
			}

			const dateRange = assertValidDocumentDateRange({
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			const requestFingerprint = fingerprintEmployeeDocumentRegister({
				employeeId: data.employeeId,
				requirementId: data.requirementId ?? null,
				documentType: data.documentType,
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
				documentRef: data.documentRef,
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.document);
			}

			const identifierLast4 =
				data.documentIdentifier !== undefined
					? last4DocumentIdentifier(data.documentIdentifier)
					: null;
			const identifierFingerprint =
				data.documentIdentifier !== undefined
					? fingerprintDocumentIdentifier(data.documentIdentifier)
					: null;

			return store.registerEmployeeDocument(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					requirementId: data.requirementId ?? null,
					documentType: data.documentType,
					issuingJurisdiction: data.issuingJurisdiction ?? null,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					documentRef: data.documentRef,
					identifierLast4,
					identifierFingerprint,
					metadata: data.metadata ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER },
			);
		},
	});
}

export async function updateEmployeeDocumentMetadata(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: updateEmployeeDocumentMetadataInputSchema,
		invalidMessage: "Invalid employee document metadata update input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
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
					return fail("NOT_FOUND", "Employee document not found");
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
				{
					correlationId:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
				},
			);
		},
	});
}

export async function verifyEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: verifyEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document verify input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
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
				{ correlationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY },
			),
	});
}

export async function rejectEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: rejectEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document reject input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
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
				{ correlationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT },
			),
	});
}

export async function revokeEmployeeDocumentVerification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: employeeDocumentTransitionInputSchema,
		invalidMessage: "Invalid employee document revoke verification input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
		execute: (data, { store, ports }) =>
			store.revokeEmployeeDocumentVerification(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{
					correlationId:
						HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
				},
			),
	});
}

export async function markEmployeeDocumentExpired(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocument>> {
	return runComplianceCommand(input, options, {
		schema: employeeDocumentTransitionInputSchema,
		invalidMessage: "Invalid employee document mark expired input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
		execute: (data, { store, ports }) =>
			store.markEmployeeDocumentExpired(
				{
					organizationId: data.organizationId,
					documentId: data.documentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{
					correlationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
				},
			),
	});
}

export async function getEmployeeDocument(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: getEmployeeDocumentInputSchema,
		invalidMessage: "Invalid employee document get input",
		execute: async (data, { store, authorization }) => {
			const documentResult = await store.getEmployeeDocumentById({
				organizationId: data.organizationId,
				documentId: data.documentId,
			});
			if (!documentResult.ok) {
				return documentResult;
			}
			if (documentResult.data === null) {
				return fail("NOT_FOUND", "Employee document not found");
			}

			const scope = await requireComplianceEmployeeReadScope(authorization, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				employeeId: documentResult.data.employeeId,
			});
			if (!scope.ok) {
				return scope;
			}

			const sensitive = await requireIdentityDocumentSensitiveRead(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
				},
			);
			if (sensitive.ok) {
				return ok(toEmployeeDocumentSensitiveDetail(documentResult.data));
			}

			return ok(toEmployeeDocumentListItem(documentResult.data));
		},
	});
}

export async function listEmployeeDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListPage>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: listEmployeeDocumentsInputSchema,
		invalidMessage: "Invalid employee document list input",
		execute: async (data, { store }) => {
			return store.listEmployeeDocuments({
				organizationId: data.organizationId,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
				verificationStatus: data.verificationStatus,
			});
		},
	});
}

export async function listMissingRequiredDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DocumentRequirementListPage>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: listMissingRequiredDocumentsInputSchema,
		invalidMessage: "Invalid missing required documents list input",
		execute: async (data, { store }) => {
			return store.listMissingRequiredDocuments({
				organizationId: data.organizationId,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
			});
		},
	});
}

export async function listExpiringEmployeeDocuments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeDocumentListPage>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: listExpiringEmployeeDocumentsInputSchema,
		invalidMessage: "Invalid expiring employee documents list input",
		execute: async (data, { store }) => {
			return store.listExpiringEmployeeDocuments({
				organizationId: data.organizationId,
				asOf: data.asOf,
				withinDays: data.withinDays ?? DEFAULT_EXPIRING_WITHIN_DAYS,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
				employeeId: data.employeeId,
			});
		},
	});
}
