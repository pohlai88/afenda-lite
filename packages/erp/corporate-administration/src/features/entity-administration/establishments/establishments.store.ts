import type { Result } from "@afenda/errors";

import type {
	Establishment,
	EstablishmentStatus,
	EstablishmentStatusHistoryEntry,
	EstablishmentType,
} from "../../../kernel/contracts/domain";
import type { CorporateAdministrationPage } from "../../../kernel/pagination";

export interface EstablishmentsStore {
	getEstablishment: (input: {
		organizationId: string;
		id: string;
	}) => Promise<Result<Establishment | null>>;

	listEstablishmentStatusHistory: (input: {
		organizationId: string;
		establishmentId: string;
	}) => Promise<Result<readonly EstablishmentStatusHistoryEntry[]>>;

	listEstablishments: (filter: {
		organizationId: string;
		legalCompanyId?: string | undefined;
		status?: EstablishmentStatus | undefined;
		cursor?: string | undefined;
		limit: number;
	}) => Promise<Result<CorporateAdministrationPage<Establishment>>>;
	registerEstablishment: (record: {
		organizationId: string;
		legalCompanyId: string;
		establishmentType: EstablishmentType;
		jurisdictionCode: string;
		registrationIdentifier: string;
		normalizedRegistrationIdentifier: string;
		displayName: string;
		registeredFrom: string;
		actorUserId: string;
		correlationId: string;
		sourceDocumentId: string;
	}) => Promise<Result<Establishment>>;

	transitionEstablishment: (record: {
		organizationId: string;
		id: string;
		status: Exclude<EstablishmentStatus, "registered">;
		effectiveFrom: string;
		reason?: string | undefined;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		sourceDocumentId: string;
	}) => Promise<Result<Establishment>>;

	updateEstablishment: (record: {
		organizationId: string;
		id: string;
		displayName: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	}) => Promise<Result<Establishment>>;
}
