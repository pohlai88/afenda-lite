// biome-ignore-all lint/performance/noNamespaceImport: Boundary checks inspect namespace imports as source text.
// biome-ignore-all lint/style/noNestedTernary: File classification remains adjacent to the boundary scanner.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as packageRoot from "@afenda/corporate-administration";
import * as drizzleAdapters from "@afenda/corporate-administration/adapters/drizzle";
import { corporateAdministrationModuleManifest } from "@afenda/corporate-administration/module-manifest";
import { describe, expect, it } from "vitest";

const packageDirectory = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const repositoryDirectory = path.resolve(packageDirectory, "../../..");
const sourceDirectory = path.join(packageDirectory, "src");
const approvedDatabaseImportFiles = new Set([
	"src/adapters/drizzle/audit.ts",
	"src/adapters/drizzle/dependencies.ts",
	"src/adapters/drizzle/errors.ts",
	"src/adapters/drizzle/company.ts",
	"src/adapters/drizzle/establishments.ts",
	"src/adapters/drizzle/governance.ts",
	"src/adapters/drizzle/idempotency.ts",
	"src/adapters/drizzle/index.ts",
	"src/adapters/drizzle/meetings.ts",
	"src/adapters/drizzle/officer-compliance.ts",
	"src/adapters/drizzle/officers.ts",
	"src/adapters/drizzle/outbox.ts",
	"src/adapters/drizzle/resolutions.ts",
	"src/adapters/drizzle/transaction.ts",
	"src/module.manifest.ts",
]);

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const target = path.join(directory, entry);
		return statSync(target).isDirectory()
			? sourceFiles(target)
			: target.endsWith(".ts")
				? [target]
				: [];
	});
}

function dependencyImportPattern(dependency: string): RegExp {
	const escapedDependency = dependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(
		`(?:from\\s+["']${escapedDependency}(?:/[^"']*)?["']|import\\s+["']${escapedDependency}["'])`,
	);
}

function normalizedRelativeSourceFiles(): string[] {
	return sourceFiles(sourceDirectory).map((file) =>
		path.relative(packageDirectory, file).replaceAll("\\", "/"),
	);
}

function readPackageSource(relativeFile: string): string {
	return readFileSync(path.join(packageDirectory, relativeFile), "utf8");
}

