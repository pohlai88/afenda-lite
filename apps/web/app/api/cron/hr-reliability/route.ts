import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "@afenda/env";

import { runProductionReliabilityScheduler } from "@/modules/platform/domain/human-resources-reliability-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const responseHeaders = { "Cache-Control": "no-store" };

function authorized(request: Request): boolean {
	const secret = env.CRON_SECRET;
	const header = request.headers.get("authorization");
	if (secret === undefined || header === null) return false;
	const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
	const actual = createHash("sha256").update(header).digest();
	return timingSafeEqual(expected, actual);
}

export async function GET(request: Request): Promise<Response> {
	if (!authorized(request)) {
		return Response.json(
			{ error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
			{ status: 401, headers: responseHeaders },
		);
	}
	if (!env.HR_RELIABILITY_ENABLED) {
		return Response.json(
			{
				data: {
					claimed: 0,
					succeeded: 0,
					awaitingAcknowledgement: 0,
					retried: 0,
					deadLettered: 0,
					failed: 0,
					timedOut: false,
				},
			},
			{ headers: responseHeaders },
		);
	}
	const result = await runProductionReliabilityScheduler({
		workerId: `vercel-cron:${randomUUID()}`,
		batchSize: env.HR_RELIABILITY_BATCH_SIZE,
		concurrency: env.HR_RELIABILITY_CONCURRENCY,
		perOrganizationLimit: env.HR_RELIABILITY_PER_ORG_LIMIT,
		leaseDurationMs: env.HR_RELIABILITY_LEASE_SECONDS * 1_000,
		timeBudgetMs: env.HR_RELIABILITY_TIME_BUDGET_MS,
	});
	if (!result.ok) {
		return Response.json(
			{
				error: {
					code: result.code,
					message: "Human Resources reliability processing failed.",
				},
			},
			{ status: 500, headers: responseHeaders },
		);
	}
	return Response.json({ data: result.data }, { headers: responseHeaders });
}
