import type { Result } from "@afenda/errors";
import type {
	PriorEmployerYtd,
	StatutoryProfile,
	StatutoryProfileListPage,
	StatutoryReliefDeclaration,
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesStatutoryProfileId,
} from "../../kernel/identity/brands";
import type {
	RegionalMinimumWageZone,
	StatutoryJurisdictionCode,
	TaxResidencyStatus,
} from "./status";

/**
 * Persistence contract for D0 statutory-fact capture.
 *
 * This feature owns its narrow persistence contract. Supersession of the open
 * profile segment and the new-segment insert are one store operation so the
 * active-identity partial unique index can never see two open rows.
 */
export interface StatutoryProfileUpsertRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	dependantCount: number;
	effectiveFrom: string;
	employeeId: HumanResourcesEmployeeId;
	employeeProvidentFundNumber: string | null;
	expatriate: boolean;
	jurisdictionCode: StatutoryJurisdictionCode;
	minimumWageZone: RegionalMinimumWageZone | null;
	nationalityCountryCode: string;
	organizationId: string;
	reliefDeclarations: StatutoryReliefDeclaration[];
	reliefDeclarationVersion: string;
	socialInsuranceBookNumber: string | null;
	socialSecurityNumber: string | null;
	taxFileNumber: string | null;
	taxResidencyStatus: TaxResidencyStatus;
}

export interface IdempotentStatutoryProfileRecord {
	createRequestFingerprint: string;
	profile: StatutoryProfile;
}

export interface PriorEmployerYtdRecordInput {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	currencyCode: string;
	employeeId: HumanResourcesEmployeeId;
	grossAmount: string;
	jurisdictionCode: StatutoryJurisdictionCode;
	organizationId: string;
	priorEmployerName: string | null;
	recordedOn: string;
	statutoryContributionAmount: string;
	taxWithheldAmount: string;
	taxYear: number;
}

export interface IdempotentPriorEmployerYtdRecord {
	createRequestFingerprint: string;
	record: PriorEmployerYtd;
}

export interface HumanResourcesStatutoryProfileStore {
	findPriorEmployerYtdByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPriorEmployerYtdRecord | null>>;

	findPriorEmployerYtdByTaxYear: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		taxYear: number;
		jurisdictionCode: StatutoryJurisdictionCode;
	}) => Promise<Result<PriorEmployerYtd | null>>;

	findStatutoryProfileByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentStatutoryProfileRecord | null>>;

	getStatutoryProfileAsOf: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}) => Promise<Result<StatutoryProfile | null>>;

	getStatutoryProfileById: (input: {
		organizationId: string;
		statutoryProfileId: HumanResourcesStatutoryProfileId;
	}) => Promise<Result<StatutoryProfile | null>>;

	listPriorEmployerYtd: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		taxYear?: number | undefined;
	}) => Promise<Result<PriorEmployerYtd[]>>;

	listStatutoryProfiles: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		jurisdictionCode?: StatutoryJurisdictionCode | undefined;
		statutoryProfileId?: HumanResourcesStatutoryProfileId | undefined;
	}) => Promise<Result<StatutoryProfileListPage>>;

	recordPriorEmployerYtd: (
		record: PriorEmployerYtdRecordInput,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PriorEmployerYtd>>;

	upsertStatutoryProfile: (
		record: StatutoryProfileUpsertRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<StatutoryProfile>>;
}
