/**
 * Matches the existing `ca_legal_establishment` schema in @afenda/db
 * (packages/data-plane/db/src/schema/corporate-administration.ts), reused
 * as-is rather than diverging into a new schema/migration.
 */
export const ESTABLISHMENT_TYPES = [
	"branch",
	"representative_office",
	"foreign_registration",
	"other",
] as const;
export type EstablishmentType = (typeof ESTABLISHMENT_TYPES)[number];

export const ESTABLISHMENT_STATUSES = [
	"registered",
	"active",
	"suspended",
	"closed",
] as const;
export type EstablishmentStatus = (typeof ESTABLISHMENT_STATUSES)[number];

/**
 * Aggregate owned solely by `establishments` (entity-administration).
 * `legalCompanyId` is a governed reference to entity-administration/company —
 * not yet a real feature in this package, so it is an opaque string for now.
 */
export interface Establishment {
	createdAt: Date;
	createdBy: string;
	displayName: string;
	establishmentType: EstablishmentType;
	id: string;
	jurisdictionCode: string;
	legalCompanyId: string;
	normalizedRegistrationIdentifier: string;
	organizationId: string;
	registeredFrom: string;
	registrationIdentifier: string;
	status: EstablishmentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

/**
 * Immutable, append-only status chronology (BR-09), matching
 * `ca_establishment_status_history`. `effectiveTo` is set on the previously
 * open-ended row when a new transition supersedes it.
 */
export interface EstablishmentStatusHistoryEntry {
	createdAt: Date;
	effectiveFrom: string;
	effectiveTo: string | null;
	establishmentId: string;
	id: string;
	legalCompanyId: string;
	organizationId: string;
	reason: string | null;
	recordedAt: Date;
	recordedBy: string;
	sourceDocumentId: string;
	status: EstablishmentStatus;
	version: number;
}
