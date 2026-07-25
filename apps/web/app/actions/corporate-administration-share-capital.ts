"use server";

import {
	CA_PERMISSION_SHARE_CAPITAL_MANAGE,
	closeShareClass,
	createBeneficialOwnerDisclosure,
	createShareCertificate,
	createShareClass,
	createShareTransaction,
	type CorporateAdministrationCommandOptions,
	reverseShareTransaction,
} from "@afenda/corporate-administration";
import type { Result } from "@afenda/errors/result";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ShareCapitalMutationActionData = {
	entity: { id: string; version?: number };
};
export type ShareCapitalMutationActionState =
	ActionResult<ShareCapitalMutationActionData> | null;

type TrustedCommandContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
};

const requestContextSchema = z.object({
	legalCompanyId: z.uuid(),
	requestId: z.string().trim().min(1).max(200),
});

const existingRecordSchema = requestContextSchema.extend({
	id: z.uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	reason: z.string().trim().min(1).max(1000),
});

function parseLegsJson(raw: unknown): unknown {
	if (typeof raw !== "string") return raw;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return raw;
	}
}

async function runShareCapitalMutation<TInput extends { requestId: string }, TEntity extends { id: string; version?: number }>(config: {
	path: string;
	schema: z.ZodType<TInput>;
	raw: unknown;
	invoke: (
		input: Omit<TInput, "requestId"> & TrustedCommandContext,
		options: CorporateAdministrationCommandOptions,
	) => Promise<Result<TEntity>>;
}): Promise<ShareCapitalMutationActionState> {
	return runOperatorPermissionAction({
		path: config.path,
		permission: CA_PERMISSION_SHARE_CAPITAL_MANAGE,
		safeMessage:
			"Could not update share capital records. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.schema, config.raw);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Review the share capital fields and try again.",
					parsed.details,
				);
			}
			const { requestId, ...businessInput } = parsed.data;
			const result = await config.invoke(
				{
					...businessInput,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `${config.path}:${requestId}`,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return {
				ok: true,
				data: {
					entity: {
						id: mapped.data.id,
						version: mapped.data.version,
					},
				},
			};
		},
	});
}

const createShareClassSchema = requestContextSchema.extend({
	code: z.string().trim().min(1).max(32),
	classType: z.enum(["ordinary", "preference", "other"]),
	currencyCode: z.string().trim().length(3),
	parValue: z.string().trim().min(1).max(32),
	authorizedQuantity: z.string().trim().min(1).max(32),
});

export async function createShareClassAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runShareCapitalMutation({
		path: "createShareClassAction",
		schema: createShareClassSchema,
		raw: Object.fromEntries(formData),
		invoke: createShareClass,
	});
}

const closeShareClassSchema = existingRecordSchema;

export async function closeShareClassAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runShareCapitalMutation({
		path: "closeShareClassAction",
		schema: closeShareClassSchema,
		raw: Object.fromEntries(formData),
		invoke: closeShareClass,
	});
}

const shareTransactionLegSchema = z.object({
	holderPartyId: z.uuid(),
	quantityDelta: z.string().trim().min(1).max(32),
});

const createShareTransactionSchema = requestContextSchema.extend({
	shareClassId: z.uuid(),
	transactionReference: z.string().trim().min(1).max(64),
	transactionType: z.enum(["issuance", "transfer", "cancellation", "correction"]),
	transactionDate: z.iso.date(),
	legs: z.preprocess(parseLegsJson, z.array(shareTransactionLegSchema).min(1)),
});

export async function createShareTransactionAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runOperatorPermissionAction({
		path: "createShareTransactionAction",
		permission: CA_PERMISSION_SHARE_CAPITAL_MANAGE,
		safeMessage:
			"Could not post share transaction. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createShareTransactionSchema, Object.fromEntries(formData));
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Review the transaction fields and try again.",
					parsed.details,
				);
			}
			const { requestId, ...businessInput } = parsed.data;
			const result = await createShareTransaction(
				{
					...businessInput,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `createShareTransactionAction:${requestId}`,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return {
				ok: true,
				data: { entity: { id: mapped.data.id } },
			};
		},
	});
}

const reverseShareTransactionSchema = requestContextSchema.extend({
	shareTransactionId: z.uuid(),
	reversalReference: z.string().trim().min(1).max(64),
	reversalDate: z.iso.date(),
});

export async function reverseShareTransactionAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runOperatorPermissionAction({
		path: "reverseShareTransactionAction",
		permission: CA_PERMISSION_SHARE_CAPITAL_MANAGE,
		safeMessage:
			"Could not reverse share transaction. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reverseShareTransactionSchema, Object.fromEntries(formData));
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Review the reversal fields and try again.",
					parsed.details,
				);
			}
			const { requestId, ...businessInput } = parsed.data;
			const result = await reverseShareTransaction(
				{
					...businessInput,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `reverseShareTransactionAction:${requestId}`,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return {
				ok: true,
				data: { entity: { id: mapped.data.id } },
			};
		},
	});
}

const createShareCertificateSchema = requestContextSchema.extend({
	shareClassId: z.uuid(),
	shareTransactionId: z.uuid().optional(),
	certificateNumber: z.string().trim().min(1).max(64),
	holderPartyId: z.uuid(),
	issuedDate: z.iso.date(),
});

export async function createShareCertificateAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runShareCapitalMutation({
		path: "createShareCertificateAction",
		schema: createShareCertificateSchema,
		raw: Object.fromEntries(formData),
		invoke: createShareCertificate,
	});
}

const createBeneficialOwnerDisclosureSchema = requestContextSchema.extend({
	partyId: z.uuid(),
	natureOfControlCodes: z.string().trim().min(1).max(500),
	effectiveFrom: z.iso.date(),
	evidenceReference: z.string().trim().min(1).max(500).optional(),
});

export async function createBeneficialOwnerDisclosureAction(
	_prev: ShareCapitalMutationActionState,
	formData: FormData,
): Promise<ShareCapitalMutationActionState> {
	return runShareCapitalMutation({
		path: "createBeneficialOwnerDisclosureAction",
		schema: createBeneficialOwnerDisclosureSchema,
		raw: Object.fromEntries(formData),
		invoke: createBeneficialOwnerDisclosure,
	});
}
