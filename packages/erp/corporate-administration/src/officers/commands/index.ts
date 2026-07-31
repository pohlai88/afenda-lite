import { errorResult, type Result } from "@afenda/errors";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationApprovalIfConfigured,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import { createCorporateAdministrationCommandFingerprint } from "../../command-identity";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../command-options";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "../../company/commands/durable-command";
import type { OfficerAppointmentId } from "../../kernel/brands";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	assertAppointmentWithinOffice,
	assertNoOfficerAppointmentConflict,
} from "../rules";
import {
	amendOfficerAppointmentInputSchema,
	appointOfficerInputSchema,
	defineStatutoryOfficeInputSchema,
	officerAppointmentSchema,
	officerQualificationSchema,
	recordOfficerQualificationInputSchema,
	removeOfficerInputSchema,
	resignOfficerInputSchema,
	statutoryOfficeSchema,
} from "../schemas";
import type { OfficerCommandDependencies } from "../store";
import type {
	AmendOfficerAppointmentInput,
	AppointOfficerInput,
	DefineStatutoryOfficeInput,
	OfficerAppointment,
	OfficerQualification,
	RecordOfficerQualificationInput,
	RemoveOfficerInput,
	ResignOfficerInput,
	StatutoryOffice,
} from "../types";

type Dependencies = OfficerCommandDependencies &
	DurableLegalCompanyCommandDependencies;

type OfficerApprovalOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function defineStatutoryOffice(
	input: DefineStatutoryOfficeInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<StatutoryOffice>> {
	const parsed = parseCorporateAdministrationInput(
		defineStatutoryOfficeInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "defineStatutoryOffice");
	if (!authorized.ok) {
		return authorized;
	}
	const company = await dependencies.companyStore.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!company.ok) {
		return company;
	}
	if (company.data === null) {
		return notFound("legalCompany");
	}
	if (company.data.version !== parsed.data.expectedCompanyVersion) {
		return stale(parsed.data.expectedCompanyVersion, company.data.version);
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
		commandId: "corporate-administration.statutory-office.define",
		fingerprintSchema: defineStatutoryOfficeInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: statutoryOfficeSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.statutory_office.defined.v1",
			operationType: "CREATE",
			targetType: "ca_statutory_office",
			aggregateType: "statutory_office",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				statutoryOfficeId: result.id,
				officeTypeCode: result.officeTypeCode,
				jurisdictionCode: result.jurisdictionCode,
				required: result.required,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { office_type_code: parsed.data.officeTypeCode },
		},
		serializeResult: serializeStatutoryOffice,
		work: (transaction, context) =>
			dependencies.officerStore.defineStatutoryOffice({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				officeTypeCode: parsed.data.officeTypeCode,
				jurisdictionCode: parsed.data.jurisdictionCode,
				displayName: parsed.data.displayName,
				description: parsed.data.description ?? null,
				required: parsed.data.required,
				minimumHolders: parsed.data.minimumHolders,
				maximumHolders: parsed.data.maximumHolders ?? null,
				vacancyGraceDays: parsed.data.vacancyGraceDays,
				protectedRole: parsed.data.protectedRole ?? false,
				effectiveFrom: parsed.data.effectiveFrom,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				transaction,
			}),
	});
}