describe("Corporate Administration CA-0.4 package boundary", () => {
	it("keeps Phase 0 execution controllers and skill authority aligned", () => {
		const greenfieldDirectory = path.join(
			repositoryDirectory,
			"docs-V2/_scratch/erp/corporate-administration/greenfield",
		);
		const phase = readFileSync(
			path.join(
				greenfieldDirectory,
				"phase/PHASE-0-ARCHITECTURE-AND-FOUNDATION.md",
			),
			"utf8",
		);
		const roadmapIndex = readFileSync(
			path.join(greenfieldDirectory, "03-ROADMAP-INDEX.md"),
			"utf8",
		);
		const roadmapYaml = readFileSync(
			path.join(greenfieldDirectory, "ROADMAP.yaml"),
			"utf8",
		);
		const roadmapTracker = readFileSync(
			path.join(greenfieldDirectory, "ROADMAP-TRACKER.tsv"),
			"utf8",
		);
		const serializedControllers = [
			phase,
			roadmapIndex,
			roadmapYaml,
			roadmapTracker,
		].join("\n");

		for (const status of [
			["CA-0.1", "DONE"],
			["CA-0.2", "DONE"],
			["CA-0.3", "DONE"],
			["CA-0.4", "DONE"],
		] as const) {
			for (const controller of [
				phase,
				roadmapIndex,
				roadmapYaml,
				roadmapTracker,
			]) {
				expect(controller).toMatch(
					new RegExp(`${status[0]}[\\s\\S]{0,220}${status[1]}`),
				);
			}
			const evidence = readFileSync(
				path.join(greenfieldDirectory, `evidence/${status[0]}-EVIDENCE.md`),
				"utf8",
			);
			expect(evidence).toContain(`\`${status[1]}\``);
		}

		expect(serializedControllers).not.toMatch(
			/first thin vertical|draft legal-company|thin draft root/i,
		);
		const skillReference = readFileSync(
			path.join(
				repositoryDirectory,
				".cursor/skills/afenda-elite-corporate-administration/reference.md",
			),
			"utf8",
		);
		expect(skillReference).toContain("01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md");
		expect(skillReference).not.toContain("01-DATA-MODEL-AND-TABLE-CATALOG.md");
	});

	it("resolves the root and manifest exports with the approved identity", () => {
		expect(Object.keys(packageRoot)).toEqual(
			expect.arrayContaining([
				"CORPORATE_ADMINISTRATION_MODULE_ID",
				"CORPORATE_ADMINISTRATION_PACKAGE_NAME",
				"CORPORATE_ADMINISTRATION_PERMISSION_CODES",
				"CORPORATE_ADMINISTRATION_ERROR_CODES",
				"organizationIdSchema",
				"createCanonicalFingerprint",
				"parseCorporateAdministrationInput",
				"createCorporateAdministrationCommandFingerprint",
				"createCorporateAdministrationRuntime",
				"createCorporateAdministrationProductionRuntime",
				"createCorporateAdministrationDomainEventEnvelope",
				"CORPORATE_ADMINISTRATION_MUTATION_TABLES",
				"corporateAdministrationModuleManifest",
			]),
		);
		expect(packageRoot.CORPORATE_ADMINISTRATION_MODULE_ID).toBe(
			"corporate-administration",
		);
		expect(packageRoot.CORPORATE_ADMINISTRATION_PACKAGE_NAME).toBe(
			"@afenda/corporate-administration",
		);
		expect(corporateAdministrationModuleManifest).toMatchObject({
			id: "corporate-administration",
			packageName: "@afenda/corporate-administration",
			category: "erp",
			band: "R1-F",
			lifecycle: "scaffolded",
			activationMode: "organization_toggle",
		});
		expect(corporateAdministrationModuleManifest.lifecycle).not.toMatch(
			/^(active|preview|beta|production)$/,
		);
		expect(packageRoot.corporateAdministrationModuleManifest).toBe(
			corporateAdministrationModuleManifest,
		);
		for (const internalExport of [
			"approvalDecisionIdSchema",
			"approvalRequestIdSchema",
			"documentObjectRefSchema",
			"legalCompanyIdSchema",
			"legalEstablishmentIdSchema",
			"EVENT_NAME_PART_PATTERN",
			"EVENT_ACTION_PATTERN",
			"CORPORATE_ADMINISTRATION_EVENT_TYPE_PATTERN",
			"DECIMAL_INPUT_PATTERN",
			"tryNormalizeDecimalString",
			"canonicalJsonStringify",
			"canonicalJsonValueSchema",
			"assertCanonicalJsonValue",
			"toImmutableCanonicalJson",
			"failureMetadataShape",
			"safeMetadataValueSchema",
			"normalizeSafeFieldPath",
			"createFixedCorporateAdministrationClock",
			"createMemoryCorporateAdministrationIdempotencyPort",
			"createInlineCorporateAdministrationTransactionPort",
			"createMemoryLegalCompanyStore",
			"createDrizzleCorporateAdministrationIdempotencyPort",
			"createDrizzleCorporateAdministrationLegalCompanyStore",
			"createDrizzleCorporateAdministrationTransactionPort",
			"DrizzleTransaction",
		]) {
			expect(packageRoot).not.toHaveProperty(internalExport);
		}
		const rootSource = readPackageSource("src/index.ts");
		for (const nonPublicRootExport of [
			"ApprovalDecisionId",
			"ApprovalRequestId",
			"DocumentObjectRef",
			"LegalCompanyId",
			"LegalEstablishmentId",
			"approvalDecisionIdSchema",
			"approvalRequestIdSchema",
			"documentObjectRefSchema",
			"legalCompanyIdSchema",
			"legalEstablishmentIdSchema",
			"canonicalJsonStringify",
			"canonicalJsonValueSchema",
			"assertCanonicalJsonValue",
			"toImmutableCanonicalJson",
		]) {
			expect(rootSource).not.toContain(nonPublicRootExport);
		}
	});

	it("publishes Drizzle adapters only through the adapter subpath", () => {
		expect(drizzleAdapters).toHaveProperty(
			"createDrizzleCorporateAdministrationIdempotencyPort",
		);
		expect(drizzleAdapters).toHaveProperty(
			"createDrizzleCorporateAdministrationAuditFactPort",
		);
		expect(drizzleAdapters).toHaveProperty(
			"createDrizzleCorporateAdministrationOutboxPort",
		);
		expect(drizzleAdapters).toHaveProperty(
			"createDrizzleCorporateAdministrationTransactionPort",
		);
		expect(drizzleAdapters).toHaveProperty(
			"createDrizzleCorporateAdministrationLegalCompanyStore",
		);
		expect(packageRoot).not.toHaveProperty(
			"createDrizzleCorporateAdministrationIdempotencyPort",
		);
		expect(packageRoot).not.toHaveProperty(
			"createDrizzleCorporateAdministrationAuditFactPort",
		);
		expect(packageRoot).not.toHaveProperty(
			"createDrizzleCorporateAdministrationOutboxPort",
		);
		expect(packageRoot).not.toHaveProperty(
			"createDrizzleCorporateAdministrationTransactionPort",
		);
		expect(packageRoot).not.toHaveProperty(
			"createDrizzleCorporateAdministrationLegalCompanyStore",
		);
	});

	it("declares the CA-2.1 company, establishment and governance surface while remaining scaffolded", () => {
		expect(corporateAdministrationModuleManifest).toMatchObject({
			lifecycle: "scaffolded",
			activationMode: "organization_toggle",
		});
		expect(corporateAdministrationModuleManifest.owns).toEqual({
			aggregates: [
				"legal_company",
				"legal_establishment",
				"premise",
				"governance_body",
				"governance_membership",
				"statutory_office",
				"officer_appointment",
				"officer_qualification",
				"officer_declaration",
				"officer_disqualification",
				"conflict_disclosure",
				"governance_meeting",
				"meeting_notice",
				"meeting_participant",
				"meeting_quorum_result",
				"meeting_vote",
				"resolution",
				"resolution_action",
			],
			commandNamespace: "corporate-administration",
			commands: [
				"registerLegalCompanyDraft",
				"updateLegalCompanyProfile",
				"addCompanyName",
				"supersedeCompanyName",
				"retireCompanyName",
				"setCompanyJurisdictionProfile",
				"supersedeCompanyJurisdictionProfile",
				"setCompanyLegalForm",
				"supersedeCompanyLegalForm",
				"registerCompanyIdentifier",
				"supersedeCompanyIdentifier",
				"retireCompanyIdentifier",
				"setCompanyFinancialYear",
				"registerCompanyActivity",
				"endCompanyActivity",
				"activateLegalCompany",
				"suspendLegalCompany",
				"markCompanyStruckOff",
				"enterLiquidation",
				"dissolveLegalCompany",
				"restoreLegalCompany",
				"archiveLegalCompany",
				"registerLegalEstablishment",
				"updateLegalEstablishment",
				"activateLegalEstablishment",
				"suspendLegalEstablishment",
				"closeLegalEstablishment",
				"setRegisteredAddress",
				"registerPremise",
				"endPremise",
				"createGovernanceBody",
				"amendGovernanceBody",
				"retireGovernanceBody",
				"appointGovernanceMember",
				"changeGovernanceMembership",
				"endGovernanceMembership",
				"defineStatutoryOffice",
				"appointOfficer",
				"amendOfficerAppointment",
				"recordOfficerQualification",
				"resignOfficer",
				"removeOfficer",
				"recordOfficerDeclaration",
				"supersedeOfficerDeclaration",
				"recordOfficerDisqualification",
				"endOfficerDisqualification",
				"discloseConflict",
				"recordRecusal",
				"scheduleGovernanceMeeting",
				"issueMeetingNotice",
				"recordNoticeDelivery",
				"waiveNotice",
				"recordMeetingParticipant",
				"openMeeting",
				"recordQuorum",
				"adjournMeeting",
				"closeMeeting",
				"recordMeetingVote",
				"adoptResolution",
				"rejectResolution",
				"recordWrittenResolution",
				"supersedeResolution",
				"assignResolutionAction",
				"completeResolutionAction",
				"recordMinutesDocument",
			],
			queryNamespace: "corporate-administration",
			queries: [
				"getLegalCompany",
				"listLegalCompanies",
				"listCompanyNames",
				"findCompanyNameAsOf",
				"findCompanyJurisdictionProfileAsOf",
				"findCompanyLegalFormAsOf",
				"listCompanyIdentifiers",
				"findCompanyIdentifierAsOf",
				"findCompanyFinancialYearAsOf",
				"listCompanyActivitiesAsOf",
				"findCompanyStatusAsOf",
				"listCompaniesByStatus",
				"getCompanyCompletenessForActivation",
				"getLegalCompanyTimeline",
				"getLegalEstablishment",
				"listLegalEstablishmentsAsOf",
				"findRegisteredAddressAsOf",
				"listPremisesAsOf",
				"getGovernanceBody",
				"listGovernanceBodiesAsOf",
				"listGovernanceMembershipsAsOf",
				"listRequiredStatutoryOffices",
				"listOfficersAsOf",
				"getOfficerAppointment",
				"getOfficerVacancyStatus",
				"getOfficerEligibilityAsOf",
				"listExpiringDeclarations",
				"listActiveDisqualifications",
				"listConflictsForMatter",
				"getGovernanceMeeting",
				"listGovernanceMeetings",
				"getMeetingAttendance",
				"getMeetingQuorumStatus",
				"getResolution",
				"listResolutionsAsOf",
				"getResolutionExecutionStatus",
				"listOverdueResolutionActions",
			],
		});
		for (const runtimeOperation of [
			"reserve-idempotency",
			"append-outbox",
			"run-transaction",
			"replay-command",
		]) {
			expect(corporateAdministrationModuleManifest.owns.commands).not.toContain(
				runtimeOperation,
			);
			expect(corporateAdministrationModuleManifest.owns.queries).not.toContain(
				runtimeOperation,
			);
		}
		expect(corporateAdministrationModuleManifest.persistence.schemaOwner).toBe(
			"@afenda/db",
		);
		expect(
			corporateAdministrationModuleManifest.persistence.mutationTables,
		).toEqual([
			"ca_mutation_receipt",
			"ca_legal_company",
			"ca_company_jurisdiction_profile",
			"ca_company_name",
			"ca_company_legal_form_history",
			"ca_company_identifier",
			"ca_company_financial_year",
			"ca_company_activity",
			"ca_company_status_history",
			"ca_legal_establishment",
			"ca_establishment_status_history",
			"ca_registered_address",
			"ca_premise",
			"ca_governance_body",
			"ca_governance_membership",
			"ca_statutory_office",
			"ca_officer_appointment",
			"ca_officer_qualification",
			"ca_officer_declaration",
			"ca_officer_disqualification",
			"ca_conflict_disclosure",
			"ca_governance_meeting",
			"ca_meeting_notice",
			"ca_meeting_participant",
			"ca_meeting_quorum_result",
			"ca_meeting_vote",
			"ca_resolution",
			"ca_resolution_action",
		]);
		expect(packageRoot.CORPORATE_ADMINISTRATION_MUTATION_TABLES).toEqual([
			"ca_mutation_receipt",
			"ca_legal_company",
			"ca_company_jurisdiction_profile",
			"ca_company_name",
			"ca_company_legal_form_history",
			"ca_company_identifier",
			"ca_company_financial_year",
			"ca_company_activity",
			"ca_company_status_history",
			"ca_legal_establishment",
			"ca_establishment_status_history",
			"ca_registered_address",
			"ca_premise",
			"ca_governance_body",
			"ca_governance_membership",
			"ca_statutory_office",
			"ca_officer_appointment",
			"ca_officer_qualification",
			"ca_officer_declaration",
			"ca_officer_disqualification",
			"ca_conflict_disclosure",
			"ca_governance_meeting",
			"ca_meeting_notice",
			"ca_meeting_participant",
			"ca_meeting_quorum_result",
			"ca_meeting_vote",
			"ca_resolution",
			"ca_resolution_action",
		]);
		for (const tableName of [
			"platform_audit_log",
			"platform_domain_event",
			"ca_officer",
			"ca_share_capital",
		]) {
			expect(
				corporateAdministrationModuleManifest.persistence.mutationTables,
			).not.toContain(tableName);
			expect(
				packageRoot.CORPORATE_ADMINISTRATION_MUTATION_TABLES,
			).not.toContain(tableName);
		}
		expect(corporateAdministrationModuleManifest.events).toEqual({
			namespace: "corporate_administration",
			emits: [
				"corporate_administration.legal_company.draft_registered.v1",
				"corporate_administration.legal_company.profile_updated.v1",
				"corporate_administration.legal_company.jurisdiction_profile_set.v1",
				"corporate_administration.legal_company.name_added.v1",
				"corporate_administration.legal_company.name_superseded.v1",
				"corporate_administration.legal_company.legal_form_changed.v1",
				"corporate_administration.legal_company.identifier_registered.v1",
				"corporate_administration.legal_company.financial_year_set.v1",
				"corporate_administration.legal_company.activity_registered.v1",
				"corporate_administration.legal_company.activated.v1",
				"corporate_administration.legal_company.suspended.v1",
				"corporate_administration.legal_company.struck_off_marked.v1",
				"corporate_administration.legal_company.liquidation_entered.v1",
				"corporate_administration.legal_company.dissolved.v1",
				"corporate_administration.legal_company.restored.v1",
				"corporate_administration.legal_company.archived.v1",
				"corporate_administration.legal_establishment.registered.v1",
				"corporate_administration.legal_establishment.updated.v1",
				"corporate_administration.legal_establishment.status_changed.v1",
				"corporate_administration.registered_address.set.v1",
				"corporate_administration.premise.registered.v1",
				"corporate_administration.premise.ended.v1",
				"corporate_administration.governance_body.created.v1",
				"corporate_administration.governance_body.amended.v1",
				"corporate_administration.governance_body.retired.v1",
				"corporate_administration.governance_membership.appointed.v1",
				"corporate_administration.governance_membership.changed.v1",
				"corporate_administration.governance_membership.ended.v1",
				"corporate_administration.statutory_office.defined.v1",
				"corporate_administration.officer.appointed.v1",
				"corporate_administration.officer.appointment_amended.v1",
				"corporate_administration.officer.qualification_recorded.v1",
				"corporate_administration.officer.resigned.v1",
				"corporate_administration.officer.removed.v1",
				"corporate_administration.officer.declaration_recorded.v1",
				"corporate_administration.officer.declaration_superseded.v1",
				"corporate_administration.officer.disqualified.v1",
				"corporate_administration.officer.disqualification_ended.v1",
				"corporate_administration.conflict.disclosed.v1",
				"corporate_administration.conflict.recusal_recorded.v1",
				"corporate_administration.governance_meeting.scheduled.v1",
				"corporate_administration.meeting_notice.issued.v1",
				"corporate_administration.meeting_notice.delivered.v1",
				"corporate_administration.meeting_notice.waived.v1",
				"corporate_administration.meeting_participant.recorded.v1",
				"corporate_administration.governance_meeting.opened.v1",
				"corporate_administration.governance_meeting.quorum_recorded.v1",
				"corporate_administration.governance_meeting.adjourned.v1",
				"corporate_administration.governance_meeting.closed.v1",
				"corporate_administration.meeting_vote.recorded.v1",
				"corporate_administration.resolution.adopted.v1",
				"corporate_administration.resolution.rejected.v1",
				"corporate_administration.resolution.superseded.v1",
				"corporate_administration.resolution.minutes_recorded.v1",
				"corporate_administration.resolution.action_assigned.v1",
				"corporate_administration.resolution.action_completed.v1",
			],
			consumes: [],
		});
		expect(corporateAdministrationModuleManifest.permissions).toEqual({
			namespace: "corporate_administration",
			codes: [
				"corporate_administration.company.read",
				"corporate_administration.company.manage",
				"corporate_administration.establishment.manage",
				"corporate_administration.governance.read",
				"corporate_administration.governance.manage",
				"corporate_administration.officer.read",
				"corporate_administration.officer.manage",
				"corporate_administration.officer_compliance.read",
				"corporate_administration.officer_compliance.manage",
				"corporate_administration.meeting.read",
				"corporate_administration.meeting.manage",
				"corporate_administration.resolution.read",
				"corporate_administration.resolution.manage",
			],
		});
		expect(corporateAdministrationModuleManifest.authorization).toEqual({
			commands: {
				registerLegalCompanyDraft: "corporate_administration.company.manage",
				updateLegalCompanyProfile: "corporate_administration.company.manage",
				addCompanyName: "corporate_administration.company.manage",
				supersedeCompanyName: "corporate_administration.company.manage",
				retireCompanyName: "corporate_administration.company.manage",
				setCompanyJurisdictionProfile:
					"corporate_administration.company.manage",
				supersedeCompanyJurisdictionProfile:
					"corporate_administration.company.manage",
				setCompanyLegalForm: "corporate_administration.company.manage",
				supersedeCompanyLegalForm: "corporate_administration.company.manage",
				registerCompanyIdentifier: "corporate_administration.company.manage",
				supersedeCompanyIdentifier: "corporate_administration.company.manage",
				retireCompanyIdentifier: "corporate_administration.company.manage",
				setCompanyFinancialYear: "corporate_administration.company.manage",
				registerCompanyActivity: "corporate_administration.company.manage",
				endCompanyActivity: "corporate_administration.company.manage",
				activateLegalCompany: "corporate_administration.company.manage",
				suspendLegalCompany: "corporate_administration.company.manage",
				markCompanyStruckOff: "corporate_administration.company.manage",
				enterLiquidation: "corporate_administration.company.manage",
				dissolveLegalCompany: "corporate_administration.company.manage",
				restoreLegalCompany: "corporate_administration.company.manage",
				archiveLegalCompany: "corporate_administration.company.manage",
				registerLegalEstablishment:
					"corporate_administration.establishment.manage",
				updateLegalEstablishment:
					"corporate_administration.establishment.manage",
				activateLegalEstablishment:
					"corporate_administration.establishment.manage",
				suspendLegalEstablishment:
					"corporate_administration.establishment.manage",
				closeLegalEstablishment:
					"corporate_administration.establishment.manage",
				setRegisteredAddress: "corporate_administration.establishment.manage",
				registerPremise: "corporate_administration.establishment.manage",
				endPremise: "corporate_administration.establishment.manage",
				createGovernanceBody: "corporate_administration.governance.manage",
				amendGovernanceBody: "corporate_administration.governance.manage",
				retireGovernanceBody: "corporate_administration.governance.manage",
				appointGovernanceMember: "corporate_administration.governance.manage",
				changeGovernanceMembership:
					"corporate_administration.governance.manage",
				endGovernanceMembership: "corporate_administration.governance.manage",
				defineStatutoryOffice: "corporate_administration.officer.manage",
				appointOfficer: "corporate_administration.officer.manage",
				amendOfficerAppointment: "corporate_administration.officer.manage",
				recordOfficerQualification: "corporate_administration.officer.manage",
				resignOfficer: "corporate_administration.officer.manage",
				removeOfficer: "corporate_administration.officer.manage",
				recordOfficerDeclaration:
					"corporate_administration.officer_compliance.manage",
				supersedeOfficerDeclaration:
					"corporate_administration.officer_compliance.manage",
				recordOfficerDisqualification:
					"corporate_administration.officer_compliance.manage",
				endOfficerDisqualification:
					"corporate_administration.officer_compliance.manage",
				discloseConflict: "corporate_administration.officer_compliance.manage",
				recordRecusal: "corporate_administration.officer_compliance.manage",
				scheduleGovernanceMeeting: "corporate_administration.meeting.manage",
				issueMeetingNotice: "corporate_administration.meeting.manage",
				recordNoticeDelivery: "corporate_administration.meeting.manage",
				waiveNotice: "corporate_administration.meeting.manage",
				recordMeetingParticipant: "corporate_administration.meeting.manage",
				openMeeting: "corporate_administration.meeting.manage",
				recordQuorum: "corporate_administration.meeting.manage",
				adjournMeeting: "corporate_administration.meeting.manage",
				closeMeeting: "corporate_administration.meeting.manage",
				recordMeetingVote: "corporate_administration.resolution.manage",
				adoptResolution: "corporate_administration.resolution.manage",
				rejectResolution: "corporate_administration.resolution.manage",
				recordWrittenResolution: "corporate_administration.resolution.manage",
				supersedeResolution: "corporate_administration.resolution.manage",
				assignResolutionAction: "corporate_administration.resolution.manage",
				completeResolutionAction: "corporate_administration.resolution.manage",
				recordMinutesDocument: "corporate_administration.resolution.manage",
			},
			queries: {
				getLegalCompany: "corporate_administration.company.read",
				listLegalCompanies: "corporate_administration.company.read",
				listCompanyNames: "corporate_administration.company.read",
				findCompanyNameAsOf: "corporate_administration.company.read",
				findCompanyJurisdictionProfileAsOf:
					"corporate_administration.company.read",
				findCompanyLegalFormAsOf: "corporate_administration.company.read",
				listCompanyIdentifiers: "corporate_administration.company.read",
				findCompanyIdentifierAsOf: "corporate_administration.company.read",
				findCompanyFinancialYearAsOf: "corporate_administration.company.read",
				listCompanyActivitiesAsOf: "corporate_administration.company.read",
				findCompanyStatusAsOf: "corporate_administration.company.read",
				listCompaniesByStatus: "corporate_administration.company.read",
				getCompanyCompletenessForActivation:
					"corporate_administration.company.read",
				getLegalCompanyTimeline: "corporate_administration.company.read",
				getLegalEstablishment: "corporate_administration.company.read",
				listLegalEstablishmentsAsOf: "corporate_administration.company.read",
				findRegisteredAddressAsOf: "corporate_administration.company.read",
				listPremisesAsOf: "corporate_administration.company.read",
				getGovernanceBody: "corporate_administration.governance.read",
				listGovernanceBodiesAsOf: "corporate_administration.governance.read",
				listGovernanceMembershipsAsOf:
					"corporate_administration.governance.read",
				listRequiredStatutoryOffices: "corporate_administration.officer.read",
				listOfficersAsOf: "corporate_administration.officer.read",
				getOfficerAppointment: "corporate_administration.officer.read",
				getOfficerVacancyStatus: "corporate_administration.officer.read",
				getOfficerEligibilityAsOf:
					"corporate_administration.officer_compliance.read",
				listExpiringDeclarations:
					"corporate_administration.officer_compliance.read",
				listActiveDisqualifications:
					"corporate_administration.officer_compliance.read",
				listConflictsForMatter:
					"corporate_administration.officer_compliance.read",
				getGovernanceMeeting: "corporate_administration.meeting.read",
				listGovernanceMeetings: "corporate_administration.meeting.read",
				getMeetingAttendance: "corporate_administration.meeting.read",
				getMeetingQuorumStatus: "corporate_administration.meeting.read",
				getResolution: "corporate_administration.resolution.read",
				listResolutionsAsOf: "corporate_administration.resolution.read",
				getResolutionExecutionStatus:
					"corporate_administration.resolution.read",
				listOverdueResolutionActions:
					"corporate_administration.resolution.read",
			},
		});
		expect(corporateAdministrationModuleManifest.moduleDependencies).toEqual({
			required: [],
		});
		expect(
			corporateAdministrationModuleManifest.optionalIntegratesWith,
		).toEqual([]);
	});

	it("does not declare planned external module or service dependencies", () => {
		const serializedManifest = JSON.stringify(
			corporateAdministrationModuleManifest,
		);

		for (const forbiddenDependency of [
			"master-data",
			"accounting",
			"payments",
			"human-resources",
			"document storage",
			"signature service",
			"search",
			"reminders",
			"compliance rule provider",
		]) {
			expect(serializedManifest).not.toContain(forbiddenDependency);
		}
	});

	it("publishes only real files through the approved exports map", () => {
		const packageJson = JSON.parse(
			readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
		) as {
			exports: Record<string, { types: string; default: string }>;
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
		};

		expect(Object.keys(packageJson.exports).sort()).toEqual([
			".",
			"./adapters/drizzle",
			"./module-manifest",
			"./testing",
		]);
		expect(packageJson.exports).not.toHaveProperty("./adapters/memory");
		for (const target of Object.values(packageJson.exports)) {
			expect(target.types).toBe(target.default);
			expect(
				statSync(path.join(packageDirectory, target.default)).isFile(),
			).toBe(true);
		}
		expect(packageJson.dependencies).toEqual({
			"@afenda/audit": "workspace:*",
			"@afenda/db": "workspace:*",
			"@afenda/errors": "workspace:*",
			"server-only": "catalog:",
			zod: "catalog:",
		});
		expect(packageJson.devDependencies).toEqual({
			"@afenda/config": "workspace:*",
			"@afenda/testing": "workspace:*",
			"@types/node": "catalog:",
			typescript: "catalog:",
			vitest: "catalog:",
		});

		const shippedSource = sourceFiles(sourceDirectory)
			.map((file) => readFileSync(file, "utf8"))
			.join("\n");
		for (const dependency of Object.keys(packageJson.dependencies)) {
			expect(dependencyImportPattern(dependency).test(shippedSource)).toBe(
				true,
			);
		}
		for (const forbiddenDependency of [
			"@afenda/master-data",
			"@afenda/accounting",
			"@afenda/payments",
			"@afenda/human-resources",
			"@afenda/events",
			"@afenda/documents",
			"@afenda/search",
			"@afenda/notifications",
			"@afenda/ui-system",
			"drizzle-orm",
			"next",
			"react",
			"react-dom",
			"express",
			"fastify",
			"hono",
			"@hono/node-server",
			"@trpc/server",
			"@aws-sdk/client-s3",
			"@google-cloud/storage",
			"@azure/storage-blob",
			"minio",
			"docusign-esign",
			"@docusign/esign",
			"hellosign-sdk",
			"algoliasearch",
			"@elastic/elasticsearch",
			"meilisearch",
			"typesense",
			"lucide-react",
		]) {
			expect(packageJson.dependencies).not.toHaveProperty(forbiddenDependency);
			expect(packageJson.devDependencies).not.toHaveProperty(
				forbiddenDependency,
			);
			expect(
				dependencyImportPattern(forbiddenDependency).test(shippedSource),
			).toBe(false);
		}
		expect(existsSync(path.join(sourceDirectory, "ports.ts"))).toBe(true);
		expect(existsSync(path.join(sourceDirectory, "production-ports.ts"))).toBe(
			true,
		);
		expect(
			existsSync(path.join(sourceDirectory, "adapters", "drizzle", "index.ts")),
		).toBe(true);
	});

	it("does not import business modules, application frameworks, UI, event bus, or external service SDKs", () => {
		const forbiddenImportPatterns = [
			/@afenda\/(?:master-data|accounting|payments|human-resources)(?:\/[^"']*)?/,
			/@afenda\/(?:events|search|notifications|ui-system)(?:\/[^"']*)?/,
			/(?:^|\/)(?:next|react|react-dom)(?:\/[^"']*)?/,
			/(?:express|fastify|hono|@hono\/[^"']+|@trpc\/[^"']+)/,
			/(?:@aws-sdk\/client-s3|@google-cloud\/storage|@azure\/storage-blob|minio|cloudinary|firebase\/storage)/,
			/(?:docusign-esign|@docusign\/[^"']+|hellosign-sdk|dropbox-sign|adobe-sign)/,
			/(?:algoliasearch|@elastic\/elasticsearch|meilisearch|typesense|@upstash\/vector)/,
		];
		const findings = normalizedRelativeSourceFiles().flatMap((relativeFile) => {
			const source = readPackageSource(relativeFile);
			const imports = source.matchAll(
				/(?:from\s+["']([^"']+)["']|import\s+["']([^"']+)["'])/g,
			);
			return Array.from(imports).flatMap((match) => {
				const specifier = match[1] ?? match[2] ?? "";
				return forbiddenImportPatterns.some((pattern) =>
					pattern.test(specifier),
				)
					? [`${relativeFile}: ${specifier}`]
					: [];
			});
		});

		expect(findings).toEqual([]);
	});

	it("allows database imports only in approved infrastructure files", () => {
		const findings = normalizedRelativeSourceFiles().flatMap((relativeFile) => {
			const source = readPackageSource(relativeFile);
			const hasDatabaseImport =
				/from\s+["']@afenda\/db(?:\/[^"']*)?["']/.test(source) ||
				/from\s+["']drizzle-orm(?:\/[^"']*)?["']/.test(source);
			return hasDatabaseImport && !approvedDatabaseImportFiles.has(relativeFile)
				? [relativeFile]
				: [];
		});

		expect(findings).toEqual([]);
	});

	it("does not expose raw Drizzle or database client types from the root export", () => {
		const forbiddenRootExports = [
			"db",
			"Database",
			"DbSchema",
			"NeonHttpSql",
			"NeonQueryFunction",
			"AnyPgTable",
			"PgTable",
			"PgColumn",
			"Drizzle",
			"DrizzleCorporateAdministrationIdempotencyPort",
			"DrizzleCorporateAdministrationOutboxPort",
			"DrizzleCorporateAdministrationTransactionPort",
		];

		for (const exportName of forbiddenRootExports) {
			expect(packageRoot).not.toHaveProperty(exportName);
		}
		const rootSource = readPackageSource("src/index.ts");
		expect(rootSource).not.toMatch(/from\s+["']@afenda\/db(?:\/[^"']*)?["']/);
		expect(rootSource).not.toMatch(/from\s+["']drizzle-orm(?:\/[^"']*)?["']/);
	});

	it("keeps production runtime composition free of adapter construction and environment access", () => {
		const productionSource = readFileSync(
			path.join(sourceDirectory, "production-ports.ts"),
			"utf8",
		);

		expect(productionSource).toContain(
			"createCorporateAdministrationProductionRuntime",
		);
		expect(productionSource).toContain(
			"CorporateAdministrationProductionRuntimeDependencies",
		);
		for (const forbidden of [
			"process.env",
			"@afenda/db",
			"@afenda/audit",
			"createDrizzle",
			"createMemory",
			"Inline",
			"allowAll",
			"globalThis",
			"singleton",
			"new Pool",
			"neon(",
		]) {
			expect(productionSource).not.toContain(forbidden);
		}
	});

	it("requires explicit adapter dependencies and keeps singleton handles out of app composition", () => {
		const appCompositionSource = readFileSync(
			path.join(
				repositoryDirectory,
				"apps/web/lib/erp/corporate-administration-runtime.ts",
			),
			"utf8",
		);
		expect(appCompositionSource).toContain(
			"dependencies: CorporateAdministrationAppRuntimeDependencies",
		);
		expect(appCompositionSource).not.toContain('from "@afenda/db"');
		expect(appCompositionSource).not.toContain('from "@afenda/audit"');
		expect(appCompositionSource).toContain("createPendingDomainEventAppender");
		expect(appCompositionSource).toContain(
			"dependencies.executeOutboxTransaction",
		);
		expect(appCompositionSource).not.toContain("outboxAppender:");

		for (const relativeFile of [
			"src/adapters/drizzle/idempotency.ts",
			"src/adapters/drizzle/outbox.ts",
			"src/adapters/drizzle/transaction.ts",
		]) {
			const source = readPackageSource(relativeFile);
			expect(source).not.toMatch(/\bdb\s*\./);
			expect(source).toContain("dependencies:");
		}
		expect(readPackageSource("src/adapters/drizzle/audit.ts")).not.toContain(
			"createDrizzleAuditStore",
		);
	});

	it("keeps runtime ports limited to CA-0.4 infrastructure", () => {
		const portsSource = readFileSync(
			path.join(sourceDirectory, "ports.ts"),
			"utf8",
		);

		expect(portsSource).toContain("export type ClockPort");
		expect(portsSource).toContain("clock: ClockPort");
		expect(portsSource).toContain(
			"transaction: CorporateAdministrationTransactionPort",
		);
		expect(portsSource).toContain(
			"idempotency: CorporateAdministrationIdempotencyPort",
		);
		expect(portsSource).toContain(
			"audit: CorporateAdministrationAuditFactPort",
		);
		expect(portsSource).toContain("CorporateAdministrationAuditFactInput");
		expect(portsSource).toContain("Promise<Result<{ id: string }>>");
		expect(portsSource).toContain("outbox: CorporateAdministrationOutboxPort");
		expect(portsSource).toContain(
			"append(\n\t\tevents: readonly CorporateAdministrationPendingEvent[]",
		);
		const runtimePortsBlock = portsSource.match(
			/export type CorporateAdministrationRuntimePorts = Readonly<\{[\s\S]*?\}>;/,
		)?.[0];
		expect(runtimePortsBlock).toBeDefined();
		for (const forbiddenPort of [
			"PartyReferencePort",
			"TaxRegistrationReadPort",
			"ReferenceDataPort",
			"ProtectedIdentityPort",
			"ApprovalDecisionPort",
			"DocumentObjectPort",
			"SearchProjectionPort",
			"ReminderDispatchPort",
			"AccountingReferencePort",
			"PaymentsReferencePort",
			"SignatureEnvelopePort",
			"ComplianceRuleSourcePort",
			"Publisher",
			"Dispatcher",
			"RetryWorker",
			"QueueClient",
			"RegulatoryAudit",
		]) {
			expect(runtimePortsBlock).not.toContain(forbiddenPort);
		}
	});

	it("does not create legacy business implementation directories", () => {
		for (const directory of ["aggregates", "commands", "queries", "actions"]) {
			const target = path.join(sourceDirectory, directory);
			expect(existsSync(target) ? sourceFiles(target) : []).toEqual([]);
		}
	});

	it("keeps CA business capability source paths inside approved package homes", () => {
		const prohibitedExecutableSegments = [
			"legal-company",
			"legal-establishment",
			"officer",
			"capital",
			"ownership",
			"assets",
			"banking",
			"filing",
		];
		const approvedCompanyPaths = [
			"src/company/commands/durable-command.ts",
			"src/company/commands/add-company-name.ts",
			"src/company/commands/change-legal-company-status.ts",
			"src/company/commands/end-company-activity.ts",
			"src/company/commands/index.ts",
			"src/company/commands/register-company-activity.ts",
			"src/company/commands/register-company-identifier.ts",
			"src/company/commands/register-legal-company-draft.ts",
			"src/company/commands/retire-company-identifier.ts",
			"src/company/commands/retire-company-name.ts",
			"src/company/commands/set-company-financial-year.ts",
			"src/company/commands/set-company-jurisdiction-profile.ts",
			"src/company/commands/set-company-legal-form.ts",
			"src/company/commands/supersede-company-identifier.ts",
			"src/company/commands/supersede-company-jurisdiction-profile.ts",
			"src/company/commands/supersede-company-legal-form.ts",
			"src/company/commands/supersede-company-name.ts",
			"src/company/commands/update-legal-company-profile.ts",
			"src/company/queries/find-company-financial-year-as-of.ts",
			"src/company/queries/find-company-identifier-as-of.ts",
			"src/company/queries/find-company-jurisdiction-profile-as-of.ts",
			"src/company/queries/find-company-legal-form-as-of.ts",
			"src/company/queries/find-company-name-as-of.ts",
			"src/company/queries/find-company-status-as-of.ts",
			"src/company/queries/get-company-completeness-for-activation.ts",
			"src/company/queries/get-legal-company-timeline.ts",
			"src/company/queries/get-legal-company.ts",
			"src/company/queries/index.ts",
			"src/company/queries/list-companies-by-status.ts",
			"src/company/queries/list-company-activities-as-of.ts",
			"src/company/queries/list-company-identifiers.ts",
			"src/company/queries/list-company-names.ts",
			"src/company/queries/list-legal-companies.ts",
		];
		const approvedGovernancePaths = [
			"src/governance/commands/index.ts",
			"src/governance/index.ts",
			"src/governance/queries/index.ts",
			"src/governance/rules.ts",
			"src/governance/schemas.ts",
			"src/governance/store.ts",
			"src/governance/types.ts",
		];
		const findings = normalizedRelativeSourceFiles().flatMap((relativeFile) => {
			const segments = relativeFile.split("/");
			const isRootCommandOrQuery =
				segments.length > 1 &&
				(segments[1] === "commands" || segments[1] === "queries");
			const isUnexpectedCompanyCommandOrQuery =
				relativeFile.startsWith("src/company/commands/") ||
				relativeFile.startsWith("src/company/queries/")
					? !approvedCompanyPaths.includes(relativeFile)
					: false;
			const isUnexpectedGovernancePath = relativeFile.startsWith(
				"src/governance/",
			)
				? !approvedGovernancePaths.includes(relativeFile)
				: false;
			return isRootCommandOrQuery ||
				isUnexpectedCompanyCommandOrQuery ||
				isUnexpectedGovernancePath ||
				prohibitedExecutableSegments.some((segment) =>
					segments.includes(segment),
				)
				? [relativeFile]
				: [];
		});

		expect(findings).toEqual([]);
	});

	it("keeps Corporate Administration implementation files in approved homes", () => {
		for (const rootFile of [
			"legal-company.ts",
			"drizzle-legal-company-store.ts",
			"drizzle-idempotency.ts",
			"memory-legal-company-store.ts",
		]) {
			expect(existsSync(path.join(sourceDirectory, rootFile))).toBe(false);
		}

		expect(existsSync(path.join(sourceDirectory, "company", "index.ts"))).toBe(
			true,
		);
		expect(
			existsSync(
				path.join(sourceDirectory, "adapters", "drizzle", "company.ts"),
			),
		).toBe(true);
		expect(
			existsSync(
				path.join(sourceDirectory, "adapters", "drizzle", "idempotency.ts"),
			),
		).toBe(true);
		expect(
			existsSync(
				path.join(sourceDirectory, "adapters", "drizzle", "transaction.ts"),
			),
		).toBe(true);
		const transactionAdapterSource = readFileSync(
			path.join(sourceDirectory, "adapters", "drizzle", "transaction.ts"),
			"utf8",
		);
		expect(transactionAdapterSource).toContain(
			"CorporateAdministrationNeonTransactionExecutor",
		);
		expect(transactionAdapterSource).toContain("this.#execute");
		expect(transactionAdapterSource).not.toContain("runNeonHttpTransaction");
		expect(transactionAdapterSource).toContain(
			'readonly nesting = "prohibited"',
		);
		expect(transactionAdapterSource).toContain('effect === "rollback"');
		expect(transactionAdapterSource).toContain("statementCount");
		expect(transactionAdapterSource).not.toContain("db.transaction");
		expect(transactionAdapterSource).not.toContain("AnyPgTransaction");
		expect(transactionAdapterSource).not.toContain("savepoint");
		const idempotencyAdapterSource = readFileSync(
			path.join(sourceDirectory, "adapters", "drizzle", "idempotency.ts"),
			"utf8",
		);
		expect(idempotencyAdapterSource).toContain('status: "in_progress"');
		expect(idempotencyAdapterSource).toContain('status: "completed"');
		expect(idempotencyAdapterSource).toContain('status: "released"');
		expect(idempotencyAdapterSource).toContain("recordVersion");
		expect(idempotencyAdapterSource).toContain("completedAt");
		expect(idempotencyAdapterSource).toContain(".onConflictDoNothing()");
		expect(idempotencyAdapterSource).not.toContain(".onConflictDoUpdate");
		expect(idempotencyAdapterSource).not.toMatch(
			/update\\(caMutationReceipt\\)[\\s\\S]*fingerprint:/,
		);
		expect(
			idempotencyAdapterSource.indexOf(".insert(caMutationReceipt)"),
		).toBeLessThan(idempotencyAdapterSource.indexOf(".select()"));
		for (const requiredPredicate of [
			"eq(caMutationReceipt.organizationId, scope.organizationId)",
			"eq(caMutationReceipt.commandId, scope.commandId)",
			"eq(caMutationReceipt.idempotencyKey, scope.idempotencyKey)",
			"eq(caMutationReceipt.fingerprint, input.fingerprint)",
			'eq(caMutationReceipt.status, "in_progress")',
		]) {
			expect(idempotencyAdapterSource).toContain(requiredPredicate);
		}
		expect(idempotencyAdapterSource).toContain(
			"eq(caMutationReceipt.reservationToken, input.reservationToken)",
		);
		expect(idempotencyAdapterSource).not.toMatch(
			/(?:new Map|process-local|mutex|lock)/i,
		);
		expect(idempotencyAdapterSource).not.toContain('status: "reserved"');
		expect(
			existsSync(path.join(sourceDirectory, "adapters", "drizzle", "audit.ts")),
		).toBe(true);
		const auditAdapterSource = readFileSync(
			path.join(sourceDirectory, "adapters", "drizzle", "audit.ts"),
			"utf8",
		);
		expect(auditAdapterSource).toContain("oldValue: null");
		expect(auditAdapterSource).toContain("newValue: null");
		expect(auditAdapterSource).not.toContain("ca_audit_fact");
		expect(
			existsSync(
				path.join(sourceDirectory, "adapters", "drizzle", "outbox.ts"),
			),
		).toBe(true);
		const outboxAdapterSource = readFileSync(
			path.join(sourceDirectory, "adapters", "drizzle", "outbox.ts"),
			"utf8",
		);
		expect(outboxAdapterSource).not.toContain("platformDomainEvent");
		expect(outboxAdapterSource).not.toContain("ca_outbox_event");
		expect(outboxAdapterSource).toContain("this.#appender.createStatement");
		expect(outboxAdapterSource).toContain("this.#appender.append");
		expect(outboxAdapterSource).toContain("deduplicationKey: event.eventId");
		expect(outboxAdapterSource).toContain("payload: event.payload");
		for (const mappedFact of [
			"organizationId: event.organizationId",
			"type: event.eventType",
			"aggregateType: event.aggregateType",
			"aggregateId: event.aggregateId",
			"aggregateVersion: event.aggregateVersion",
			"occurredAt: event.occurredAt",
			"actorUserId: event.actorUserId",
			"correlationId: event.correlationId",
			"causationId: event.causationId",
		]) {
			expect(outboxAdapterSource).toContain(mappedFact);
		}
	});

	it("does not define Drizzle schema inside the CA package", () => {
		const findings = sourceFiles(sourceDirectory).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return /(?:drizzle-orm\/pg-core|pgTable\s*\(|mysqlTable\s*\(|sqliteTable\s*\()/.test(
				source,
			)
				? [path.relative(packageDirectory, file)]
				: [];
		});

		expect(findings).toEqual([]);
	});

	it("keeps CA infrastructure test cleanup scoped and non-destructive", () => {
		const cleanupSource = readFileSync(
			path.join(packageDirectory, "__tests__", "helpers", "neon-cleanup.ts"),
			"utf8",
		);
		const cleanupFunctionStart = cleanupSource.indexOf(
			"export async function cleanupCorporateAdministrationInfrastructureTestData",
		);
		const cleanupFunctionEnd = cleanupSource.indexOf(
			"export async function countCorporateAdministrationMutationReceipts",
			cleanupFunctionStart,
		);
		expect(cleanupFunctionStart).toBeGreaterThanOrEqual(0);
		expect(cleanupFunctionEnd).toBeGreaterThan(cleanupFunctionStart);
		const cleanupFunctionSource = cleanupSource.slice(
			cleanupFunctionStart,
			cleanupFunctionEnd,
		);

		for (const tableName of [
			"platform_domain_event",
			"platform_audit_log",
			"ca_mutation_receipt",
		]) {
			expect(cleanupSource).toContain(tableName);
		}
		for (const scopedPredicate of [
			"eq(platformDomainEvent.organizationId, scopedOrganizationId)",
			"eq(platformDomainEvent.sourceModule, CORPORATE_ADMINISTRATION_MODULE)",
			"eq(platformAuditLog.organizationId, scopedOrganizationId)",
			"eq(platformAuditLog.module, CORPORATE_ADMINISTRATION_MODULE)",
			"eq(caMutationReceipt.organizationId, scopedOrganizationId)",
		]) {
			expect(cleanupSource).toContain(scopedPredicate);
		}
		expect(cleanupSource).not.toMatch(/\btruncate\b/i);
		expect(cleanupSource).not.toMatch(
			/disable\s+trigger|session_replication_role/i,
		);
		expect(cleanupFunctionSource).not.toMatch(/catch\s*\(/);
	});

	it("contains no business, persistence, app, or placeholder implementation", () => {
		const forbiddenImports =
			/from\s+["'](?:pg|postgres|postgres-js|mysql2|better-sqlite3|@neondatabase\/serverless|next(?:\/[^"']*)?|react|react-dom|express|fastify|hono|@hono\/[^"']+|@trpc\/[^"']+|@tanstack\/react-query|@radix-ui\/[^"']+|lucide-react|apps\/|@\/|@afenda\/(?:master-data|accounting|payments|human-resources|events|search|notifications|ui-system)|@afenda\/[^"']+\/src\/)["']/;
		const forbiddenApplicationSurface =
			/(?:["']use server["']|NextResponse|NextRequest|\bResponse\b|\bRequest\b|ActionResult|actionOk|actionFail|ServerAction|\.tsx\b|jsx|@afenda\/ui-system)/;
		const forbiddenImplementation = new RegExp(
			["TODO", "NotImplemented", "throw new Error", "stub", "shim"].join("|"),
			"i",
		);

		const findings = sourceFiles(sourceDirectory).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			const relativeFile = path.relative(packageDirectory, file);
			const normalizedFile = relativeFile.replaceAll("\\", "/");
			const isDrizzleAdapter = normalizedFile.startsWith(
				"src/adapters/drizzle/",
			);
			const forbiddenPersistenceImport =
				/from\s+["'](?:drizzle-orm|@afenda\/db)["']/.test(source) &&
				!isDrizzleAdapter;
			return forbiddenPersistenceImport ||
				forbiddenImports.test(source) ||
				forbiddenApplicationSurface.test(source) ||
				forbiddenImplementation.test(source)
				? [relativeFile]
				: [];
		});

		expect(findings).toEqual([]);
	});
});
