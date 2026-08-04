import type { Result } from "@afenda/errors";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../../kernel/authorization/authorization";
import type {
	AuthorityMandateId,
	LegalCompanyId,
	OfficerAppointmentId,
	OrganizationId,
	ResolutionId,
	UserId,
} from "../../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../../kernel/dates";
import type { CanonicalDecimal } from "../../kernel/decimals";
import type { CorporateAdministrationCommandOptions } from "../../kernel/execution/command-options";
import type {
	CorporateAdministrationTransactionContext,
	PartyReferencePort,
} from "../../kernel/execution/ports";
import type { OpaqueCursor } from "../../kernel/pagination";
import type { LegalCompanyReferencePort } from "../company/capabilities";
import type {
	AuthorityGrantedByType,
	AuthorityMandate,
	AuthorityMandateListPage,
	AuthorityMandateType,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type GrantAuthorityMandateStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		mandateType: AuthorityMandateType;
		holderPartyId: string | null;
		holderOfficerAppointmentId: OfficerAppointmentId | null;
		grantedByType: AuthorityGrantedByType;
		grantingResolutionId: ResolutionId | null;
		scopeDescription: string;
		monetaryLimitAmount: CanonicalDecimal | null;
		monetaryLimitCurrencyCode: string | null;
		jurisdictionCode: string | null;
		protectedAuthority: boolean;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedCompanyVersion: number;
	}>;

export type AmendAuthorityMandateStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		authorityMandateId: AuthorityMandateId;
		scopeDescription: string;
		monetaryLimitAmount: CanonicalDecimal | null;
		monetaryLimitCurrencyCode: string | null;
		jurisdictionCode: string | null;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type RevokeAuthorityMandateStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		authorityMandateId: AuthorityMandateId;
		revokedOn: CanonicalDate;
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type AuthorityMandatesAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	mandateType?: AuthorityMandateType | undefined;
	holderPartyId?: string | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
}>;

export interface AuthorityMandateStore {
	amendAuthorityMandate: (
		input: AmendAuthorityMandateStoreInput,
	) => Promise<Result<AuthorityMandate>>;
	getAuthorityMandate: (input: {
		organizationId: OrganizationId;
		authorityMandateId: AuthorityMandateId;
	}) => Promise<Result<AuthorityMandate | null>>;
	grantAuthorityMandate: (
		input: GrantAuthorityMandateStoreInput,
	) => Promise<Result<AuthorityMandate>>;
	listAuthorityMandatesAsOf: (
		input: AuthorityMandatesAsOfQuery,
	) => Promise<Result<AuthorityMandateListPage>>;
	revokeAuthorityMandate: (
		input: RevokeAuthorityMandateStoreInput,
	) => Promise<Result<AuthorityMandate>>;
}

export type OfficerAppointmentReferencePort = Readonly<{
	getOfficerAppointmentReference: (input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}) => Promise<Result<{ id: OfficerAppointmentId; status: string } | null>>;
}>;

export type AuthorityReferencePort = Readonly<{
	validateSourceDocument: (input: {
		organizationId: OrganizationId;
		sourceDocumentId: string;
	}) => Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

export type AuthorityCommandDependencies =
	CorporateAdministrationApprovalVerificationDependencies &
		Readonly<{
			companyStore: LegalCompanyReferencePort;
			authorityStore: AuthorityMandateStore;
			officerAppointments: OfficerAppointmentReferencePort;
			referenceData: AuthorityReferencePort;
			partyReferences: PartyReferencePort;
		}>;

export type AuthorityQueryDependencies = Readonly<{
	authorityStore: AuthorityMandateStore;
}>;

export type AuthorityCommandContext = CorporateAdministrationCommandOptions;
