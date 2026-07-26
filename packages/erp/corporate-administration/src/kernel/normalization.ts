import { z } from "zod";

export const MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH = 64 as const;
const NORMALIZED_CODE_PATTERN = /^[A-Z0-9._-]+$/;

export const normalizedCodeSchema = z
	.string()
	.min(1)
	.max(MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH)
	.regex(NORMALIZED_CODE_PATTERN)
	.brand<"NormalizedCode">();

export type NormalizedCode = z.infer<typeof normalizedCodeSchema>;

export type NormalizedCodeValue = {
	code: string;
	normalizedCode: NormalizedCode;
};

export function normalizeCorporateAdministrationCode(
	raw: string,
): NormalizedCodeValue {
	const code = raw.normalize("NFC").trim();
	if (
		code.length === 0 ||
		code.length > MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH
	) {
		throw new RangeError(
			"Corporate Administration code length must be between 1 and 64",
		);
	}
	return {
		code,
		normalizedCode: normalizedCodeSchema.parse(code.toUpperCase()),
	};
}
