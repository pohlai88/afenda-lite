import type { Result } from "@afenda/errors/result";
import { z } from "zod";
import type { CorporateAdministrationApprovalDecisionPort } from "./authorization";
import type { CorporateAdministrationPendingEvent } from "./domain-events";
import type { CorporateAdministrationIdempotencyPort } from "./idempotency";
import {
	causationIdSchema,
	correlationIdSchema,
	type DocumentObjectRef,
	type OrganizationId,
	organizationIdSchema,
	userIdSchema,
} from "./kernel/brands";
import { type CanonicalDate, canonicalInstantSchema } from "./kernel/dates";

export type ClockPort = Readonly<{
	now(): Date;
	today(timeZoneIana: string): CanonicalDate;
}>;

export type ReferenceResolution = Readonly<{
	code: string;
	active: boolean;
	displayName?: string;
}>;

export type LegalFormReferenceResolution = ReferenceResolution &
	Readonly<{
		jurisdictionCode: string;
		legalFormCode: string;
		entityTypeCode?: string;
		effectiveDate: CanonicalDate;
	}>;

export type CurrencyReferenceResolution = ReferenceResolution &
	Readonly<{
		currencyCode: string;
		effectiveDate?: CanonicalDate;
	}>;

export type IdentifierAuthorityResolution = ReferenceResolution &
	Readonly<{
		jurisdictionCode: string;
		authorityCode: string;
		effectiveDate: CanonicalDate;
		uniquenessScope?:
			| "global_authority"
			| "tenant_authority"
			| "company_authority";
		caseSensitive?: boolean;
		removePresentationSeparators?: boolean;
	}>;

export type ActivityClassificationResolution = ReferenceResolution &
	Readonly<{
		classificationSystem: string;
		activityCode: string;
		effectiveDate: CanonicalDate;
		activityType?: "registered_object" | "regulated" | "operational";
		requiresRegulator?: boolean;
	}>;

export type CompatibilityResolution = Readonly<{
	compatible: boolean;
	active: boolean;
	reasonCode?: string;
}>;

