"use server";

import {
	amendCharge,
	CA_PERMISSION_PROPERTY_ASSETS_MANAGE,
	type CorporateAdministrationCommandOptions,
	cancelInsurancePolicy,
	disposeCorporateAsset,
	disposeIntellectualProperty,
	disposeProperty,
	expireIntellectualProperty,
	registerCharge,
	registerCorporateAsset,
	registerInsurancePolicy,
	registerIntellectualProperty,
	registerProperty,
	releaseCharge,
	renewInsurancePolicy,
	renewIntellectualProperty,
	updateCorporateAsset,
	updateInsurancePolicy,
	updateIntellectualProperty,
	updateProperty,
	writeOffCorporateAsset,
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

export type PropertyAssetsMutationActionData = {
	entity: { id: string; version: number };
};
export type PropertyAssetsMutationActionState =
	ActionResult<PropertyAssetsMutationActionData> | null;

type TrustedCommandContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
};

const optionalText = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.string().trim().min(1).optional(),
);
const nullableText = z.preprocess(
	(value) => (value === "" || value === null ? null : value),
	z.string().trim().min(1).nullable().optional(),
);
const optionalUuid = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.uuid().optional(),
);
const nullableUuid = z.preprocess(
	(value) => (value === "" || value === null ? null : value),
	z.uuid().nullable().optional(),
);
const optionalDecimal = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z
		.string()
		.trim()
		.regex(/^\d+(?:\.\d+)?$/)
		.optional(),
);
const nullableDecimal = z.preprocess(
	(value) => (value === "" || value === null ? null : value),
	z
		.string()
		.trim()
		.regex(/^\d+(?:\.\d+)?$/)
		.nullable()
		.optional(),
);
const requestSchema = z.object({
	legalCompanyId: z.uuid(),
	requestId: z.string().trim().min(1).max(200),
});
const existingSchema = requestSchema.extend({
	id: z.uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});
const terminalSchema = existingSchema.extend({
	effectiveDate: z.iso.date(),
	reason: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(500),
});
const subjectSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("company") }),
	z.object({ kind: z.literal("property"), propertyHoldingId: z.uuid() }),
	z.object({ kind: z.literal("corporate-asset"), corporateAssetId: z.uuid() }),
	z.object({
		kind: z.literal("intellectual-property"),
		intellectualPropertyRightId: z.uuid(),
	}),
	z.object({
		kind: z.literal("other"),
		description: z.string().trim().min(1).max(500),
	}),
]);

function subjectFromFormData(formData: FormData): unknown {
	const kind = formData.get("subjectKind");
	const id = formData.get("subjectId");
	if (kind === "property") return { kind, propertyHoldingId: id };
	if (kind === "corporate-asset") return { kind, corporateAssetId: id };
	if (kind === "intellectual-property") {
		return { kind, intellectualPropertyRightId: id };
	}
	if (kind === "other") {
		return { kind, description: formData.get("subjectDescription") };
	}
	return { kind: "company" };
}

async function runPropertyAssetsMutation<
	TInput extends { requestId: string },
	TEntity extends { id: string; version: number },
>(config: {
	path: string;
	schema: z.ZodType<TInput>;
	raw: unknown;
	invoke: (
		input: Omit<TInput, "requestId"> & TrustedCommandContext,
		options: CorporateAdministrationCommandOptions,
	) => Promise<Result<TEntity>>;
}): Promise<PropertyAssetsMutationActionState> {
	return runOperatorPermissionAction({
		path: config.path,
		permission: CA_PERMISSION_PROPERTY_ASSETS_MANAGE,
		safeMessage:
			"Could not update property and asset records. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.schema, config.raw);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Review the property and asset fields and try again.",
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
				data: { entity: { id: mapped.data.id, version: mapped.data.version } },
			};
		},
	});
}

