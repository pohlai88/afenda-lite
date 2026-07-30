// biome-ignore-all lint/suspicious/useAwait: Cleanup wrappers expose a uniform asynchronous test API.
import {
	and,
	caCompanyActivity,
	caCompanyFinancialYear,
	caCompanyIdentifier,
	caCompanyJurisdictionProfile,
	caCompanyLegalFormHistory,
	caCompanyName,
	caCompanyStatusHistory,
	caEstablishmentStatusHistory,
	caGovernanceBody,
	caGovernanceMembership,
	caLegalCompany,
	caLegalEstablishment,
	caMutationReceipt,
	caPremise,
	caRegisteredAddress,
	db,
	eq,
	type NeonHttpSql,
	platformAuditLog,
	platformDomainEvent,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { failFromUnknown, ok } from "@afenda/errors/result";
import type {
	CorporateAdministrationPendingEventAppender,
	CorporateAdministrationPendingOutboxEvent,
} from "../../src/adapters/drizzle/outbox";
import type { CorporateAdministrationIdempotencyScope } from "../../src/idempotency";

const CORPORATE_ADMINISTRATION_MODULE = "corporate-administration" as const;

export const CORPORATE_ADMINISTRATION_INFRASTRUCTURE_CLEANUP_TABLES = [
	"platform_domain_event",
	"platform_audit_log",
	"ca_company_activity",
	"ca_company_financial_year",
	"ca_company_identifier",
	"ca_company_legal_form_history",
	"ca_company_name",
	"ca_company_status_history",
	"ca_company_jurisdiction_profile",
	"ca_establishment_status_history",
	"ca_registered_address",
	"ca_premise",
	"ca_governance_membership",
	"ca_governance_body",
	"ca_legal_establishment",
	"ca_legal_company",
	"ca_mutation_receipt",
] as const;

function normalizeTestOrganizationId(organizationId: string): string {
	const normalized = organizationId.trim();
	if (normalized.length === 0) {
		throw new RangeError(
			"Corporate Administration test cleanup requires an organization ID",
		);
	}
	return normalized;
}

export function createNeonCorporateAdministrationPendingEventAppender(): CorporateAdministrationPendingEventAppender {
	function createStatement(event: CorporateAdministrationPendingOutboxEvent) {
		return (database: unknown) => {
			const neonSql = database as NeonHttpSql;
			return neonSql`
				INSERT INTO platform_domain_event (
					organization_id,
					type,
					source_module,
					deduplication_key,
					correlation_id,
					causation_id,
					actor_user_id,
					payload,
					metadata,
					status
				)
				VALUES (
					${event.organizationId},
					${event.type},
					${event.sourceModule},
					${event.deduplicationKey},
					${event.correlationId},
					${event.causationId ?? null},
					${event.actorUserId},
					${JSON.stringify(event.payload)}::jsonb,
					${JSON.stringify(event.metadata)}::jsonb,
					${"pending"}
				)
				ON CONFLICT (
					organization_id,
					source_module,
					type,
					deduplication_key
				)
				WHERE deduplication_key IS NOT NULL
				DO NOTHING
			`;
		};
	}

	return {
		async append(events) {
			if (events.length === 0) {
				return ok(undefined);
			}
			try {
				await runNeonHttpTransaction(
					(neonSql) =>
						events.map((event) =>
							createStatement(event)(neonSql),
						) as ReturnType<NeonHttpSql>[],
				);
				return ok(undefined);
			} catch (error) {
				return failFromUnknown(error, "Test pending-event append failed");
			}
		},
		createStatement,
	};
}

export async function cleanupCorporateAdministrationInfrastructureTestData(
	organizationId: string,
): Promise<void> {
	const scopedOrganizationId = normalizeTestOrganizationId(organizationId);

	await db
		.delete(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, scopedOrganizationId),
				eq(platformDomainEvent.sourceModule, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
	await db
		.delete(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, scopedOrganizationId),
				eq(platformAuditLog.module, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
	await db
		.delete(caCompanyActivity)
		.where(eq(caCompanyActivity.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyFinancialYear)
		.where(eq(caCompanyFinancialYear.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyIdentifier)
		.where(eq(caCompanyIdentifier.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyLegalFormHistory)
		.where(eq(caCompanyLegalFormHistory.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyName)
		.where(eq(caCompanyName.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyStatusHistory)
		.where(eq(caCompanyStatusHistory.organizationId, scopedOrganizationId));
	await db
		.delete(caCompanyJurisdictionProfile)
		.where(
			eq(caCompanyJurisdictionProfile.organizationId, scopedOrganizationId),
		);
	await db
		.delete(caEstablishmentStatusHistory)
		.where(
			eq(caEstablishmentStatusHistory.organizationId, scopedOrganizationId),
		);
	await db
		.delete(caCompanyStatusHistory)
		.where(eq(caCompanyStatusHistory.organizationId, scopedOrganizationId));
	await db
		.delete(caRegisteredAddress)
		.where(eq(caRegisteredAddress.organizationId, scopedOrganizationId));
	await db
		.delete(caPremise)
		.where(eq(caPremise.organizationId, scopedOrganizationId));
	await db
		.delete(caGovernanceMembership)
		.where(eq(caGovernanceMembership.organizationId, scopedOrganizationId));
	await db
		.delete(caGovernanceBody)
		.where(eq(caGovernanceBody.organizationId, scopedOrganizationId));
	await db
		.delete(caLegalEstablishment)
		.where(eq(caLegalEstablishment.organizationId, scopedOrganizationId));
	await db
		.delete(caLegalCompany)
		.where(eq(caLegalCompany.organizationId, scopedOrganizationId));
	await db
		.delete(caMutationReceipt)
		.where(eq(caMutationReceipt.organizationId, scopedOrganizationId));
}

export async function cleanupCorporateAdministrationEstablishmentTestData(
	organizationId: string,
): Promise<void> {
	const scopedOrganizationId = normalizeTestOrganizationId(organizationId);
	await db
		.delete(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, scopedOrganizationId),
				eq(platformDomainEvent.sourceModule, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
	await db
		.delete(platformAuditLog)
		.where(
			and(
				eq(platformAuditLog.organizationId, scopedOrganizationId),
				eq(platformAuditLog.module, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
	await db
		.delete(caEstablishmentStatusHistory)
		.where(
			eq(caEstablishmentStatusHistory.organizationId, scopedOrganizationId),
		);
	await db
		.delete(caRegisteredAddress)
		.where(eq(caRegisteredAddress.organizationId, scopedOrganizationId));
	await db
		.delete(caPremise)
		.where(eq(caPremise.organizationId, scopedOrganizationId));
	await db
		.delete(caGovernanceMembership)
		.where(eq(caGovernanceMembership.organizationId, scopedOrganizationId));
	await db
		.delete(caGovernanceBody)
		.where(eq(caGovernanceBody.organizationId, scopedOrganizationId));
	await db
		.delete(caLegalEstablishment)
		.where(eq(caLegalEstablishment.organizationId, scopedOrganizationId));
	await db
		.delete(caLegalCompany)
		.where(eq(caLegalCompany.organizationId, scopedOrganizationId));
	await db
		.delete(caMutationReceipt)
		.where(eq(caMutationReceipt.organizationId, scopedOrganizationId));
}

export async function countCorporateAdministrationLegalEstablishments(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caLegalEstablishment)
		.where(eq(caLegalEstablishment.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationMutationReceipts(
	scope: CorporateAdministrationIdempotencyScope,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caMutationReceipt)
		.where(
			and(
				eq(caMutationReceipt.organizationId, scope.organizationId),
				eq(caMutationReceipt.commandId, scope.commandId),
				eq(caMutationReceipt.idempotencyKey, scope.idempotencyKey),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationMutationReceiptsByStatus(
	scope: CorporateAdministrationIdempotencyScope,
	status: "completed" | "in_progress" | "released",
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caMutationReceipt)
		.where(
			and(
				eq(caMutationReceipt.organizationId, scope.organizationId),
				eq(caMutationReceipt.commandId, scope.commandId),
				eq(caMutationReceipt.idempotencyKey, scope.idempotencyKey),
				eq(caMutationReceipt.status, status),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationOutboxEvents(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, organizationId),
				eq(platformDomainEvent.sourceModule, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationCompanyIdentifiers(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyIdentifier)
		.where(eq(caCompanyIdentifier.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationCompanyFinancialYears(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyFinancialYear)
		.where(eq(caCompanyFinancialYear.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationCompanyActivities(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyActivity)
		.where(eq(caCompanyActivity.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCorporateAdministrationCompanyStatusHistory(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyStatusHistory)
		.where(eq(caCompanyStatusHistory.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function listCorporateAdministrationOutboxEvents(
	organizationId: string,
): Promise<
	ReadonlyArray<{
		organizationId: string;
		type: string;
		deduplicationKey: string | null;
		payload: unknown;
		metadata: unknown;
		status: string;
		attempts: number;
		processedAt: Date | null;
	}>
> {
	return db
		.select({
			organizationId: platformDomainEvent.organizationId,
			type: platformDomainEvent.type,
			deduplicationKey: platformDomainEvent.deduplicationKey,
			payload: platformDomainEvent.payload,
			metadata: platformDomainEvent.metadata,
			status: platformDomainEvent.status,
			attempts: platformDomainEvent.attempts,
			processedAt: platformDomainEvent.processedAt,
		})
		.from(platformDomainEvent)
		.where(
			and(
				eq(platformDomainEvent.organizationId, organizationId),
				eq(platformDomainEvent.sourceModule, CORPORATE_ADMINISTRATION_MODULE),
			),
		);
}
