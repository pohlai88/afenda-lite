import type { Result } from "@afenda/errors";

import type {
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
} from "../../kernel/contracts/domain";

export interface PaymentApplicationInstructionsStore {
	addApplicationInstruction: (
		record: Omit<
			PaymentApplicationInstruction,
			| "id"
			| "createdAt"
			| "updatedAt"
			| "appliedAmount"
			| "status"
			| "rejectionCode"
		> & {
			idempotencyKey: string;
			actorUserId: string;
			correlationId: string;
		},
	) => Promise<Result<PaymentApplicationInstruction>>;
	getApplicationAvailability: (
		organizationId: string,
		paymentId: string,
	) => Promise<Result<PaymentApplicationAvailability>>;
	markInstructionApplied: (record: {
		organizationId: string;
		instructionId: string;
		appliedAmount: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<PaymentApplicationInstruction>>;
	markInstructionRejected: (record: {
		organizationId: string;
		instructionId: string;
		rejectionCode: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
	}) => Promise<Result<PaymentApplicationInstruction>>;
}
