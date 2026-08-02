"use server";

import { randomUUID } from "node:crypto";

import {
	adoptResolution,
	adoptResolutionInputSchema,
	assignResolutionAction,
	assignResolutionActionInputSchema,
	type CorporateAdministrationCommandId,
	type CorporateAdministrationCommandOptions,
	completeResolutionAction,
	completeResolutionActionInputSchema,
	corporateAdministrationPermissionFor,
	recordMeetingVote,
	recordMeetingVoteInputSchema,
	recordMinutesDocument,
	recordMinutesDocumentInputSchema,
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
	createCorporateAdministrationGovernanceDependencies,
} from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const actionMetadataSchema = z
	.object({
		organizationSlug: z
			.string()
			.trim()
			.min(1)
			.max(128)
			.regex(/^[a-z0-9][a-z0-9-]*$/),
		idempotencyKey: z.string().trim().min(1).max(128).optional(),
	})
	.strict();

type GovernanceDependencies = ReturnType<
	typeof createCorporateAdministrationGovernanceDependencies
>;

type GovernanceCommand<TPayload, TResult> = (
	payload: TPayload,
	options: CorporateAdministrationCommandOptions,
	dependencies: GovernanceDependencies,
) => Promise<Result<TResult>>;

export type MeetingVoteActionResult = Readonly<{
	meetingVoteId: string;
	outcome: string;
	version: number;
}>;

export type ResolutionActionResult = Readonly<{
	resolutionId: string;
	status: string;
	version: number;
}>;

export type ResolutionImplementationActionResult = Readonly<{
	resolutionActionId: string;
	status: string;
	version: number;
}>;

export async function recordMeetingVoteAction(
	formData: FormData,
): Promise<ActionResult<MeetingVoteActionResult>> {
	return await runGovernanceAction({
		operationId: "recordMeetingVote",
		path: "recordMeetingVoteAction",
		safeMessage: "Could not record the meeting vote.",
		formData,
		schema: recordMeetingVoteInputSchema,
		normalize: (values) =>
			coerceNumbers(values, [
				"eligibleVotes",
				"votesFor",
				"votesAgainst",
				"abstentions",
				"requiredFor",
				"expectedMeetingVersion",
			]),
		execute: recordMeetingVote,
		project: (vote) => ({
			meetingVoteId: vote.id,
			outcome: vote.outcome,
			version: vote.version,
		}),
	});
}

export async function adoptResolutionAction(
	formData: FormData,
): Promise<ActionResult<ResolutionActionResult>> {
	return await runGovernanceAction({
		operationId: "adoptResolution",
		path: "adoptResolutionAction",
		safeMessage: "Could not adopt the resolution.",
		formData,
		schema: adoptResolutionInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVoteVersion"]),
		execute: adoptResolution,
		project: (resolution) => ({
			resolutionId: resolution.id,
			status: resolution.status,
			version: resolution.version,
		}),
	});
}

export async function assignResolutionActionAction(
	formData: FormData,
): Promise<ActionResult<ResolutionImplementationActionResult>> {
	return await runGovernanceAction({
		operationId: "assignResolutionAction",
		path: "assignResolutionActionAction",
		safeMessage: "Could not assign the resolution action.",
		formData,
		schema: assignResolutionActionInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedResolutionVersion"]),
		execute: assignResolutionAction,
		project: (action) => ({
			resolutionActionId: action.id,
			status: action.status,
			version: action.version,
		}),
	});
}

export async function completeResolutionActionAction(
	formData: FormData,
): Promise<ActionResult<ResolutionImplementationActionResult>> {
	return await runGovernanceAction({
		operationId: "completeResolutionAction",
		path: "completeResolutionActionAction",
		safeMessage: "Could not complete the resolution action.",
		formData,
		schema: completeResolutionActionInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		execute: completeResolutionAction,
		project: (action) => ({
			resolutionActionId: action.id,
			status: action.status,
			version: action.version,
		}),
	});
}

