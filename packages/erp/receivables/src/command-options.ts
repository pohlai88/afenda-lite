import { fail, ok } from "@afenda/errors/result";
import { createEventPublisher } from "@afenda/events";

import type { ReceivablesAuthorizationPort } from "./authorization";
import type {
	DeliveryInvoiceSourceQueryPort,
	PaymentApplicationQueryPort,
	ReceivablesEffects,
	SalesInvoiceSourceQueryPort,
} from "./ports";
import { resolveReceivablesStore } from "./resolve-store";
import type { ReceivablesStore } from "./store";

export type ReceivablesCommandOptions = {
	store?: ReceivablesStore;
	authorization?: ReceivablesAuthorizationPort;
	effects?: ReceivablesEffects;
	salesSource?: SalesInvoiceSourceQueryPort;
	deliverySource?: DeliveryInvoiceSourceQueryPort;
	paymentApplication?: PaymentApplicationQueryPort;
};

export function resolveEffects(
	effects?: ReceivablesEffects,
): ReceivablesEffects {
	if (effects !== undefined) return effects;
	const publisher = createEventPublisher();
	return {
		async emit(event) {
			const result = await publisher.publish({
				type: event.type,
				sourceModule: "receivables",
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				payload: event.payload,
			});
			return result.ok
				? ok(undefined)
				: fail(result.code, result.message, result.details);
		},
	};
}

export function resolveCommandDeps(options: ReceivablesCommandOptions = {}): {
	store: ReceivablesStore;
	authorization: ReceivablesAuthorizationPort | undefined;
	effects: ReceivablesEffects;
	salesSource: SalesInvoiceSourceQueryPort | undefined;
	deliverySource: DeliveryInvoiceSourceQueryPort | undefined;
	paymentApplication: PaymentApplicationQueryPort | undefined;
} {
	return {
		store: resolveReceivablesStore(options.store),
		authorization: options.authorization,
		effects: resolveEffects(options.effects),
		salesSource: options.salesSource,
		deliverySource: options.deliverySource,
		paymentApplication: options.paymentApplication,
	};
}
