import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../contracts/reasons";
import type { MasterStatus } from "../types";

const TRANSITIONS: Record<MasterStatus, readonly MasterStatus[]> = {
	draft: ["active", "retired"],
	active: ["inactive", "blocked", "retired"],
	inactive: ["active", "retired"],
	blocked: ["active", "retired"],
	retired: ["draft"],
};

export function assertLifecycleTransition(
	from: MasterStatus,
	to: MasterStatus,
): Result<true> {
	if (from === to) {
		return fail("CONFLICT", `Already in status ${from}`, {
			reason: "MASTER_INVALID_STATE",
			from,
			to,
		} satisfies MasterFailureDetails);
	}
	if (!TRANSITIONS[from].includes(to)) {
		return fail("CONFLICT", `Invalid lifecycle transition ${from} → ${to}`, {
			reason: "MASTER_INVALID_STATE",
			from,
			to,
		} satisfies MasterFailureDetails);
	}
	return { ok: true, data: true };
}

/** Restore returns retired → draft (distinct from create). */
export function restoreTargetStatus(): MasterStatus {
	return "draft";
}
