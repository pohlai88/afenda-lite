import {
	PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE,
	PAYMENTS_PERMISSION_AVAILABILITY_READ,
} from "../../kernel/execution/permissions";
import { definePaymentsOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "application-instructions" as const;

export const PAYMENTS_INSTRUCTION_COMMANDS = definePaymentsOperationRegistry({
	addPaymentApplicationInstruction: {
		id: "payments.application_instruction.add",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE,
		publicName: "addPaymentApplicationInstruction",
	},
	markApplicationInstructionApplied: {
		id: "payments.application_instruction.mark_applied",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE,
		publicName: "markApplicationInstructionApplied",
	},
	markApplicationInstructionRejected: {
		id: "payments.application_instruction.mark_rejected",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE,
		publicName: "markApplicationInstructionRejected",
	},
});

export const PAYMENTS_INSTRUCTION_QUERIES = definePaymentsOperationRegistry({
	getPaymentApplicationAvailability: {
		id: "payments.availability.get",
		kind: "query",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_AVAILABILITY_READ,
		publicName: "getPaymentApplicationAvailability",
	},
});
