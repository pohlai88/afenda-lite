import type { Result } from "@afenda/errors";
import type { z } from "zod";

import type { Establishment } from "../../../kernel/contracts/domain";
import {
	type CorporateAdministrationApprovalPort,
	requireCorporateAdministrationApproval,
} from "../../../kernel/execution/approval";
import {
	type CorporateAdministrationAuthorizationPort,
	requireCorporateAdministrationPermission,
} from "../../../kernel/execution/authorization";
import {
	fingerprintMutation,
	type MutationReceiptStore,
	withIdempotentExecution,
} from "../../../kernel/execution/idempotency";
import type { CorporateAdministrationPage } from "../../../kernel/pagination";
import { failInvalidCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import { normalizeEstablishmentRegistrationIdentifier } from "./establishments.rules";
import {
	ActivateEstablishmentInput,
	CloseEstablishmentInput,
	GetEstablishmentInput,
	ListEstablishmentInput,
	RegisterEstablishmentInput,
	SuspendEstablishmentInput,
	UpdateEstablishmentInput,
} from "./establishments.schema";
import type { EstablishmentsStore } from "./establishments.store";

export interface EstablishmentsOperationDeps {
	/** Required by `activate` (PRD TR-03). Absent means fail-closed, not skip. */
	approval?: CorporateAdministrationApprovalPort;
	authorization: CorporateAdministrationAuthorizationPort;
	/** BR-07: idempotent replay / fingerprint-mismatch conflict for every command. */
	mutationReceipts: MutationReceiptStore;
	store: EstablishmentsStore;
}

function fingerprintOf(data: Record<string, unknown>): string {
	const {
		idempotencyKey: _idempotencyKey,
		correlationId: _correlationId,
		...rest
	} = data;
	return fingerprintMutation(rest);
}

export async function registerEstablishmentOperation(
	input: z.infer<typeof RegisterEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	const parsed = RegisterEstablishmentInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.manage",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	return withIdempotentExecution(
		deps.mutationReceipts,
		{
			organizationId: parsed.data.organizationId,
			commandId: "corporate_administration.establishment.register",
			idempotencyKey: parsed.data.idempotencyKey,
			fingerprint: fingerprintOf(parsed.data),
		},
		() =>
			deps.store.registerEstablishment({
				organizationId: parsed.data.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				establishmentType: parsed.data.establishmentType,
				jurisdictionCode: parsed.data.jurisdictionCode,
				registrationIdentifier: parsed.data.registrationIdentifier,
				normalizedRegistrationIdentifier:
					normalizeEstablishmentRegistrationIdentifier(
						parsed.data.registrationIdentifier,
					),
				displayName: parsed.data.displayName,
				registeredFrom: parsed.data.registeredFrom,
				actorUserId: parsed.data.actorUserId,
				correlationId: parsed.data.correlationId,
				sourceDocumentId: parsed.data.sourceDocumentId,
			}),
	);
}

export async function updateEstablishmentOperation(
	input: z.infer<typeof UpdateEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	const parsed = UpdateEstablishmentInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.manage",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	return withIdempotentExecution(
		deps.mutationReceipts,
		{
			organizationId: parsed.data.organizationId,
			commandId: "corporate_administration.establishment.update",
			idempotencyKey: parsed.data.idempotencyKey,
			fingerprint: fingerprintOf(parsed.data),
		},
		() =>
			deps.store.updateEstablishment({
				organizationId: parsed.data.organizationId,
				id: parsed.data.id,
				displayName: parsed.data.displayName,
				expectedVersion: parsed.data.expectedVersion,
				actorUserId: parsed.data.actorUserId,
				correlationId: parsed.data.correlationId,
			}),
	);
}

/**
 * PRD TR-03 marks `activate` as approval-required. CA-CL-01 (platform approval
 * integration) is BLOCKED externally on PLATFORM-APPROVALS-01, so this fails
 * closed with no mutation when `deps.approval` is not supplied — it never
 * quietly degrades to permission-only execution.
 */
export async function activateEstablishmentOperation(
	input: z.infer<typeof ActivateEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	const parsed = ActivateEstablishmentInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.manage",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	const approvalResult = await requireCorporateAdministrationApproval(
		deps.approval,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			operation: "corporate_administration.establishment.activate",
			subjectId: parsed.data.id,
		},
	);
	if (!approvalResult.ok) {
		return approvalResult;
	}
	return withIdempotentExecution(
		deps.mutationReceipts,
		{
			organizationId: parsed.data.organizationId,
			commandId: "corporate_administration.establishment.activate",
			idempotencyKey: parsed.data.idempotencyKey,
			fingerprint: fingerprintOf(parsed.data),
		},
		() =>
			deps.store.transitionEstablishment({
				organizationId: parsed.data.organizationId,
				id: parsed.data.id,
				status: "active",
				effectiveFrom: parsed.data.effectiveFrom,
				reason: parsed.data.reason,
				expectedVersion: parsed.data.expectedVersion,
				actorUserId: parsed.data.actorUserId,
				correlationId: parsed.data.correlationId,
				sourceDocumentId: parsed.data.sourceDocumentId,
			}),
	);
}

export function suspendEstablishmentOperation(
	input: z.infer<typeof SuspendEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	return transitionEstablishment(
		SuspendEstablishmentInput,
		"suspended",
		"corporate_administration.establishment.suspend",
		input,
		deps,
	);
}

export function closeEstablishmentOperation(
	input: z.infer<typeof CloseEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	return transitionEstablishment(
		CloseEstablishmentInput,
		"closed",
		"corporate_administration.establishment.close",
		input,
		deps,
	);
}

async function transitionEstablishment(
	schema: typeof ActivateEstablishmentInput,
	status: "active" | "suspended" | "closed",
	commandId: string,
	input: z.infer<typeof ActivateEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.manage",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	return withIdempotentExecution(
		deps.mutationReceipts,
		{
			organizationId: parsed.data.organizationId,
			commandId,
			idempotencyKey: parsed.data.idempotencyKey,
			fingerprint: fingerprintOf(parsed.data),
		},
		() =>
			deps.store.transitionEstablishment({
				organizationId: parsed.data.organizationId,
				id: parsed.data.id,
				status,
				effectiveFrom: parsed.data.effectiveFrom,
				reason: parsed.data.reason,
				expectedVersion: parsed.data.expectedVersion,
				actorUserId: parsed.data.actorUserId,
				correlationId: parsed.data.correlationId,
				sourceDocumentId: parsed.data.sourceDocumentId,
			}),
	);
}

export async function getEstablishmentOperation(
	input: z.infer<typeof GetEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<Establishment | null>> {
	const parsed = GetEstablishmentInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.read",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.getEstablishment({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}

export async function listEstablishmentsOperation(
	input: z.infer<typeof ListEstablishmentInput>,
	deps: EstablishmentsOperationDeps,
): Promise<Result<CorporateAdministrationPage<Establishment>>> {
	const parsed = ListEstablishmentInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidCorporateAdministrationInput(parsed.error);
	}
	const authResult = await requireCorporateAdministrationPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: "corporate_administration.establishment.read",
		},
	);
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.listEstablishments({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		status: parsed.data.status,
		cursor: parsed.data.cursor,
		limit: parsed.data.limit,
	});
}
