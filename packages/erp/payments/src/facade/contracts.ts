import type { PaymentsStore } from "../composition/store/contract";
import type { PaymentsEffects } from "../kernel/contracts/effects";
import type { PaymentsAuthorizationPort } from "../kernel/execution/authorization";

export interface PaymentsCommandOptions {
	authorization?: PaymentsAuthorizationPort;
	effects?: PaymentsEffects;
	store?: PaymentsStore;
}
