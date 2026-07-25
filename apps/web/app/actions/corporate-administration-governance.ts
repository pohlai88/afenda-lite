"use server";

import {
	amendAuthorityMandate,
	amendOfficer,
	appointGovernanceMembership,
	appointOfficer,
	approveResolution,
	CA_PERMISSION_GOVERNANCE_MANAGE,
	type CorporateAdministrationCommandOptions,
	closeGovernanceMeeting,
	createGovernanceBody,
	endGovernanceMembership,
	endOfficer,
	grantAuthorityMandate,
	recordGovernanceMeeting,
	recordResolution,
	registerCompanyPremise,
	retireCompanyPremise,
	retireGovernanceBody,
	revokeAuthorityMandate,
	revokeResolution,
	updateCompanyPremise,
	updateGovernanceBody,
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

export type GovernanceMutationActionData = {
	entity: { id: string; version: number };
};
export type GovernanceMutationActionState =
	ActionResult<GovernanceMutationActionData> | null;

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

const optionalText = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.string().trim().min(1).optional(),
);

const nullableText = z.preprocess(
	(value) => (value === "" || value === null ? null : value),
	z.string().trim().min(1).nullable().optional(),
);

const checkboxValue = z
	.enum(["true", "false"])
	.transform((value) => value === "true");

const membershipSubjectSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("party"), partyId: z.uuid() }),
	z.object({
		kind: z.literal("officer"),
		officerAppointmentId: z.uuid(),
	}),
]);

const mandateHolderSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("party"), partyId: z.uuid() }),
	z.object({
		kind: z.literal("officer"),
		officerAppointmentId: z.uuid(),
	}),
]);

const addressSourceSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("master"), partyAddressId: z.uuid() }),
	z.object({
		kind: z.literal("manual"),
		line1: z.string().trim().min(1).max(300),
		line2: z.string().trim().min(1).max(300).optional(),
		city: z.string().trim().min(1).max(120),
		region: z.string().trim().min(1).max(120).optional(),
		postalCode: z.string().trim().min(1).max(32).optional(),
		countryCode: z.string().trim().length(2),
	}),
]);

function parseJsonValue(value: FormDataEntryValue | null): unknown {
	if (typeof value !== "string") return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

function subjectFromFormData(formData: FormData): unknown {
	const kind = formData.get("subjectKind");
	const id = formData.get("subjectId");
	return kind === "officer"
		? { kind, officerAppointmentId: id }
		: { kind, partyId: id };
}

function holdersFromFormData(formData: FormData): unknown[] {
	const holders: unknown[] = [];
	for (const suffix of ["1", "2"]) {
		const kind = formData.get(`holderKind${suffix}`);
		const id = formData.get(`holderId${suffix}`);
		if (!kind || !id) continue;
		holders.push(
			kind === "officer"
				? { kind, officerAppointmentId: id }
				: { kind, partyId: id },
		);
	}
	return holders;
}

function addressSourceFromFormData(formData: FormData): unknown {
	const kind = formData.get("addressKind");
	if (kind === "master") {
		return { kind, partyAddressId: formData.get("partyAddressId") };
	}
	return {
		kind: "manual",
		line1: formData.get("addressLine1"),
		line2: formData.get("addressLine2") || undefined,
		city: formData.get("city"),
		region: formData.get("region") || undefined,
		postalCode: formData.get("postalCode") || undefined,
		countryCode: formData.get("countryCode"),
	};
}

async function runGovernanceMutation<
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
}): Promise<GovernanceMutationActionState> {
	return runOperatorPermissionAction({
		path: config.path,
		permission: CA_PERMISSION_GOVERNANCE_MANAGE,
		safeMessage:
			"Could not update governance records. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.schema, config.raw);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Review the governance fields and try again.",
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
					entity: { id: mapped.data.id, version: mapped.data.version },
				},
			};
		},
	});
}

const appointOfficerSchema = requestContextSchema.extend({
	officerRole: z.enum([
		"director",
		"secretary",
		"auditor",
		"public_officer",
		"authorized_representative",
		"other",
	]),
	partyId: z.uuid(),
	appointedDate: z.iso.date(),
	authorityLimits: optionalText,
});