const registerPropertySchema = requestSchema.extend({
	code: z.string().trim().min(1).max(64),
	propertyType: z.string().trim().min(1).max(64),
	titleReference: z.string().trim().min(1).max(200),
	propertyDescription: z.string().trim().min(1).max(500),
	ownershipPercentage: z
		.string()
		.trim()
		.regex(/^\d+(?:\.\d+)?$/),
	acquisitionDate: z.iso.date(),
	tenureType: optionalText,
	valuationReference: optionalText,
});
export async function registerPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "registerPropertyAction",
		schema: registerPropertySchema,
		raw: Object.fromEntries(formData),
		invoke: registerProperty,
	});
}

const updatePropertySchema = existingSchema.extend({
	propertyDescription: optionalText,
	ownershipPercentage: optionalDecimal,
	tenureType: nullableText,
	valuationReference: nullableText,
});
export async function updatePropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "updatePropertyAction",
		schema: updatePropertySchema,
		raw: Object.fromEntries(formData),
		invoke: updateProperty,
	});
}

export async function disposePropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	const raw = {
		...Object.fromEntries(formData),
		disposalDate: formData.get("effectiveDate"),
	};
	return runPropertyAssetsMutation({
		path: "disposePropertyAction",
		schema: terminalSchema.omit({ effectiveDate: true }).extend({
			disposalDate: z.iso.date(),
		}),
		raw,
		invoke: disposeProperty,
	});
}

const registerAssetSchema = requestSchema.extend({
	code: z.string().trim().min(1).max(64),
	assetCategory: z.string().trim().min(1).max(64),
	identifier: optionalText,
	description: z.string().trim().min(1).max(500),
	custodianPartyId: optionalUuid,
	acquisitionDate: z.iso.date(),
});
export async function registerCorporateAssetAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "registerCorporateAssetAction",
		schema: registerAssetSchema,
		raw: Object.fromEntries(formData),
		invoke: registerCorporateAsset,
	});
}

const updateAssetSchema = existingSchema.extend({
	description: optionalText,
	custodianPartyId: nullableUuid,
});
export async function updateCorporateAssetAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "updateCorporateAssetAction",
		schema: updateAssetSchema,
		raw: Object.fromEntries(formData),
		invoke: updateCorporateAsset,
	});
}

export async function disposeCorporateAssetAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "disposeCorporateAssetAction",
		schema: terminalSchema,
		raw: Object.fromEntries(formData),
		invoke: disposeCorporateAsset,
	});
}

export async function writeOffCorporateAssetAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "writeOffCorporateAssetAction",
		schema: terminalSchema,
		raw: Object.fromEntries(formData),
		invoke: writeOffCorporateAsset,
	});
}

const registerIpSchema = requestSchema.extend({
	code: z.string().trim().min(1).max(64),
	rightType: z.string().trim().min(1).max(64),
	jurisdictionCode: z.string().trim().min(2).max(3),
	applicationNumber: optionalText,
	registrationNumber: optionalText,
	ownerPartyId: z.uuid(),
	filingDate: optionalText,
	grantDate: optionalText,
	expiryDate: optionalText,
});
export async function registerIntellectualPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "registerIntellectualPropertyAction",
		schema: registerIpSchema,
		raw: Object.fromEntries(formData),
		invoke: registerIntellectualProperty,
	});
}

const updateIpSchema = existingSchema.extend({
	ownerPartyId: optionalUuid,
	grantDate: nullableText,
	expiryDate: nullableText,
});
export async function updateIntellectualPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "updateIntellectualPropertyAction",
		schema: updateIpSchema,
		raw: Object.fromEntries(formData),
		invoke: updateIntellectualProperty,
	});
}

const renewIpSchema = existingSchema.extend({
	renewalDate: z.iso.date(),
	newExpiryDate: z.iso.date(),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function renewIntellectualPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "renewIntellectualPropertyAction",
		schema: renewIpSchema,
		raw: Object.fromEntries(formData),
		invoke: renewIntellectualProperty,
	});
}