export type ReferenceDataPort = Readonly<{
	resolveLanguage(input: {
		organizationId: OrganizationId;
		languageCode: string;
	}): Promise<Result<ReferenceResolution | null>>;
	resolveLegalForm(input: {
		organizationId: OrganizationId;
		jurisdictionCode: string;
		legalFormCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<LegalFormReferenceResolution | null>>;
	validateLegalFormCompatibility(input: {
		organizationId: OrganizationId;
		jurisdictionCode: string;
		entityTypeCode: string;
		legalFormCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<CompatibilityResolution>>;
	resolveCountry(input: {
		organizationId: OrganizationId;
		countryCode: string;
		effectiveDate?: CanonicalDate;
	}): Promise<Result<ReferenceResolution | null>>;
	resolveCurrency(input: {
		organizationId: OrganizationId;
		currencyCode: string;
		effectiveDate?: CanonicalDate;
	}): Promise<Result<CurrencyReferenceResolution | null>>;
	resolveIdentifierAuthority(input: {
		organizationId: OrganizationId;
		jurisdictionCode: string;
		authorityCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<IdentifierAuthorityResolution | null>>;
	resolveActivityClassification(input: {
		organizationId: OrganizationId;
		classificationSystem: string;
		activityCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<ActivityClassificationResolution | null>>;
	resolveRegulator(input: {
		organizationId: OrganizationId;
		jurisdictionCode: string;
		regulatorCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<ReferenceResolution | null>>;
	resolveRegisteredActivity(input: {
		organizationId: OrganizationId;
		activityCode: string;
		jurisdictionCode: string;
		effectiveDate: CanonicalDate;
	}): Promise<Result<ReferenceResolution | null>>;
}>;

export type DocumentObjectPort = Readonly<{
	resolveDocumentObject(input: {
		organizationId: OrganizationId;
		documentObjectRef: DocumentObjectRef;
	}): Promise<
		Result<{ documentObjectRef: DocumentObjectRef; active: boolean } | null>
	>;
}>;

export type TaxRegistrationReadModel = Readonly<{
	id: string;
	organizationId: OrganizationId;
	partyId: string;
	jurisdictionCode: string;
	registrationType: string;
	displayRegistrationNumber: string;
	normalizedRegistrationNumber: string;
	status: "draft" | "active" | "blocked" | "retired" | string;
	effectiveFrom: CanonicalDate | null;
	effectiveTo: CanonicalDate | null;
}>;

/**
 * Read-only Master Data tax-registration boundary.
 *
 * Corporate Administration may use this for display, reconciliation, duplicate
 * warnings, and boundary guidance. This port intentionally exposes no create,
 * update, transition, delete, or generic table-write capability for
 * `md_tax_registration`.
 */
export type TaxRegistrationReadPort = Readonly<{
	getTaxRegistrationById(input: {
		organizationId: OrganizationId;
		taxRegistrationId: string;
	}): Promise<Result<TaxRegistrationReadModel | null>>;
	findTaxRegistrationsForParty(input: {
		organizationId: OrganizationId;
		partyId: string;
		jurisdictionCode?: string;
		asOf?: CanonicalDate;
	}): Promise<Result<readonly TaxRegistrationReadModel[]>>;
	findPotentialDuplicateTaxRegistration(input: {
		organizationId: OrganizationId;
		jurisdictionCode: string;
		registrationType: string;
		normalizedRegistrationNumber: string;
		asOf?: CanonicalDate;
	}): Promise<Result<TaxRegistrationReadModel | null>>;
}>;

export type PartyReference = Readonly<{
	partyId: string;
	kind: "organization" | "person";
	active: boolean;
}>;

export type PartyReferencePort = Readonly<{
	getOrganizationParty(input: {
		organizationId: OrganizationId;
		partyId: string;
	}): Promise<Result<PartyReference | null>>;
}>;

export type StatutoryNameReconciliationFact = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: string;
	masterDataPartyId: string;
	statutoryName: string;
	operationalPartyName: string;
	comparisonStatus: "match" | "differs" | "unknown";
	effectiveDate: CanonicalDate;
}>;

export type MasterDataReconciliationPort = Readonly<{
	recordStatutoryNameComparison(
		fact: StatutoryNameReconciliationFact,
		options?: Readonly<{
			transaction?: CorporateAdministrationTransactionContext;
		}>,
	): Promise<Result<void>>;
}>;

export type ApprovalDecisionPort = CorporateAdministrationApprovalDecisionPort;

/**
 * Atomic execution boundary for Corporate Administration commands.
 *
 * The adapter executes `work` exactly once. A returned `Result` is preserved
 * unchanged so governed failures can trigger rollback without becoming thrown
 * domain errors. Exceptions thrown by `work` or the infrastructure propagate
 * as rejected promises; adapters must not translate them into domain conflicts.
 *
 * Nested transactions are prohibited. An invocation made inside an active
 * `run` must be rejected rather than joined or converted to a savepoint.
 *
 * This package boundary intentionally exposes no Drizzle transaction, database
 * client, or process-global transaction state.
 */
export type CorporateAdministrationTransactionStatement = (
	database: unknown,
) => unknown;

export type CorporateAdministrationTransactionContext = Readonly<{
	enqueue(statement: CorporateAdministrationTransactionStatement): void;
	readonly statementCount: number;
}>;

export type CorporateAdministrationTransactionOutcome<TResult> = Readonly<{
	result: Result<TResult>;
	effect: "commit" | "rollback";
}>;

export type CorporateAdministrationTransactionPort = Readonly<{
	nesting: "prohibited";
	run<TResult>(
		work: (
			context: CorporateAdministrationTransactionContext,
		) => Promise<CorporateAdministrationTransactionOutcome<TResult>>,
	): Promise<Result<TResult>>;
}>;

export function commitCorporateAdministrationTransaction<TResult>(
	result: Result<TResult>,
): CorporateAdministrationTransactionOutcome<TResult> {
	return { result, effect: "commit" };
}

export function rollbackCorporateAdministrationTransaction<TResult>(
	result: Result<TResult>,
): CorporateAdministrationTransactionOutcome<TResult> {
	return { result, effect: "rollback" };
}

/**
 * Internal durable outbox append boundary.
 *
 * CA-0.4 persists pending event envelopes only. This is not an event publisher,
 * queue client, retry worker, or consumer contract.
 */
export type CorporateAdministrationOutboxPort = Readonly<{
	append(
		events: readonly CorporateAdministrationPendingEvent[],
		options?: Readonly<{
			transaction?: CorporateAdministrationTransactionContext;
		}>,
	): Promise<Result<void>>;
}>;

export const CORPORATE_ADMINISTRATION_AUDIT_OPERATION_TYPES = [
	"CREATE",
	"UPDATE",
	"DELETE",
	"READ",
	"IMPORT",
	"EXPORT",
	"APPROVE",
	"REJECT",
] as const;

export type CorporateAdministrationAuditOperationType =
	(typeof CORPORATE_ADMINISTRATION_AUDIT_OPERATION_TYPES)[number];

export const CORPORATE_ADMINISTRATION_AUDIT_OUTCOMES = [
	"SUCCESS",
	"FAILURE",
] as const;

export type CorporateAdministrationAuditOutcome =
	(typeof CORPORATE_ADMINISTRATION_AUDIT_OUTCOMES)[number];

export type CorporateAdministrationSafeAuditMetadataValue =
	| string
	| number
	| boolean
	| null;

const FORBIDDEN_AUDIT_METADATA_KEY_PARTS = [
	"password",
	"secret",
	"token",
	"governmentid",
	"dateofbirth",
	"residentialaddress",
	"bankaccount",
	"documenturl",
	"signedurl",
	"signature",
	"connectionstring",
	"queryparameter",
	"oldvalue",
	"newvalue",
	"before",
	"after",
	"payload",
] as const;

const safeAuditMetadataKeySchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z][a-z0-9_]*$/, "Audit metadata keys must use snake_case")
	.refine((key) => {
		const compact = key.replaceAll("_", "");
		return !FORBIDDEN_AUDIT_METADATA_KEY_PARTS.some((part) =>
			compact.includes(part),
		);
	}, "Audit metadata key is not permitted");

const safeAuditMetadataValueSchema = z.union([
	z.string().max(256),
	z.number().finite(),
	z.boolean(),
	z.null(),
]);

export const corporateAdministrationSafeAuditMetadataSchema = z
	.record(safeAuditMetadataKeySchema, safeAuditMetadataValueSchema)
	.superRefine((metadata, context) => {
		if (Object.keys(metadata).length > 20) {
			context.addIssue({
				code: "custom",
				message: "Audit metadata may contain at most 20 fields",
			});
		}
	})
	.readonly();

export const corporateAdministrationAuditFactInputSchema = z
	.object({
		organizationId: organizationIdSchema,
		actorUserId: userIdSchema,
		correlationId: correlationIdSchema,
		causationId: causationIdSchema.optional(),
		operationType: z.enum(CORPORATE_ADMINISTRATION_AUDIT_OPERATION_TYPES),
		targetType: z.string().min(1).max(128),
		targetId: z.string().min(1).max(128),
		occurredAt: canonicalInstantSchema,
		outcome: z.enum(CORPORATE_ADMINISTRATION_AUDIT_OUTCOMES),
		safeMetadata: corporateAdministrationSafeAuditMetadataSchema.optional(),
	})
	.strict()
	.readonly();

export type CorporateAdministrationAuditFactInput = z.infer<
	typeof corporateAdministrationAuditFactInputSchema
>;

/**
 * Generic audit fact persistence boundary.
 *
 * Ownership is shared platform audit (`@afenda/audit`), not a CA table. Facts
 * carry no raw sensitive data, before/after business snapshots, arbitrary
 * payloads, external transport details, UI viewer state, or regulatory
 * completeness claim.
 */
export type CorporateAdministrationAuditFactPort = Readonly<{
	record(
		input: CorporateAdministrationAuditFactInput,
		options?: Readonly<{
			transaction?: CorporateAdministrationTransactionContext;
		}>,
	): Promise<Result<{ id: string }>>;
}>;

/**
 * CA-0.3 runtime infrastructure composition.
 *
 * Required ports only: clock, transaction, idempotency, audit fact, and durable
 * outbox append. ID generation is
 * owned by adapters and application composition, not this aggregate. No
 * master-data, tax, approval, document, accounting, payments, search,
 * reminder, signature, compliance-rule, or database implementation types are
 * admitted. Presence of this contract does not activate commands, queries,
 * event publication, workers, or external consumers.
 */
export type CorporateAdministrationRuntimePorts = Readonly<{
	clock: ClockPort;
	transaction: CorporateAdministrationTransactionPort;
	idempotency: CorporateAdministrationIdempotencyPort;
	audit: CorporateAdministrationAuditFactPort;
	outbox: CorporateAdministrationOutboxPort;
}>;

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}

function hasFunction(
	value: Record<PropertyKey, unknown>,
	key: PropertyKey,
): boolean {
	return typeof value[key] === "function";
}

const clockSchema = z.custom<ClockPort>(
	(value) =>
		isObject(value) && hasFunction(value, "now") && hasFunction(value, "today"),
	{ message: "Corporate Administration clock port is required" },
);

const transactionSchema = z.custom<CorporateAdministrationTransactionPort>(
	(value) =>
		isObject(value) &&
		value.nesting === "prohibited" &&
		hasFunction(value, "run"),
	{ message: "Corporate Administration transaction port is required" },
);

const idempotencySchema = z.custom<CorporateAdministrationIdempotencyPort>(
	(value) =>
		isObject(value) &&
		hasFunction(value, "begin") &&
		hasFunction(value, "complete") &&
		hasFunction(value, "release"),
	{ message: "Corporate Administration idempotency port is required" },
);

const outboxSchema = z.custom<CorporateAdministrationOutboxPort>(
	(value) => isObject(value) && hasFunction(value, "append"),
	{ message: "Corporate Administration outbox port is required" },
);

const auditSchema = z.custom<CorporateAdministrationAuditFactPort>(
	(value) => isObject(value) && hasFunction(value, "record"),
	{ message: "Corporate Administration audit fact port is required" },
);

const runtimePortsSchema = z
	.object({
		clock: clockSchema,
		transaction: transactionSchema,
		idempotency: idempotencySchema,
		audit: auditSchema,
		outbox: outboxSchema,
	})
	.strict()
	.readonly();

/**
 * Fail-fast CA-0.3 composition validator.
 *
 * Requires every mandatory runtime port, rejects incomplete or unknown wiring,
 * returns a readonly object that preserves supplied adapter identities, and
 * never invokes port methods. It does not construct Drizzle adapters, read
 * environment variables, import application composition roots, install
 * in-memory production fallbacks, or invent allow-all authorization.
 *
 * Missing infrastructure must fail here, before any command begins.
 */
export function createCorporateAdministrationRuntime(
	ports: unknown,
): CorporateAdministrationRuntimePorts {
	return runtimePortsSchema.parse(ports);
}
