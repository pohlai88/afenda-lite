import { randomUUID } from "node:crypto";

import {
	type CorporateAdministrationCommandId,
	type CorporateAdministrationCommandOptions,
	corporateAdministrationPermissionFor,
} from "@afenda/corporate-administration";
import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

/**
 * The FormData Server Action envelope for Corporate Administration.
 *
 * This is a second action *kind*, not a variant of `defineAction`. CA actions
 * differ from the HR shape in ways that are requirements rather than drift:
 * they ingest `FormData` rather than a parsed object, carry action metadata
 * (organization slug, idempotency key) alongside the payload, derive their
 * permission from a canonical `operationId` instead of accepting one, inject
 * per-capability dependencies, and revalidate routes keyed on the slug.
 *
 * Folding those into `defineAction` would push FormData parsing, idempotency,
 * and slug revalidation into every HR action that has no use for them. Two
 * envelopes with one owner each is the correct shape; five hand-written CA
 * wrappers was not.
 */

/** Metadata every CA form carries alongside its payload. */
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

/** FormData entries, minus the framework's own action bookkeeping. */
export function formDataObject(
	formData: FormData,
): Record<string, FormDataEntryValue> {
	return Object.fromEntries(
		Array.from(formData.entries()).filter(
			([key]) => !key.startsWith("$ACTION_"),
		),
	);
}

/** Payload fields only — metadata is consumed by the envelope, not the command. */
export function withoutActionMetadata(
	values: Record<string, FormDataEntryValue>,
): Record<string, FormDataEntryValue> {
	const {
		organizationSlug: _organizationSlug,
		idempotencyKey: _key,
		...payload
	} = values;
	return payload;
}

export function optionalString(value: FormDataEntryValue | undefined) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export interface FormDataActionDefinition<
	TPayload,
	TResult,
	TProjection,
	TDependencies,
> {
	readonly dependencies: TDependencies;
	readonly execute: (
		payload: TPayload,
		options: CorporateAdministrationCommandOptions,
		dependencies: TDependencies,
	) => Promise<Result<TResult>>;
	readonly formData: FormData;
	readonly normalize: (
		values: Record<string, FormDataEntryValue>,
	) => Record<string, unknown>;
	/**
	 * Validation failure, constructed at the call site so the authored
	 * `publicMessage` literal survives the errors package's literal guard.
	 */
	readonly onInvalid: () => ActionResult<TProjection>;
	/** Canonical command id. The permission is derived from it, never passed. */
	readonly operationId: CorporateAdministrationCommandId;
	readonly path: string;
	readonly project: (result: TResult) => TProjection;
	readonly revalidate: (organizationSlug: string, result: TResult) => void;
	readonly safeMessage: string;
	readonly schema: z.ZodType<TPayload>;
}

export async function defineFormDataAction<
	TPayload,
	TResult,
	TProjection,
	TDependencies,
>(
	definition: FormDataActionDefinition<
		TPayload,
		TResult,
		TProjection,
		TDependencies
	>,
): Promise<ActionResult<TProjection>> {
	return await runMemberPermissionAction({
		path: definition.path,
		permission: corporateAdministrationPermissionFor(definition.operationId),
		safeMessage: definition.safeMessage,
		execute: async (session, correlationId) => {
			const values = formDataObject(definition.formData);
			const metadata = parseSchema(actionMetadataSchema, {
				organizationSlug: values.organizationSlug,
				idempotencyKey: optionalString(values.idempotencyKey),
			});
			const payload = parseSchema(
				definition.schema,
				definition.normalize(withoutActionMetadata(values)),
			);
			if (!(metadata.success && payload.success)) {
				return definition.onInvalid();
			}

			const result = await definition.execute(
				payload.data,
				createCorporateAdministrationCommandOptions({
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: metadata.data.idempotencyKey ?? randomUUID(),
				}),
				definition.dependencies,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			definition.revalidate(metadata.data.organizationSlug, mapped.data);
			return errorResult.ok(definition.project(mapped.data));
		},
	});
}
