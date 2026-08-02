import { errorResult } from "@afenda/errors";
import { events } from "@afenda/events";

import type { PayablesEffects } from "../kernel/contracts/effects";

export function resolvePayablesEffects(
	effects?: PayablesEffects,
): PayablesEffects {
	if (effects !== undefined) {
		return effects;
	}
	const publisher = events.publisher.create();
	return {
		async emit(event) {
			const result = await publisher.publish({
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				organizationId: event.organizationId,
				payload: event.payload,
				sourceModule: "payables",
				type: event.type,
			});
			return result.ok ? errorResult.ok(undefined) : result;
		},
	};
}