export async function recordMinutesDocumentAction(
	formData: FormData,
): Promise<ActionResult<ResolutionActionResult>> {
	return await runGovernanceAction({
		operationId: "recordMinutesDocument",
		path: "recordMinutesDocumentAction",
		safeMessage: "Could not record the minutes document.",
		formData,
		schema: recordMinutesDocumentInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		execute: recordMinutesDocument,
		project: (resolution) => ({
			resolutionId: resolution.id,
			status: resolution.status,
			version: resolution.version,
		}),
	});
}

export async function recordMeetingVoteFormAction(
	_previousState: ActionResult<MeetingVoteActionResult> | null,
	formData: FormData,
) {
	return await recordMeetingVoteAction(formData);
}

export async function adoptResolutionFormAction(
	_previousState: ActionResult<ResolutionActionResult> | null,
	formData: FormData,
) {
	return await adoptResolutionAction(formData);
}

export async function assignResolutionActionFormAction(
	_previousState: ActionResult<ResolutionImplementationActionResult> | null,
	formData: FormData,
) {
	return await assignResolutionActionAction(formData);
}

export async function completeResolutionActionFormAction(
	_previousState: ActionResult<ResolutionImplementationActionResult> | null,
	formData: FormData,
) {
	return await completeResolutionActionAction(formData);
}

export async function recordMinutesDocumentFormAction(
	_previousState: ActionResult<ResolutionActionResult> | null,
	formData: FormData,
) {
	return await recordMinutesDocumentAction(formData);
}

async function runGovernanceAction<TPayload, TResult, TProjection>(input: {
	operationId: Extract<
		CorporateAdministrationCommandId,
		| "recordMeetingVote"
		| "adoptResolution"
		| "assignResolutionAction"
		| "completeResolutionAction"
		| "recordMinutesDocument"
	>;
	path: string;
	safeMessage: string;
	formData: FormData;
	schema: z.ZodType<TPayload>;
	normalize: (
		values: Record<string, FormDataEntryValue>,
	) => Record<string, unknown>;
	execute: GovernanceCommand<TPayload, TResult>;
	project: (result: TResult) => TProjection;
}): Promise<ActionResult<TProjection>> {
	return await runMemberPermissionAction({
		path: input.path,
		permission: corporateAdministrationPermissionFor(input.operationId),
		safeMessage: input.safeMessage,
		execute: async (session, correlationId) => {
			const values = formDataObject(input.formData);
			const metadata = parseSchema(actionMetadataSchema, {
				organizationSlug: values.organizationSlug,
				idempotencyKey: optionalString(values.idempotencyKey),
			});
			const payload = parseSchema(
				input.schema,
				input.normalize(withoutActionMetadata(values)),
			);
			if (!(metadata.success && payload.success)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted governance data is invalid",
				});
			}

			const result = await input.execute(
				payload.data,
				createCorporateAdministrationCommandOptions({
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: metadata.data.idempotencyKey ?? randomUUID(),
				}),
				createCorporateAdministrationGovernanceDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateGovernanceRoutes(metadata.data.organizationSlug);
			return errorResult.ok(input.project(mapped.data));
		},
	});
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

function withoutActionMetadata(
	values: Record<string, FormDataEntryValue>,
): Record<string, FormDataEntryValue> {
	const {
		organizationSlug: _organizationSlug,
		idempotencyKey: _key,
		...payload
	} = values;
	return payload;
}

function optionalString(value: FormDataEntryValue | undefined) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function coerceNumbers(
	values: Record<string, FormDataEntryValue>,
	keys: readonly string[],
): Record<string, unknown> {
	const normalized: Record<string, unknown> = { ...values };
	for (const key of keys) {
		const value = normalized[key];
		if (value === "" || value === undefined) {
			delete normalized[key];
			continue;
		}
		normalized[key] = Number(value);
	}
	return normalized;
}

function revalidateGovernanceRoutes(organizationSlug: string): void {
	revalidatePath("/client/corporate-administration");
	revalidatePath("/admin/corporate-administration");
	revalidatePath(`/o/${organizationSlug}/corporate/companies`);
}
