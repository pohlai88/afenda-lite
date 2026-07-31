import { errorResult, type Result } from "@afenda/errors";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../authorization";
import type { CorporateAdministrationCommandOptions } from "../command-options";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "../company/commands/durable-command";
import { parseCorporateAdministrationInput } from "../parse-input";
import {
	conflictDisclosureSchema,
	discloseConflictInputSchema,
	endOfficerDisqualificationInputSchema,
	officerDeclarationSchema,
	officerDisqualificationSchema,
	recordOfficerDeclarationInputSchema,
	recordOfficerDisqualificationInputSchema,
	recordRecusalInputSchema,
	supersedeOfficerDeclarationInputSchema,
} from "./compliance-schemas";
import type { OfficerComplianceStore } from "./compliance-store";
import type {
	ConflictDisclosure,
	DiscloseConflictInput,
	EndOfficerDisqualificationInput,
	OfficerDeclaration,
	OfficerDisqualification,
	RecordOfficerDeclarationInput,
	RecordOfficerDisqualificationInput,
	RecordRecusalInput,
	SupersedeOfficerDeclarationInput,
} from "./compliance-types";
import type { OfficerReferencePort, OfficerStore } from "./store";

type Dependencies = DurableLegalCompanyCommandDependencies &
	Readonly<{
		officerStore: OfficerStore;
		officerComplianceStore: OfficerComplianceStore;
		referenceData: OfficerReferencePort;
	}>;

