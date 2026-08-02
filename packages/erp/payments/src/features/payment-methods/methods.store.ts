import type { Result } from "@afenda/errors";

import type {
	InstrumentRequirement,
	PaymentAccountKind,
	PaymentInstrumentKind,
	PaymentMethod,
} from "../../kernel/contracts/domain";

export interface PaymentMethodUpdateRecord {
	active?: boolean;
	allowedAccountKinds?: readonly PaymentAccountKind[];
	allowedInstrumentKinds?: readonly PaymentInstrumentKind[];
	id: string;
	instrumentRequirement?: InstrumentRequirement;
	name?: string;
	organizationId: string;
	updatedBy: string;
}

export interface PaymentMethodsStore {
	createPaymentMethod: (
		record: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">,
	) => Promise<Result<PaymentMethod>>;
	getPaymentMethodById: (
		organizationId: string,
		id: string,
	) => Promise<Result<PaymentMethod | null>>;
	listPaymentMethods: (
		organizationId: string,
	) => Promise<Result<PaymentMethod[]>>;
	updatePaymentMethod: (
		record: PaymentMethodUpdateRecord,
	) => Promise<Result<PaymentMethod>>;
}
