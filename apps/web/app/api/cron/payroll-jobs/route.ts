import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "@afenda/env";
import { errorResult } from "@afenda/errors";

import { jsonFailure } from "@/modules/platform/api/json-response";
import { runPayrollJobsDrain } from "@/modules/platform/domain/payroll-jobs-drain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const responseHeaders = { "Cache-Control": "no-store" };

function authorized(request: Request): boolean {
	const secret = env.CRON_SECRET;
	const header = request.headers.get("authorization");
	if (secret === undefined || header === null) {
		return false;
	}
	const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
	const actual = createHash("sha256").update(header).digest();
	return timingSafeEqual(expected, actual);
}

export async function GET(request: Request): Promise<Response> {
	if (!authorized(request)) {
		return jsonFailure(errorResult.fail("UNAUTHORIZED"), {
			headers: responseHeaders,
		});
	}
	if (!env.PAYROLL_JOBS_DRAIN_ENABLED) {
		return Response.json(
			{
				data: {
					claimed: 0,
					succeeded: 0,
					failed: 0,
					timedOut: false,
				},
			},
			{ headers: responseHeaders },
		);
	}
	const result = await runPayrollJobsDrain({
		workerId: `vercel-cron:${randomUUID()}`,
		batchSize: env.PAYROLL_JOBS_DRAIN_BATCH_SIZE,
		leaseDurationMs: env.PAYROLL_JOBS_DRAIN_LEASE_SECONDS * 1000,
		timeBudgetMs: env.PAYROLL_JOBS_DRAIN_TIME_BUDGET_MS,
	});
	if (!result.ok) {
		return jsonFailure(result, { headers: responseHeaders });
	}
	return Response.json({ data: result.data }, { headers: responseHeaders });
}