export async function recordOfficerDeclaration(
	input: RecordOfficerDeclarationInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerDeclaration>> {
	const parsed = parseCorporateAdministrationInput(
		recordOfficerDeclarationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordOfficerDeclaration");
	if (!authorized.ok) {
		return authorized;
	}
	const appointment = await loadAppointment(
		options,
		dependencies,
		parsed.data.officerAppointmentId,
	);
	if (!appointment.ok) {
		return appointment;
	}
	if (appointment.data.version !== parsed.data.expectedAppointmentVersion) {
		return stale(
			parsed.data.expectedAppointmentVersion,
			appointment.data.version,
		);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.officer.record-declaration",
		fingerprintSchema: recordOfficerDeclarationInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: officerDeclarationSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.officer.declaration_recorded.v1",
			operationType: "CREATE",
			targetType: "ca_officer_declaration",
			aggregateType: "officer_declaration",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerAppointmentId: result.officerAppointmentId,
				officerDeclarationId: result.id,
				declarationType: result.declarationType,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeDeclaration,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.recordOfficerDeclaration({
				organizationId: options.organizationId,
				legalCompanyId: appointment.data.legalCompanyId,
				officerAppointmentId: appointment.data.id,
				declarationType: parsed.data.declarationType,
				effectiveFrom: parsed.data.effectiveFrom,
				expiresOn: parsed.data.expiresOn ?? null,
				sensitiveDetailRef: parsed.data.sensitiveDetailRef ?? null,
				maskedSummary: parsed.data.maskedSummary ?? null,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedAppointmentVersion: parsed.data.expectedAppointmentVersion,
				transaction,
			}),
	});
}

export async function supersedeOfficerDeclaration(
	input: SupersedeOfficerDeclarationInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerDeclaration>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeOfficerDeclarationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "supersedeOfficerDeclaration");
	if (!authorized.ok) {
		return authorized;
	}
	const current =
		await dependencies.officerComplianceStore.getOfficerDeclaration({
			organizationId: options.organizationId,
			officerDeclarationId: parsed.data.officerDeclarationId,
		});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("officerDeclaration");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const successor =
		await dependencies.officerComplianceStore.getOfficerDeclaration({
			organizationId: options.organizationId,
			officerDeclarationId: parsed.data.supersededByDeclarationId,
		});
	if (!successor.ok) {
		return successor;
	}
	if (successor.data === null) {
		return notFound("supersededByDeclaration");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.officer.supersede-declaration",
		fingerprintSchema: supersedeOfficerDeclarationInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: officerDeclarationSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.officer.declaration_superseded.v1",
			operationType: "UPDATE",
			targetType: "ca_officer_declaration",
			aggregateType: "officer_declaration",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerDeclarationId: result.id,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeDeclaration,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.supersedeOfficerDeclaration({
				organizationId: options.organizationId,
				officerDeclarationId: parsed.data.officerDeclarationId,
				supersededByDeclarationId: parsed.data.supersededByDeclarationId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function recordOfficerDisqualification(
	input: RecordOfficerDisqualificationInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerDisqualification>> {
	const parsed = parseCorporateAdministrationInput(
		recordOfficerDisqualificationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordOfficerDisqualification");
	if (!authorized.ok) {
		return authorized;
	}
	const appointment = await loadAppointment(
		options,
		dependencies,
		parsed.data.officerAppointmentId,
	);
	if (!appointment.ok) {
		return appointment;
	}
	if (appointment.data.version !== parsed.data.expectedAppointmentVersion) {
		return stale(
			parsed.data.expectedAppointmentVersion,
			appointment.data.version,
		);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.officer.record-disqualification",
		fingerprintSchema: recordOfficerDisqualificationInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: officerDisqualificationSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.officer.disqualified.v1",
			operationType: "CREATE",
			targetType: "ca_officer_disqualification",
			aggregateType: "officer_disqualification",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerAppointmentId: result.officerAppointmentId,
				officerDisqualificationId: result.id,
				reasonCode: result.reasonCode,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeDisqualification,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.recordOfficerDisqualification({
				organizationId: options.organizationId,
				legalCompanyId: appointment.data.legalCompanyId,
				officerAppointmentId: appointment.data.id,
				reasonCode: parsed.data.reasonCode,
				authorityReference: parsed.data.authorityReference ?? null,
				sourceDocumentId: parsed.data.sourceDocumentId,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedAppointmentVersion: parsed.data.expectedAppointmentVersion,
				transaction,
			}),
	});
}

export async function endOfficerDisqualification(
	input: EndOfficerDisqualificationInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerDisqualification>> {
	const parsed = parseCorporateAdministrationInput(
		endOfficerDisqualificationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "endOfficerDisqualification");
	if (!authorized.ok) {
		return authorized;
	}
	const current =
		await dependencies.officerComplianceStore.getOfficerDisqualification({
			organizationId: options.organizationId,
			officerDisqualificationId: parsed.data.officerDisqualificationId,
		});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("officerDisqualification");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	if (parsed.data.endedOn <= current.data.effectiveFrom) {
		return invalidChronology("endedOn");
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.officer.end-disqualification",
		fingerprintSchema: endOfficerDisqualificationInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: officerDisqualificationSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.officer.disqualification_ended.v1",
			operationType: "UPDATE",
			targetType: "ca_officer_disqualification",
			aggregateType: "officer_disqualification",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerDisqualificationId: result.id,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeDisqualification,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.endOfficerDisqualification({
				organizationId: options.organizationId,
				officerDisqualificationId: parsed.data.officerDisqualificationId,
				endedOn: parsed.data.endedOn,
				reason: parsed.data.reason,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function discloseConflict(
	input: DiscloseConflictInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<ConflictDisclosure>> {
	const parsed = parseCorporateAdministrationInput(
		discloseConflictInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "discloseConflict");
	if (!authorized.ok) {
		return authorized;
	}
	const appointment = await loadAppointment(
		options,
		dependencies,
		parsed.data.officerAppointmentId,
	);
	if (!appointment.ok) {
		return appointment;
	}
	if (appointment.data.version !== parsed.data.expectedAppointmentVersion) {
		return stale(
			parsed.data.expectedAppointmentVersion,
			appointment.data.version,
		);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.conflict.disclose",
		fingerprintSchema: discloseConflictInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: conflictDisclosureSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.conflict.disclosed.v1",
			operationType: "CREATE",
			targetType: "ca_conflict_disclosure",
			aggregateType: "conflict_disclosure",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerAppointmentId: result.officerAppointmentId,
				conflictDisclosureId: result.id,
				matterType: result.matterType,
				matterId: result.matterId,
				conflictTypeCode: result.conflictTypeCode,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeConflict,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.discloseConflict({
				organizationId: options.organizationId,
				legalCompanyId: appointment.data.legalCompanyId,
				officerAppointmentId: appointment.data.id,
				matterType: parsed.data.matterType,
				matterId: parsed.data.matterId,
				conflictTypeCode: parsed.data.conflictTypeCode,
				sensitiveDetailRef: parsed.data.sensitiveDetailRef ?? null,
				maskedSummary: parsed.data.maskedSummary ?? null,
				disclosedAt: parsed.data.disclosedAt,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedAppointmentVersion: parsed.data.expectedAppointmentVersion,
				transaction,
			}),
	});
}

export async function recordRecusal(
	input: RecordRecusalInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<ConflictDisclosure>> {
	const parsed = parseCorporateAdministrationInput(
		recordRecusalInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordRecusal");
	if (!authorized.ok) {
		return authorized;
	}
	const current =
		await dependencies.officerComplianceStore.getConflictDisclosure({
			organizationId: options.organizationId,
			conflictDisclosureId: parsed.data.conflictDisclosureId,
		});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return notFound("conflictDisclosure");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runDurableCompanyCommand({
		commandId: "corporate-administration.conflict.record-recusal",
		fingerprintSchema: recordRecusalInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: conflictDisclosureSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.conflict.recusal_recorded.v1",
			operationType: "UPDATE",
			targetType: "ca_conflict_disclosure",
			aggregateType: "conflict_disclosure",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				conflictDisclosureId: result.id,
				matterType: result.matterType,
				matterId: result.matterId,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeConflict,
		work: (transaction, context) =>
			dependencies.officerComplianceStore.recordRecusal({
				organizationId: options.organizationId,
				conflictDisclosureId: parsed.data.conflictDisclosureId,
				recusalReason: parsed.data.recusalReason,
				sourceDocumentId: parsed.data.sourceDocumentId,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function authorize(
	options: CorporateAdministrationCommandOptions,
	command: keyof typeof CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS[command],
	});
}

async function loadAppointment(
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	officerAppointmentId: Parameters<
		OfficerStore["getOfficerAppointment"]
	>[0]["officerAppointmentId"],
) {
	const appointment = await dependencies.officerStore.getOfficerAppointment({
		organizationId: options.organizationId,
		officerAppointmentId,
	});
	if (!appointment.ok) {
		return appointment;
	}
	return appointment.data === null
		? notFound("officerAppointment")
		: { ok: true as const, data: appointment.data };
}

async function validateSource(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	sourceDocumentId: string,
): Promise<Result<void>> {
	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId,
		sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	return source.data === null || !source.data.active
		? invalidReference("sourceDocumentId", source.data !== null)
		: { ok: true, data: undefined };
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}

function invalidChronology(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration chronology is invalid.",
	});
}

function invalidReference(_field: string, inactive: boolean): Result<never> {
	return inactive
		? errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration reference is unavailable.",
			})
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Corporate Administration reference is unavailable.",
			});
}

function serializeDeclaration(result: OfficerDeclaration) {
	return {
		...result,
		supersededAt: result.supersededAt?.toISOString() ?? null,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeDisqualification(result: OfficerDisqualification) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeConflict(result: ConflictDisclosure) {
	return {
		...result,
		disclosedAt: result.disclosedAt.toISOString(),
		recusalRecordedAt: result.recusalRecordedAt?.toISOString() ?? null,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