export async function appointOfficer(
	input: AppointOfficerInput,
	options: OfficerApprovalOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerAppointment>> {
	const parsed = parseCorporateAdministrationInput(
		appointOfficerInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "appointOfficer");
	if (!authorized.ok) {
		return authorized;
	}
	const office = await dependencies.officerStore.getStatutoryOffice({
		organizationId: options.organizationId,
		statutoryOfficeId: parsed.data.statutoryOfficeId,
	});
	if (!office.ok) {
		return office;
	}
	if (office.data === null) {
		return notFound("statutoryOffice");
	}
	if (office.data.version !== parsed.data.expectedOfficeVersion) {
		return stale(parsed.data.expectedOfficeVersion, office.data.version);
	}
	if (office.data.status !== "active") {
		return conflict("statutoryOfficeId");
	}
	const withinOffice = assertAppointmentWithinOffice({
		office: office.data,
		appointment: {
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo ?? null,
		},
	});
	if (!withinOffice.ok) {
		return withinOffice;
	}
	if (office.data.protectedRole) {
		const identity = createCorporateAdministrationCommandFingerprint({
			schema: appointOfficerInputSchema,
			organizationId: options.organizationId,
			commandId: "corporate-administration.officer.appoint",
			input: parsed.data,
		});
		if (!identity.ok) {
			return identity;
		}
		const approved = await requireCorporateAdministrationApprovalIfConfigured(
			dependencies,
			{
				organizationId: options.organizationId,
				actorUserId: options.actorUserId,
				approvalRequestId: options.approvalRequestId,
				approvalDecisionId: options.approvalDecisionId,
				commandFingerprint: identity.data.fingerprint,
			},
		);
		if (!approved.ok) {
			return approved;
		}
	}
	const references = await validateAppointmentReferences(
		dependencies,
		options.organizationId,
		{
			officerPartyId: parsed.data.officerPartyId,
			consentDocumentId: parsed.data.consentDocumentId,
			sourceDocumentId: parsed.data.sourceDocumentId,
		},
	);
	if (!references.ok) {
		return references;
	}
	const existing = await dependencies.officerStore.listOfficerAppointments({
		organizationId: options.organizationId,
		statutoryOfficeId: office.data.id,
	});
	if (!existing.ok) {
		return existing;
	}
	const conflictCheck = assertNoOfficerAppointmentConflict({
		candidate: {
			id: "" as OfficerAppointmentId,
			statutoryOfficeId: office.data.id,
			officerPartyId: parsed.data.officerPartyId,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo ?? null,
		},
		office: office.data,
		existing: existing.data,
	});
	if (!conflictCheck.ok) {
		return conflictCheck;
	}
	const statutoryOffice = office.data;
	return runOfficerAppointmentUpdate({
		commandId: "corporate-administration.officer.appoint",
		eventType: "corporate_administration.officer.appointed.v1",
		operationType: "CREATE",
		inputSchema: appointOfficerInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.officerStore.appointOfficer({
				organizationId: options.organizationId,
				legalCompanyId: statutoryOffice.legalCompanyId,
				statutoryOfficeId: statutoryOffice.id,
				officerPartyId: parsed.data.officerPartyId,
				appointmentMethod: parsed.data.appointmentMethod,
				appointingAuthorityType: parsed.data.appointingAuthorityType,
				appointingAuthorityId: parsed.data.appointingAuthorityId ?? null,
				consentDocumentId: parsed.data.consentDocumentId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedOfficeVersion: parsed.data.expectedOfficeVersion,
				transaction,
			}),
	});
}

export async function amendOfficerAppointment(
	input: AmendOfficerAppointmentInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerAppointment>> {
	const parsed = parseCorporateAdministrationInput(
		amendOfficerAppointmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "amendOfficerAppointment");
	if (!authorized.ok) {
		return authorized;
	}
	const current = await loadAppointment(
		options,
		dependencies,
		parsed.data.officerAppointmentId,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const office = await loadOffice(
		options,
		dependencies,
		current.data.statutoryOfficeId,
	);
	if (!office.ok) {
		return office;
	}
	const withinOffice = assertAppointmentWithinOffice({
		office: office.data,
		appointment: {
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo ?? null,
		},
	});
	if (!withinOffice.ok) {
		return withinOffice;
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	const consent = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.consentDocumentId,
	);
	if (!consent.ok) {
		return consent;
	}
	return runOfficerAppointmentUpdate({
		commandId: "corporate-administration.officer.amend-appointment",
		eventType: "corporate_administration.officer.appointment_amended.v1",
		operationType: "UPDATE",
		inputSchema: amendOfficerAppointmentInputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.officerStore.amendOfficerAppointment({
				organizationId: options.organizationId,
				officerAppointmentId: parsed.data.officerAppointmentId,
				appointmentMethod: parsed.data.appointmentMethod,
				appointingAuthorityType: parsed.data.appointingAuthorityType,
				appointingAuthorityId: parsed.data.appointingAuthorityId ?? null,
				consentDocumentId: parsed.data.consentDocumentId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

export async function recordOfficerQualification(
	input: RecordOfficerQualificationInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerQualification>> {
	const parsed = parseCorporateAdministrationInput(
		recordOfficerQualificationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "recordOfficerQualification");
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
		commandId: "corporate-administration.officer.record-qualification",
		fingerprintSchema: recordOfficerQualificationInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: officerQualificationSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.officer.qualification_recorded.v1",
			operationType: "CREATE",
			targetType: "ca_officer_qualification",
			aggregateType: "officer_qualification",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				officerAppointmentId: result.officerAppointmentId,
				officerQualificationId: result.id,
				qualificationTypeCode: result.qualificationTypeCode,
				verificationStatus: result.verificationStatus,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeOfficerQualification,
		work: (transaction, context) =>
			dependencies.officerStore.recordOfficerQualification({
				organizationId: options.organizationId,
				legalCompanyId: appointment.data.legalCompanyId,
				officerAppointmentId: appointment.data.id,
				qualificationTypeCode: parsed.data.qualificationTypeCode,
				issuer: parsed.data.issuer,
				referenceNumber: parsed.data.referenceNumber ?? null,
				validFrom: parsed.data.validFrom,
				validTo: parsed.data.validTo ?? null,
				verificationStatus: parsed.data.verificationStatus,
				verifiedAt: parsed.data.verifiedAt ?? null,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedAppointmentVersion: parsed.data.expectedAppointmentVersion,
				transaction,
			}),
	});
}

export function resignOfficer(
	input: ResignOfficerInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerAppointment>> {
	return endOfficer(input, options, dependencies, {
		commandId: "corporate-administration.officer.resign",
		eventType: "corporate_administration.officer.resigned.v1",
		status: "resigned",
		dateField: "resignedOn",
		inputSchema: resignOfficerInputSchema,
	});
}

export function removeOfficer(
	input: RemoveOfficerInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerAppointment>> {
	return endOfficer(input, options, dependencies, {
		commandId: "corporate-administration.officer.remove",
		eventType: "corporate_administration.officer.removed.v1",
		status: "removed",
		dateField: "removedOn",
		inputSchema: removeOfficerInputSchema,
	});
}

async function endOfficer(
	input: ResignOfficerInput | RemoveOfficerInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	config: Readonly<{
		commandId: string;
		eventType:
			| "corporate_administration.officer.resigned.v1"
			| "corporate_administration.officer.removed.v1";
		status: "resigned" | "removed";
		dateField: "resignedOn" | "removedOn";
		inputSchema:
			| typeof resignOfficerInputSchema
			| typeof removeOfficerInputSchema;
	}>,
): Promise<Result<OfficerAppointment>> {
	const parsed = parseCorporateAdministrationInput(config.inputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(
		options,
		config.status === "resigned" ? "resignOfficer" : "removeOfficer",
	);
	if (!authorized.ok) {
		return authorized;
	}
	const current = await loadAppointment(
		options,
		dependencies,
		parsed.data.officerAppointmentId,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return stale(parsed.data.expectedVersion, current.data.version);
	}
	const endedOn =
		config.status === "resigned"
			? resignOfficerInputSchema.parse(parsed.data).resignedOn
			: removeOfficerInputSchema.parse(parsed.data).removedOn;
	if (endedOn <= current.data.effectiveFrom) {
		return invalidChronology(config.dateField);
	}
	const source = await validateSource(
		dependencies,
		options.organizationId,
		parsed.data.sourceDocumentId,
	);
	if (!source.ok) {
		return source;
	}
	return runOfficerAppointmentUpdate({
		commandId: config.commandId,
		eventType: config.eventType,
		operationType: "UPDATE",
		inputSchema: config.inputSchema,
		input: parsed.data,
		options,
		dependencies,
		work: (transaction, context) =>
			dependencies.officerStore.endOfficerAppointment({
				organizationId: options.organizationId,
				officerAppointmentId: parsed.data.officerAppointmentId,
				endedOn,
				status: config.status,
				reason: parsed.data.reason,
				recordedAt: context.occurredAt,
				recordedBy: options.actorUserId,
				sourceDocumentId: parsed.data.sourceDocumentId,
				expectedVersion: parsed.data.expectedVersion,
				transaction,
			}),
	});
}

function runOfficerAppointmentUpdate(input: {
	commandId: string;
	eventType:
		| "corporate_administration.officer.appointed.v1"
		| "corporate_administration.officer.appointment_amended.v1"
		| "corporate_administration.officer.resigned.v1"
		| "corporate_administration.officer.removed.v1";
	operationType: "CREATE" | "UPDATE";
	inputSchema:
		| typeof appointOfficerInputSchema
		| typeof amendOfficerAppointmentInputSchema
		| typeof resignOfficerInputSchema
		| typeof removeOfficerInputSchema;
	input: unknown;
	options: CorporateAdministrationCommandOptions;
	dependencies: Dependencies;
	work: Parameters<
		typeof runDurableCompanyCommand<OfficerAppointment>
	>[0]["work"];
}) {
	return runDurableCompanyCommand({
		commandId: input.commandId,
		fingerprintSchema: input.inputSchema,
		fingerprintInput: input.input,
		outputSchema: officerAppointmentSchema,
		options: input.options,
		dependencies: input.dependencies,
		event: {
			type: input.eventType,
			operationType: input.operationType,
			targetType: "ca_officer_appointment",
			aggregateType: "officer_appointment",
			aggregateId: (result) => result.id,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				statutoryOfficeId: result.statutoryOfficeId,
				officerAppointmentId: result.id,
				status: result.status,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
		},
		serializeResult: serializeOfficerAppointment,
		work: input.work,
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

async function loadOffice(
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	statutoryOfficeId: StatutoryOffice["id"],
): Promise<Result<StatutoryOffice>> {
	const office = await dependencies.officerStore.getStatutoryOffice({
		organizationId: options.organizationId,
		statutoryOfficeId,
	});
	if (!office.ok) {
		return office;
	}
	return office.data === null
		? notFound("statutoryOffice")
		: { ok: true, data: office.data };
}

async function loadAppointment(
	options: CorporateAdministrationCommandOptions,
	dependencies: Dependencies,
	officerAppointmentId: OfficerAppointment["id"],
): Promise<Result<OfficerAppointment>> {
	const appointment = await dependencies.officerStore.getOfficerAppointment({
		organizationId: options.organizationId,
		officerAppointmentId,
	});
	if (!appointment.ok) {
		return appointment;
	}
	return appointment.data === null
		? notFound("officerAppointment")
		: { ok: true, data: appointment.data };
}

async function validateAppointmentReferences(
	dependencies: Dependencies,
	organizationId: CorporateAdministrationCommandOptions["organizationId"],
	input: Readonly<{
		officerPartyId: string;
		consentDocumentId: string;
		sourceDocumentId: string;
	}>,
): Promise<Result<void>> {
	const party = await dependencies.partyReferences.getOrganizationParty({
		organizationId,
		partyId: input.officerPartyId,
	});
	if (!party.ok) {
		return party;
	}
	if (
		party.data === null ||
		!party.data.active ||
		party.data.kind !== "person"
	) {
		return invalidReference("officerPartyId", party.data !== null);
	}
	const consent = await validateSource(
		dependencies,
		organizationId,
		input.consentDocumentId,
	);
	if (!consent.ok) {
		return consent;
	}
	return validateSource(dependencies, organizationId, input.sourceDocumentId);
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

function conflict(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration officer conflict.",
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

function serializeStatutoryOffice(result: StatutoryOffice) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeOfficerAppointment(result: OfficerAppointment) {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}

function serializeOfficerQualification(result: OfficerQualification) {
	return {
		...result,
		verifiedAt: result.verifiedAt?.toISOString() ?? null,
		recordedAt: result.recordedAt.toISOString(),
		createdAt: result.createdAt.toISOString(),
		updatedAt: result.updatedAt.toISOString(),
	};
}