export async function appointOfficerAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "appointOfficerAction",
		schema: appointOfficerSchema,
		raw: Object.fromEntries(formData),
		invoke: appointOfficer,
	});
}

const amendOfficerSchema = existingRecordSchema.extend({
	effectiveFrom: z.iso.date(),
	officerRole: optionalText,
	authorityLimits: nullableText,
});

export async function amendOfficerAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "amendOfficerAction",
		schema: amendOfficerSchema,
		raw: Object.fromEntries(formData),
		invoke: amendOfficer,
	});
}

const endOfficerSchema = existingRecordSchema.extend({
	effectiveTo: z.iso.date(),
	endKind: z.enum(["resigned", "removed"]),
	evidenceReference: optionalText,
});

export async function endOfficerAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "endOfficerAction",
		schema: endOfficerSchema,
		raw: Object.fromEntries(formData),
		invoke: endOfficer,
	});
}

const createBodySchema = requestContextSchema.extend({
	code: z.string().trim().min(1).max(64),
	bodyType: z.enum(["board", "committee", "other"]),
	displayName: z.string().trim().min(1).max(300),
});

export async function createGovernanceBodyAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "createGovernanceBodyAction",
		schema: createBodySchema,
		raw: Object.fromEntries(formData),
		invoke: createGovernanceBody,
	});
}

const updateBodySchema = existingRecordSchema.extend({
	displayName: optionalText,
	bodyType: optionalText,
});

export async function updateGovernanceBodyAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "updateGovernanceBodyAction",
		schema: updateBodySchema,
		raw: Object.fromEntries(formData),
		invoke: updateGovernanceBody,
	});
}

export async function retireGovernanceBodyAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "retireGovernanceBodyAction",
		schema: existingRecordSchema,
		raw: Object.fromEntries(formData),
		invoke: retireGovernanceBody,
	});
}

const appointMembershipSchema = requestContextSchema.extend({
	governanceBodyId: z.uuid(),
	subject: membershipSubjectSchema,
	roleTitle: z.string().trim().min(1).max(200),
	effectiveFrom: z.iso.date(),
});

export async function appointGovernanceMembershipAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "appointGovernanceMembershipAction",
		schema: appointMembershipSchema,
		raw: {
			...Object.fromEntries(formData),
			subject:
				formData.has("subjectKind") || formData.has("subjectId")
					? subjectFromFormData(formData)
					: parseJsonValue(formData.get("subject")),
		},
		invoke: appointGovernanceMembership,
	});
}

const endMembershipSchema = existingRecordSchema.extend({
	effectiveTo: z.iso.date(),
});

export async function endGovernanceMembershipAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "endGovernanceMembershipAction",
		schema: endMembershipSchema,
		raw: Object.fromEntries(formData),
		invoke: endGovernanceMembership,
	});
}

const grantMandateSchema = requestContextSchema.extend({
	mandateType: z.enum(["signing_authority", "power_of_attorney", "other"]),
	scopeDescription: z.string().trim().min(1).max(2000),
	amountLimit: optionalText,
	currencyCode: optionalText,
	signingRule: z.enum(["single", "joint"]),
	minimumSignatories: z.coerce.number().int().positive(),
	holders: z.array(mandateHolderSchema).min(1).max(50),
	effectiveFrom: z.iso.date(),
	grantEvidenceReference: optionalText,
});

export async function grantAuthorityMandateAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "grantAuthorityMandateAction",
		schema: grantMandateSchema,
		raw: {
			...Object.fromEntries(formData),
			holders:
				formData.has("holderKind1") || formData.has("holderId1")
					? holdersFromFormData(formData)
					: parseJsonValue(formData.get("holders")),
		},
		invoke: grantAuthorityMandate,
	});
}

const amendMandateSchema = existingRecordSchema.extend({
	effectiveFrom: z.iso.date(),
	mandateType: z.enum(["signing_authority", "power_of_attorney", "other"]),
	scopeDescription: z.string().trim().min(1).max(2000),
	amountLimit: optionalText,
	currencyCode: optionalText,
	signingRule: z.enum(["single", "joint"]),
	minimumSignatories: z.coerce.number().int().positive(),
	holders: z.array(mandateHolderSchema).min(1).max(50),
	grantEvidenceReference: z.string().trim().min(1).max(500),
});

