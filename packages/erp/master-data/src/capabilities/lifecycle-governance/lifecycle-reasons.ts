import type { LifecycleReason, LifecycleReasonCode } from "./types";

export function lifecycleReason(
	code: LifecycleReasonCode,
	note?: string,
): LifecycleReason {
	return note === undefined ? { code } : { code, note };
}
