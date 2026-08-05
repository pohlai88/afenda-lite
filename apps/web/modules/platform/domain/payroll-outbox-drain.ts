import { database as afendaDatabase, platformDomainEvent } from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { events, type EventDispatchSummary } from "@afenda/events";
import { and, eq, lte, or, sql } from "drizzle-orm";

const PAYROLL_OUTBOX_CLAIM_LEASE_MS = 60_000;
const PAYROLL_OUTBOX_MAX_ATTEMPTS = 10;

import { createPayrollPlatformEventHandlers } from "@/modules/platform/domain/payroll-platform-events";

const PAYROLL_EVENT_TYPE_PREFIX = "payroll.";

export interface PayrollOutboxDrainSummary {
	failed: number;
	organizations: number;
	processed: number;
	skipped: number;
	timedOut: boolean;
}

async function listOrganizationsWithPendingPayrollEvents(input: {
	limit: number;
}): Promise<Result<string[]>> {
	try {
		const staleBefore = new Date(Date.now() - PAYROLL_OUTBOX_CLAIM_LEASE_MS);
		const result = await afendaDatabase.client.execute<{ organizationId: string }>(
			sql`
				SELECT DISTINCT organization_id AS "organizationId"
				FROM platform_domain_event
				WHERE type LIKE ${`${PAYROLL_EVENT_TYPE_PREFIX}%`}
					AND attempts < ${PAYROLL_OUTBOX_MAX_ATTEMPTS}
					AND (
						status = 'pending'
						OR (status = 'processing' AND claimed_at <= ${staleBefore})
					)
				ORDER BY organization_id ASC
				LIMIT ${input.limit}
			`,
		);
		return errorResult.ok(
			result.rows.map((row) => String(row.organizationId)),
		);
	} catch {
		return errorResult.fail("INTERNAL_ERROR", {
			publicMessage: "Could not discover payroll outbox backlog.",
		});
	}
}

async function dispatchPayrollPendingEventsForOrganization(input: {
	limit: number;
	organizationId: string;
}): Promise<Result<EventDispatchSummary>> {
	return await events.dispatcher
		.create({
			handlers: createPayrollPlatformEventHandlers(),
		})
		.dispatchPending({
			organizationId: input.organizationId,
			limit: input.limit,
		});
}

export async function runPayrollOutboxDrain(input: {
	orgBatchSize: number;
	perOrganizationLimit: number;
	timeBudgetMs: number;
}): Promise<Result<PayrollOutboxDrainSummary>> {
	const startedAt = Date.now();
	const organizations = await listOrganizationsWithPendingPayrollEvents({
		limit: input.orgBatchSize,
	});
	if (!organizations.ok) {
		return organizations;
	}

	const summary: PayrollOutboxDrainSummary = {
		organizations: organizations.data.length,
		processed: 0,
		failed: 0,
		skipped: 0,
		timedOut: false,
	};

	for (const organizationId of organizations.data) {
		if (Date.now() - startedAt >= input.timeBudgetMs) {
			summary.timedOut = true;
			break;
		}
		const dispatched = await dispatchPayrollPendingEventsForOrganization({
			organizationId,
			limit: input.perOrganizationLimit,
		});
		if (!dispatched.ok) {
			return dispatched;
		}
		summary.processed += dispatched.data.processed;
		summary.failed += dispatched.data.failed;
		summary.skipped += dispatched.data.skipped;
	}

	return errorResult.ok(summary);
}

/** Test seam: count pending payroll events for one organization without claiming. */
export async function countPendingPayrollEvents(
	organizationId: string,
): Promise<Result<number>> {
	try {
		const staleBefore = new Date(Date.now() - PAYROLL_OUTBOX_CLAIM_LEASE_MS);
		const [row] = await afendaDatabase.client
			.select({ value: sql<number>`count(*)::int` })
			.from(platformDomainEvent)
			.where(
				and(
					eq(platformDomainEvent.organizationId, organizationId),
					sql`${platformDomainEvent.type} LIKE ${`${PAYROLL_EVENT_TYPE_PREFIX}%`}`,
					sql`${platformDomainEvent.attempts} < ${PAYROLL_OUTBOX_MAX_ATTEMPTS}`,
					or(
						eq(platformDomainEvent.status, "pending"),
						and(
							eq(platformDomainEvent.status, "processing"),
							lte(platformDomainEvent.claimedAt, staleBefore),
						),
					),
				),
			);
		return errorResult.ok(Number(row?.value ?? 0));
	} catch {
		return errorResult.fail("INTERNAL_ERROR");
	}
}