export async function amendAuthorityMandateAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "amendAuthorityMandateAction",
		schema: amendMandateSchema,
		raw: {
			...Object.fromEntries(formData),
			holders:
				formData.has("holderKind1") || formData.has("holderId1")
					? holdersFromFormData(formData)
					: parseJsonValue(formData.get("holders")),
		},
		invoke: amendAuthorityMandate,
	});
}

const revokeMandateSchema = existingRecordSchema.extend({
	effectiveTo: z.iso.date(),
	evidenceReference: z.string().trim().min(1).max(500),
});

export async function revokeAuthorityMandateAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "revokeAuthorityMandateAction",
		schema: revokeMandateSchema,
		raw: Object.fromEntries(formData),
		invoke: revokeAuthorityMandate,
	});
}

const registerPremiseSchema = requestContextSchema.extend({
	premiseType: z.enum([
		"registered_office",
		"branch",
		"records_location",
		"other",
	]),
	addressSource: addressSourceSchema,
	isPrimary: checkboxValue,
	effectiveFrom: z.iso.date(),
});

export async function registerCompanyPremiseAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "registerCompanyPremiseAction",
		schema: registerPremiseSchema,
		raw: {
			...Object.fromEntries(formData),
			addressSource:
				formData.has("addressKind") || formData.has("addressLine1")
					? addressSourceFromFormData(formData)
					: parseJsonValue(formData.get("addressSource")),
		},
		invoke: registerCompanyPremise,
	});
}

const updatePremiseSchema = existingRecordSchema.extend({
	effectiveFrom: z.iso.date(),
	premiseType: z.enum([
		"registered_office",
		"branch",
		"records_location",
		"other",
	]),
	addressSource: addressSourceSchema,
	isPrimary: checkboxValue,
});

export async function updateCompanyPremiseAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "updateCompanyPremiseAction",
		schema: updatePremiseSchema,
		raw: {
			...Object.fromEntries(formData),
			addressSource:
				formData.has("addressKind") || formData.has("addressLine1")
					? addressSourceFromFormData(formData)
					: parseJsonValue(formData.get("addressSource")),
		},
		invoke: updateCompanyPremise,
	});
}

const retirePremiseSchema = existingRecordSchema.extend({
	effectiveTo: z.iso.date(),
});

export async function retireCompanyPremiseAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "retireCompanyPremiseAction",
		schema: retirePremiseSchema,
		raw: Object.fromEntries(formData),
		invoke: retireCompanyPremise,
	});
}

const recordMeetingSchema = requestContextSchema.extend({
	mode: z.enum(["standard", "correction"]),
	governanceBodyId: z.uuid(),
	meetingAt: z.iso.datetime(),
	quorumResult: z.enum(["pending", "met", "not_met", "waived"]),
	status: optionalText,
	minutesDocumentReference: optionalText,
	correctsGovernanceMeetingId: optionalText,
	correctionReason: optionalText,
});

const standardMeetingActionSchema = requestContextSchema.extend({
	mode: z.literal("standard"),
	governanceBodyId: z.uuid(),
	meetingAt: z.iso.datetime(),
	quorumResult: z.enum(["pending", "met", "not_met", "waived"]),
	status: z.enum(["scheduled", "held", "cancelled"]),
	minutesDocumentReference: optionalText,
});

const correctionMeetingActionSchema = requestContextSchema.extend({
	mode: z.literal("correction"),
	governanceBodyId: z.uuid(),
	meetingAt: z.iso.datetime(),
	quorumResult: z.enum(["met", "not_met", "waived"]),
	minutesDocumentReference: z.string().trim().min(1).max(500),
	correctsGovernanceMeetingId: z.uuid(),
	correctionReason: z.string().trim().min(1).max(1000),
});

