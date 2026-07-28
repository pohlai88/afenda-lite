import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationCommandOptions } from "../command-options";
import type { LegalCompanyStore } from "../company/store";
import type {
	GovernanceBodyId,
	GovernanceMembershipId,
	LegalCompanyId,
	OrganizationId,
	UserId,
} from "../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import type {
	CorporateAdministrationTransactionContext,
	PartyReferencePort,
} from "../ports";
import type {
	GovernanceBody,
	GovernanceBodyType,
	GovernanceMembership,
	GovernanceMembershipRole,
	GovernanceVotingEntitlement,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type CreateGovernanceBodyStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		bodyType: GovernanceBodyType;
		bodyCode: string;
		normalizedBodyCode: string;
		displayName: string;
		description: string | null;
		effectiveFrom: CanonicalDate;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedCompanyVersion: number;
	}>;

export type AmendGovernanceBodyStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		governanceBodyId: GovernanceBodyId;
		displayName: string;
		description: string | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type RetireGovernanceBodyStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		governanceBodyId: GovernanceBodyId;
		retiredOn: CanonicalDate;
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type AppointGovernanceMemberStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceBodyId: GovernanceBodyId;
		memberKind: "party" | "role_seat";
		memberPartyId: string | null;
		roleSeatCode: string | null;
		seatLabel: string;
		membershipRole: GovernanceMembershipRole;
		votingEntitlement: GovernanceVotingEntitlement;
		isChair: boolean;
		termFrom: CanonicalDate;
		termTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedBodyVersion: number;
	}>;

export type ChangeGovernanceMembershipStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		governanceMembershipId: GovernanceMembershipId;
		seatLabel: string;
		membershipRole: GovernanceMembershipRole;
		votingEntitlement: GovernanceVotingEntitlement;
		isChair: boolean;
		termFrom: CanonicalDate;
		termTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type EndGovernanceMembershipStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		governanceMembershipId: GovernanceMembershipId;
		endedOn: CanonicalDate;
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export interface GovernanceStore {
	getGovernanceBody(input: {
		organizationId: OrganizationId;
		governanceBodyId: GovernanceBodyId;
	}): Promise<Result<GovernanceBody | null>>;
	listGovernanceBodiesAsOf(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		bodyType?: GovernanceBodyType;
		includeRetired?: boolean;
	}): Promise<Result<readonly GovernanceBody[]>>;
	createGovernanceBody(
		input: CreateGovernanceBodyStoreInput,
	): Promise<Result<GovernanceBody>>;
	amendGovernanceBody(
		input: AmendGovernanceBodyStoreInput,
	): Promise<Result<GovernanceBody>>;
	retireGovernanceBody(
		input: RetireGovernanceBodyStoreInput,
	): Promise<Result<GovernanceBody>>;
	getGovernanceMembership(input: {
		organizationId: OrganizationId;
		governanceMembershipId: GovernanceMembershipId;
	}): Promise<Result<GovernanceMembership | null>>;
	listGovernanceMemberships(input: {
		organizationId: OrganizationId;
		governanceBodyId: GovernanceBodyId;
	}): Promise<Result<readonly GovernanceMembership[]>>;
	listGovernanceMembershipsAsOf(input: {
		organizationId: OrganizationId;
		governanceBodyId: GovernanceBodyId;
		asOf: CanonicalDate;
		memberPartyId?: string;
	}): Promise<Result<readonly GovernanceMembership[]>>;
	appointGovernanceMember(
		input: AppointGovernanceMemberStoreInput,
	): Promise<Result<GovernanceMembership>>;
	changeGovernanceMembership(
		input: ChangeGovernanceMembershipStoreInput,
	): Promise<Result<GovernanceMembership>>;
	endGovernanceMembership(
		input: EndGovernanceMembershipStoreInput,
	): Promise<Result<GovernanceMembership>>;
}

export type GovernanceReferencePort = Readonly<{
	validateSourceDocument(input: {
		organizationId: OrganizationId;
		sourceDocumentId: string;
	}): Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

export type GovernanceCommandDependencies = Readonly<{
	companyStore: LegalCompanyStore;
	governanceStore: GovernanceStore;
	referenceData: GovernanceReferencePort;
	partyReferences: PartyReferencePort;
}>;

export type GovernanceQueryDependencies = Readonly<{
	governanceStore: GovernanceStore;
}>;

export type GovernanceCommandContext = CorporateAdministrationCommandOptions;
