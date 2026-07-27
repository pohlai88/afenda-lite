import { z } from "zod";

export const MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH = 64 as const;

const NORMALIZED_CODE_PATTERN = /^[A-Z0-9._-]+$/;

export const normalizedCodeSchema = z
	.string()
	.min(1, "Normalized code must not be empty")
	.max(
		MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH,
		`Normalized code must not exceed ${MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH} characters`,
	)
	.regex(
		NORMALIZED_CODE_PATTERN,
		"Normalized code may contain only A-Z, 0-9, period, underscore, and hyphen",
	)
	.brand<"NormalizedCode">();
export type NormalizedCode = z.infer<typeof normalizedCodeSchema>;

export type NormalizedCodeValue = Readonly<{
	code: string;
	normalizedCode: NormalizedCode;
}>;

export function normalizeCorporateAdministrationCode(
	raw: string,
): NormalizedCodeValue {
	const code = raw.normalize("NFC").trim();
	const normalizedCandidate = code.toUpperCase();

	if (
		code.length === 0 ||
		code.length > MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH ||
		normalizedCandidate.length > MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH
	) {
		throw new RangeError(
			`Corporate Administration code must contain 1-${MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH} characters`,
		);
	}

	const result = normalizedCodeSchema.safeParse(normalizedCandidate);

	if (!result.success) {
		throw new RangeError(
			"Corporate Administration code may contain only letters A-Z, numbers 0-9, periods, underscores, and hyphens",
		);
	}

	return Object.freeze({
		code,
		normalizedCode: result.data,
	});
}