export async function recordGovernanceMeetingAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	const raw = Object.fromEntries(formData);
	const parsed = parseSchema(recordMeetingSchema, raw);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Review the meeting fields and try again.",
			parsed.details,
		);
	}
	const common = {
		legalCompanyId: parsed.data.legalCompanyId,
		requestId: parsed.data.requestId,
		governanceBodyId: parsed.data.governanceBodyId,
		meetingAt: parsed.data.meetingAt,
		quorumResult: parsed.data.quorumResult,
		minutesDocumentReference: parsed.data.minutesDocumentReference,
	};
	const input =
		parsed.data.mode === "correction"
			? {
					...common,
					mode: "correction" as const,
					correctsGovernanceMeetingId: parsed.data.correctsGovernanceMeetingId,
					correctionReason: parsed.data.correctionReason,
				}
			: {
					...common,
					mode: "standard" as const,
					status: parsed.data.status ?? "scheduled",
				};
	return runGovernanceMutation({
		path: "recordGovernanceMeetingAction",
		schema: z.discriminatedUnion("mode", [
			standardMeetingActionSchema,
			correctionMeetingActionSchema,
		]),
		raw: input,
		invoke: recordGovernanceMeeting,
	});
}

const closeMeetingSchema = existingRecordSchema.extend({
	quorumResult: z.enum(["met", "not_met", "waived"]),
	minutesDocumentReference: z.string().trim().min(1).max(500),
});

export async function closeGovernanceMeetingAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "closeGovernanceMeetingAction",
		schema: closeMeetingSchema,
		raw: Object.fromEntries(formData),
		invoke: closeGovernanceMeeting,
	});
}

const recordResolutionSchema = requestContextSchema.extend({
	mode: z.enum(["standard", "superseding"]),
	governanceMeetingId: optionalText,
	resolutionNumber: z.string().trim().min(1).max(64),
	resolutionYear: z.coerce.number().int().min(1900).max(9999),
	title: z.string().trim().min(1).max(300),
	description: optionalText,
	supersedesResolutionId: optionalText,
});

const standardResolutionActionSchema = requestContextSchema.extend({
	mode: z.literal("standard"),
	governanceMeetingId: z.uuid().optional(),
	resolutionNumber: z.string().trim().min(1).max(64),
	resolutionYear: z.number().int().min(1900).max(9999),
	title: z.string().trim().min(1).max(300),
	description: optionalText,
});

const supersedingResolutionActionSchema = standardResolutionActionSchema.extend(
	{
		mode: z.literal("superseding"),
		supersedesResolutionId: z.uuid(),
	},
);

export async function recordResolutionAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	const parsed = parseSchema(
		recordResolutionSchema,
		Object.fromEntries(formData),
	);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Review the resolution fields and try again.",
			parsed.details,
		);
	}
	const common = {
		legalCompanyId: parsed.data.legalCompanyId,
		requestId: parsed.data.requestId,
		governanceMeetingId: parsed.data.governanceMeetingId,
		resolutionNumber: parsed.data.resolutionNumber,
		resolutionYear: parsed.data.resolutionYear,
		title: parsed.data.title,
		description: parsed.data.description,
	};
	const input =
		parsed.data.mode === "superseding"
			? {
					...common,
					mode: "superseding" as const,
					supersedesResolutionId: parsed.data.supersedesResolutionId,
				}
			: { ...common, mode: "standard" as const };
	return runGovernanceMutation({
		path: "recordResolutionAction",
		schema: z.discriminatedUnion("mode", [
			standardResolutionActionSchema,
			supersedingResolutionActionSchema,
		]),
		raw: input,
		invoke: recordResolution,
	});
}

const approveResolutionSchema = existingRecordSchema.extend({
	approvedDate: z.iso.date(),
	evidenceReference: z.string().trim().min(1).max(500),
});

export async function approveResolutionAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "approveResolutionAction",
		schema: approveResolutionSchema,
		raw: Object.fromEntries(formData),
		invoke: approveResolution,
	});
}

const revokeResolutionSchema = existingRecordSchema.extend({
	revokedDate: z.iso.date(),
	evidenceReference: optionalText,
});

export async function revokeResolutionAction(
	_prev: GovernanceMutationActionState,
	formData: FormData,
): Promise<GovernanceMutationActionState> {
	return runGovernanceMutation({
		path: "revokeResolutionAction",
		schema: revokeResolutionSchema,
		raw: Object.fromEntries(formData),
		invoke: revokeResolution,
	});
}