export async function expireIntellectualPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "expireIntellectualPropertyAction",
		schema: terminalSchema,
		raw: Object.fromEntries(formData),
		invoke: expireIntellectualProperty,
	});
}

export async function disposeIntellectualPropertyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "disposeIntellectualPropertyAction",
		schema: terminalSchema,
		raw: Object.fromEntries(formData),
		invoke: disposeIntellectualProperty,
	});
}

const registerInsuranceSchema = requestSchema.extend({
	policyNumber: z.string().trim().min(1).max(100),
	insurerPartyId: z.uuid(),
	coveredSubject: subjectSchema,
	effectiveFrom: z.iso.date(),
	effectiveTo: optionalText,
	limitAmount: optionalDecimal,
	currencyCode: optionalText,
	documentReference: z.string().trim().min(1).max(500),
});
export async function registerInsurancePolicyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "registerInsurancePolicyAction",
		schema: registerInsuranceSchema,
		raw: {
			...Object.fromEntries(formData),
			coveredSubject: subjectFromFormData(formData),
		},
		invoke: registerInsurancePolicy,
	});
}

const updateInsuranceSchema = existingSchema.extend({
	coveredSubject: subjectSchema.optional(),
	limitAmount: nullableDecimal,
	currencyCode: nullableText,
	documentReference: optionalText,
});
export async function updateInsurancePolicyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "updateInsurancePolicyAction",
		schema: updateInsuranceSchema,
		raw: {
			...Object.fromEntries(formData),
			coveredSubject: formData.has("subjectKind")
				? subjectFromFormData(formData)
				: undefined,
		},
		invoke: updateInsurancePolicy,
	});
}

const renewInsuranceSchema = existingSchema.extend({
	renewalDate: z.iso.date(),
	newEffectiveTo: z.iso.date(),
	limitAmount: optionalDecimal,
	currencyCode: optionalText,
	documentReference: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function renewInsurancePolicyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "renewInsurancePolicyAction",
		schema: renewInsuranceSchema,
		raw: Object.fromEntries(formData),
		invoke: renewInsurancePolicy,
	});
}

const cancelInsuranceSchema = existingSchema.extend({
	cancellationDate: z.iso.date(),
	reason: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function cancelInsurancePolicyAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "cancelInsurancePolicyAction",
		schema: cancelInsuranceSchema,
		raw: Object.fromEntries(formData),
		invoke: cancelInsurancePolicy,
	});
}

const registerChargeSchema = requestSchema.extend({
	code: z.string().trim().min(1).max(64),
	chargeType: z.string().trim().min(1).max(64),
	securedPartyId: z.uuid(),
	affectedSubject: subjectSchema,
	amount: optionalDecimal,
	currencyCode: optionalText,
	priorityRank: z.coerce.number().int().positive(),
	createdDate: z.iso.date(),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function registerChargeAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "registerChargeAction",
		schema: registerChargeSchema,
		raw: {
			...Object.fromEntries(formData),
			affectedSubject: subjectFromFormData(formData),
		},
		invoke: registerCharge,
	});
}

const amendChargeSchema = existingSchema.extend({
	variationDate: z.iso.date(),
	amount: nullableDecimal,
	currencyCode: nullableText,
	priorityRank: z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.coerce.number().int().positive().optional(),
	),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function amendChargeAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "amendChargeAction",
		schema: amendChargeSchema,
		raw: Object.fromEntries(formData),
		invoke: amendCharge,
	});
}

const releaseChargeSchema = existingSchema.extend({
	releasedDate: z.iso.date(),
	reason: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(500),
});
export async function releaseChargeAction(
	_prev: PropertyAssetsMutationActionState,
	formData: FormData,
) {
	return runPropertyAssetsMutation({
		path: "releaseChargeAction",
		schema: releaseChargeSchema,
		raw: Object.fromEntries(formData),
		invoke: releaseCharge,
	});
}
