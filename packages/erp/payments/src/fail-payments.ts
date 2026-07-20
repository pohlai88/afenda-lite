import { fail, type ResultFailure } from "@afenda/errors/result";

import { type PaymentsErrorCode, paymentsErrorDetails } from "./error-codes";

/** Domain failure with platform Result code + `details.paymentsCode`. */
export function failPayments(
	code: Parameters<typeof fail>[0],
	message: string,
	paymentsCode: PaymentsErrorCode,
): ResultFailure {
	return fail(code, message, paymentsErrorDetails(paymentsCode));
}
