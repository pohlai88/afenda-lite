"use server";

import { randomUUID } from "node:crypto";

import {
	activateLegalCompany,
	archiveLegalCompany,
	dissolveLegalCompany,
	enterLiquidation,
	markCompanyStruckOff,
	restoreLegalCompany,
	suspendLegalCompany,
} from "@afenda/corporate-administration";
import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import {
	createCorporateAdministrationCommandOptions,
	createCorporateAdministrationCompanyDependencies,
} from "@/lib/erp/corporate-administration-command-options";

import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().trim().uuid();
const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceDocumentIdSchema = z.string().trim().min(1).max(256);
const reasonSchema = z.string().trim().min(1).max(512);
const idempotencyKeySchema = z.string().trim().min(1).max(128).optional();
const approvalRequestIdSchema = z.string().uuid().brand("ApprovalRequestId");
const approvalDecisionIdSchema = z.string().uuid().brand("ApprovalDecisionId");

type ApprovalRequestId = z.infer<typeof approvalRequestIdSchema>;
type ApprovalDecisionId = z.infer<typeof approvalDecisionIdSchema>;

const lifecycleMetadataSchema = {
	organizationSlug: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.regex(/^[a-z0-9][a-z0-9-]*$/),
	idempotencyKey: idempotencyKeySchema,
	approvalRequestId: approvalRequestIdSchema.optional(),
	approvalDecisionId: approvalDecisionIdSchema.optional(),
} as const;

const baseLifecycleActionSchema = z
	.object({
		...lifecycleMetadataSchema,
		legalCompanyId: uuidSchema,
		effectiveFrom: dateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const reasonedLifecycleActionSchema = baseLifecycleActionSchema
	.extend({
		reason: reasonSchema,
	})
	.strict();

type LifecyclePayload = z.output<typeof baseLifecycleActionSchema>;
type LifecycleResult = Readonly<{
	companyStatusHistoryId: string;
	legalCompanyId: string;
	status: string;
	version: number;
}>;

type LifecycleCommand<TPayload extends LifecyclePayload> = (
	payload: Omit<TPayload, keyof typeof lifecycleMetadataSchema>,
	options: ReturnType<typeof createCorporateAdministrationCommandOptions> &
		Partial<{
			approvalRequestId: ApprovalRequestId;
			approvalDecisionId: ApprovalDecisionId;
		}>,
	dependencies: ReturnType<
		typeof createCorporateAdministrationCompanyDependencies
	>,
) => Promise<
	Result<{
		id: string;
		legalCompanyId: string;
		status: string;
		version: number;
	}>
>;

export async function activateLegalCompanyAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "activateLegalCompanyAction",
		safeMessage: "Could not activate the legal company.",
		schema: baseLifecycleActionSchema,
		formData,
		execute: activateLegalCompany,
	});
}

export async function suspendLegalCompanyAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "suspendLegalCompanyAction",
		safeMessage: "Could not suspend the legal company.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: suspendLegalCompany,
	});
}

export async function markCompanyStruckOffAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "markCompanyStruckOffAction",
		safeMessage: "Could not mark the legal company struck off.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: markCompanyStruckOff,
	});
}

export async function enterLiquidationAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "enterLiquidationAction",
		safeMessage: "Could not enter liquidation.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: enterLiquidation,
	});
}

export async function dissolveLegalCompanyAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "dissolveLegalCompanyAction",
		safeMessage: "Could not dissolve the legal company.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: dissolveLegalCompany,
	});
}

export async function restoreLegalCompanyAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "restoreLegalCompanyAction",
		safeMessage: "Could not restore the legal company.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: restoreLegalCompany,
	});
}

export async function archiveLegalCompanyAction(
	formData: FormData,
): Promise<ActionResult<LifecycleResult>> {
	return await runLifecycleAction({
		path: "archiveLegalCompanyAction",
		safeMessage: "Could not archive the legal company.",
		schema: reasonedLifecycleActionSchema,
		formData,
		execute: archiveLegalCompany,
	});
}

export async function activateLegalCompanyFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await activateLegalCompanyAction(formData);
}

export async function suspendLegalCompanyFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await suspendLegalCompanyAction(formData);
}

export async function markCompanyStruckOffFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await markCompanyStruckOffAction(formData);
}

export async function enterLiquidationFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await enterLiquidationAction(formData);
}

export async function dissolveLegalCompanyFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await dissolveLegalCompanyAction(formData);
}

export async function restoreLegalCompanyFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await restoreLegalCompanyAction(formData);
}

export async function archiveLegalCompanyFormAction(
	_previousState: ActionResult<LifecycleResult> | null,
	formData: FormData,
): Promise<ActionResult<LifecycleResult> | null> {
	return await archiveLegalCompanyAction(formData);
}

async function runLifecycleAction<TPayload extends LifecyclePayload>(input: {
	path: string;
	safeMessage: string;
	schema: z.ZodType<TPayload>;
	formData: FormData;
	execute: LifecycleCommand<TPayload>;
}): Promise<ActionResult<LifecycleResult>> {
	return await runMemberPermissionAction({
		path: input.path,
		permission: "corporate_administration.company.manage",
		safeMessage: input.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(input.schema, formDataObject(input.formData));
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await input.execute(
				toLifecyclePayload(parsed.data),
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLifecycleRoutes(
				parsed.data.organizationSlug,
				mapped.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyStatusHistoryId: mapped.data.id,
					legalCompanyId: mapped.data.legalCompanyId,
					status: mapped.data.status,
					version: mapped.data.version,
				},
			};
		},
	});
}

function toLifecyclePayload<TPayload extends LifecyclePayload>(
	input: TPayload,
): Omit<TPayload, keyof typeof lifecycleMetadataSchema> {
	const {
		organizationSlug: _organizationSlug,
		idempotencyKey: _idempotencyKey,
		approvalRequestId: _approvalRequestId,
		approvalDecisionId: _approvalDecisionId,
		...payload
	} = input;
	return payload;
}

function createCommandOptions(
	input: {
		idempotencyKey?: string | undefined;
		approvalRequestId?: ApprovalRequestId | undefined;
		approvalDecisionId?: ApprovalDecisionId | undefined;
	},
	session: { orgId: string; userId: string },
	correlationId: string,
) {
	return {
		...createCorporateAdministrationCommandOptions({
			organizationId: session.orgId,
			actorUserId: session.userId,
			correlationId,
			idempotencyKey: input.idempotencyKey ?? randomUUID(),
		}),
		...(input.approvalRequestId === undefined
			? {}
			: { approvalRequestId: input.approvalRequestId }),
		...(input.approvalDecisionId === undefined
			? {}
			: { approvalDecisionId: input.approvalDecisionId }),
	};
}

function formDataObject(
	formData: FormData,
): Record<string, FormDataEntryValue> {
	return Object.fromEntries(
		Array.from(formData.entries()).filter(
			([key]) => !key.startsWith("$ACTION_"),
		),
	);
}

function revalidateLifecycleRoutes(
	organizationSlug: string,
	legalCompanyId: string,
): void {
	revalidatePath("/client/corporate-administration");
	revalidatePath("/admin/corporate-administration");
	revalidatePath(
		`/o/${organizationSlug}/corporate/companies/${legalCompanyId}/overview`,
	);
}
